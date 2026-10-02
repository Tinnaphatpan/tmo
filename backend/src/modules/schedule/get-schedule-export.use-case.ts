import { Injectable } from '@nestjs/common';
import { SchoolsRepository } from '../schools/schools.repository';
import { generateSchedule } from '../queue/rotation';
import { toCsv } from '../../common/csv';

const PROBLEM_COUNT = 5;
const SLOT_MINUTES = 15;

function formatTime(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

@Injectable()
export class GetScheduleExportUseCase {
  constructor(private readonly schoolsRepository: SchoolsRepository) {}

  async execute(): Promise<string> {
    const schools = await this.schoolsRepository.findAll();
    const cells = generateSchedule(
      schools.map((s) => ({ id: s.id, code: s.code })),
      { problemCount: PROBLEM_COUNT, slotMinutes: SLOT_MINUTES },
    );

    const startBySlot = new Map<number, Date>();
    const codeBySlotAndProblem = new Map<string, string>();
    for (const cell of cells) {
      startBySlot.set(cell.slot, cell.scheduledAt);
      codeBySlotAndProblem.set(`${cell.slot}:${cell.problemNumber}`, cell.schoolCode ?? '');
    }

    const header = [
      'ช่วงเวลา',
      ...Array.from({ length: PROBLEM_COUNT }, (_, i) => `ข้อ ${i + 1}`),
    ];
    const rows = [...startBySlot.keys()]
      .sort((a, b) => a - b)
      .map((slot) => {
        const start = startBySlot.get(slot)!;
        const end = new Date(start.getTime() + SLOT_MINUTES * 60_000);
        const label = `${formatTime(start)}-${formatTime(end)}`;
        return [
          label,
          ...Array.from(
            { length: PROBLEM_COUNT },
            (_, i) => codeBySlotAndProblem.get(`${slot}:${i + 1}`) ?? '',
          ),
        ];
      });

    return toCsv([header, ...rows]);
  }
}
