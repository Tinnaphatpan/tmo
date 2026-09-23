// Mirrors backend/src/modules/queue/use-cases/*.ts response shapes (SPEC §2.5).

export type QueueStatus = "WAITING" | "IN_PROGRESS" | "DONE";

export interface SchoolRef {
  id: string;
  name: string;
  code: string | null;
}

export interface PublicQueueItem {
  id: string;
  problemNumber: number;
  status: QueueStatus;
  position: number;
  scheduledAt: string | null;
  school: SchoolRef;
}

export interface StatusCounts {
  waiting: number;
  inProgress: number;
  done: number;
  total: number;
}

export interface ProblemCounts {
  problemNumber: number;
  total: number;
  done: number;
  inProgress: number;
}

export interface QueueSlotCell {
  id: string;
  problemNumber: number;
  school: SchoolRef;
  status: QueueStatus;
}

export interface QueueSlot {
  startsAt: string;
  cells: QueueSlotCell[];
}

export interface PublicQueueResult {
  items: PublicQueueItem[];
  counts: StatusCounts;
  problemNumbers: number[];
  byProblem: ProblemCounts[];
  slots: QueueSlot[];
  scheduleDate: string | null;
  updatedAt: string;
}

export interface Student {
  id: string;
  studentCode: string;
  seqNo: number;
  name: string;
  schoolId: string;
}

export interface Score {
  id: string;
  studentId: string;
  queueItemId: string;
  value: number;
  judgeId: string;
}

export interface MyQueueItem {
  id: string;
  problemNumber: number;
  status: QueueStatus;
  position: number;
  scheduledAt: string | null;
  claimedByUserId: string | null;
  school: SchoolRef & { students: Student[] };
  scores: Score[];
}

export interface MyQueueResult {
  problemNumbers: number[];
  items: MyQueueItem[];
  currentItemId: string | null;
  scoringLocked: boolean;
  updatedAt: string;
}
