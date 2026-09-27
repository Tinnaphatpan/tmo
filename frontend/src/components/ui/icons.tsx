import {
  Activity,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FilePenLine,
  GraduationCap,
  History,
  Inbox,
  LayoutDashboard,
  ListOrdered,
  Lock,
  LockOpen,
  School,
  ShieldCheck,
  Trophy,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

/** Sidebar icons by name (server layouts can't pass component functions to the client sidebar). */
export const NAV_ICONS = {
  overview: LayoutDashboard,
  schools: School,
  users: UserCog,
  students: GraduationCap,
  queue: ListOrdered,
  scores: ClipboardList,
  history: History,
  review: ClipboardCheck,
  scoreboard: Trophy,
  edit: FilePenLine,
  approve: BadgeCheck,
} satisfies Record<string, LucideIcon>;

export type NavIconName = keyof typeof NAV_ICONS;

export {
  Activity,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FilePenLine,
  GraduationCap,
  History,
  Inbox,
  LayoutDashboard,
  ListOrdered,
  Lock,
  LockOpen,
  School,
  ShieldCheck,
  Trophy,
  UserCog,
  Users,
};
export type { LucideIcon };
