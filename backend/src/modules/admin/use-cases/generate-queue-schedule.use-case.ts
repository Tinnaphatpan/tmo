import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { TransactionRunner } from '../../../database/transaction-runner';
import { AuditLogRepository } from '../../audit-log/audit-log.repository';
import { QueueRepository } from '../../queue/queue.repository';
import { generateSchedule } from '../../queue/rotation';
import { sortSchoolsForSchedule } from '../../queue/schedule-order';
import { SchoolsRepository } from '../../schools/schools.repository';

const PROBLEM_COUNT = 5;
const SLOT_MINUTES = 15;
const FIRST_SLOT = '13:30';
/** Thailand has no DST, so a fixed offset is exact. */
const BANGKOK_OFFSET = '+07:00';

export interface GenerateQueueScheduleInput {
  /** YYYY-MM-DD (Bangkok calendar day); defaults to today in Bangkok. */
  date?: string;
  /** HH:mm Bangkok time of the first slot; defaults to 13:30. */
  startTime?: string;
  /** Minutes per slot; defaults to 15. */
  slotMinutes?: number;
  actorId: string;
}

export interface GenerateQueueScheduleResult {
  created: number;
  updated: number;
  total: number;
  firstSlotAt: string;
}

/** Today's date (YYYY-MM-DD) on the Bangkok calendar. */
function todayInBangkok(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
}

/**
 * Builds the full rotation queue (SPEC §2.4): one QueueItem per (school,
 * problem) with its 15-minute slot starting 13:30 Bangkok time. Safe to run
 * on a queue that was created without times (e.g. migrated data) and safe to
 * re-run: missing items are created, existing ones are re-timed/re-ordered,
 * all in one transaction. It refuses once any examining has begun, because
 * re-timing claimed/finished work would falsify the record.
 */
@Injectable()
export class GenerateQueueScheduleUseCase {
  constructor(
    private readonly queueRepository: QueueRepository,
    private readonly schoolsRepository: SchoolsRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(input: GenerateQueueScheduleInput): Promise<GenerateQueueScheduleResult> {
    const date = input.date ?? todayInBangkok();
    const startTime = input.startTime ?? FIRST_SLOT;
    const slotMinutes = input.slotMinutes ?? SLOT_MINUTES;
    const firstSlotAt = new Date(`${date}T${startTime}:00${BANGKOK_OFFSET}`);
    if (Number.isNaN(firstSlotAt.getTime())) {
      throw new BadRequestException('รูปแบบวันที่หรือเวลาไม่ถูกต้อง (วันที่ YYYY-MM-DD, เวลา HH:mm)');
    }

    const schools = sortSchoolsForSchedule(await this.schoolsRepository.findAll());
    if (schools.length < PROBLEM_COUNT) {
      throw new BadRequestException(
        `ต้องมีศูนย์สอบอย่างน้อย ${PROBLEM_COUNT} ศูนย์จึงจะจัดตารางหมุนเวียนได้ (ตอนนี้มี ${schools.length})`,
      );
    }

    const existing = await this.queueRepository.findAllWithSchool();
    if (existing.some((i) => i.status !== 'WAITING')) {
      throw new ConflictException(
        'มีรายการที่ถูกรับตรวจหรือตรวจเสร็จแล้ว จึงสร้างตารางใหม่ไม่ได้ (จะทำให้ประวัติคลาดเคลื่อน)',
      );
    }
    const byKey = new Map(existing.map((i) => [`${i.schoolId}:${i.problemNumber}`, i.id]));

    const cells = generateSchedule(
      schools.map((s) => ({ id: s.id, code: s.code })),
      { problemCount: PROBLEM_COUNT, slotMinutes, firstSlotAt },
    );

    let created = 0;
    let updated = 0;
    await this.transactionRunner.run(async (tx) => {
      for (const cell of cells) {
        const existingId = byKey.get(`${cell.schoolId}:${cell.problemNumber}`);
        if (existingId) {
          await this.queueRepository.updateSchedule(existingId, cell.slot, cell.scheduledAt, tx);
          updated++;
        } else {
          await this.queueRepository.create(
            {
              schoolId: cell.schoolId,
              problemNumber: cell.problemNumber,
              position: cell.slot,
              scheduledAt: cell.scheduledAt,
            },
            tx,
          );
          created++;
        }
      }
      await this.auditLogRepository.create(
        {
          action: 'QUEUE_SCHEDULE_GENERATED',
          entityType: 'Queue',
          entityId: 'schedule',
          changes: [
            { fieldName: 'existingItems', oldValue: String(existing.length), newValue: null },
            { fieldName: 'date', oldValue: null, newValue: date },
            { fieldName: 'startTime', oldValue: null, newValue: startTime },
            { fieldName: 'slotMinutes', oldValue: null, newValue: String(slotMinutes) },
            { fieldName: 'created', oldValue: null, newValue: String(created) },
            { fieldName: 'updated', oldValue: null, newValue: String(updated) },
            { fieldName: 'total', oldValue: null, newValue: String(cells.length) },
          ],
          performedBy: input.actorId,
        },
        tx,
      );
    });

    return { created, updated, total: cells.length, firstSlotAt: firstSlotAt.toISOString() };
  }
}
