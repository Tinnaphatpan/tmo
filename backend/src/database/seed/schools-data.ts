// The 16 real TMO23 verification centres (SPEC.md §9 backup dump, School table).
// Ids/timestamps from the old Postgres dump are dropped — this schema
// generates fresh UNIQUEIDENTIFIER ids (SPEC §1.3).
export const SEED_SCHOOLS: Array<{ name: string; code: string }> = [
  { name: 'ศูนย์ สอวน. มหาวิทยาลัยเชียงใหม่', code: 'CMU' },
  { name: 'ศูนย์ สอวน. มหาวิทยาลัยขอนแก่น', code: 'KKU' },
  { name: 'ศูนย์ สอวน. มหาวิทยาลัยศิลปากร', code: 'SU' },
  { name: 'ศูนย์ สอวน. โรงเรียนสวนกุหลาบวิทยาลัย', code: 'SA-SWU' },
  { name: 'ศูนย์ สอวน. มหาวิทยาลัยวลัยลักษณ์', code: 'WU' },
  { name: 'ศูนย์ สอวน. โรงเรียนมหิดลวิทยานุสรณ์', code: 'MWIT' },
  { name: 'ศูนย์ สอวน. มหาวิทยาลัยสงขลานครินทร์ (หาดใหญ่)', code: 'PSUHY' },
  { name: 'ศูนย์ สอวน. โรงเรียนยุพราชวิทยาลัย', code: 'YB-KU' },
  { name: 'ศูนย์ สอวน. มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ', code: 'KMUTNB' },
  { name: 'ศูนย์ สอวน. โรงเรียนราชสีมาวิทยาลัย', code: 'RS' },
  { name: 'ศูนย์ สอวน. มหาวิทยาลัยสงขลานครินทร์ (ปัตตานี)', code: 'PSUPN' },
  { name: 'ศูนย์ สอวน. มหาวิทยาลัยนเรศวร', code: 'NU' },
  { name: 'ศูนย์ สอวน. โรงเรียนเตรียมทหาร', code: 'AFAPS' },
  { name: 'ศูนย์ สอวน. มหาวิทยาลัยบูรพา', code: 'BUU' },
  { name: 'ศูนย์ สอวน. มหาวิทยาลัยอุบลราชธานี', code: 'UBU' },
  { name: 'ศูนย์ สอวน. โรงเรียนสวนกุหลาบวิทยาลัย (มจธ.)', code: 'SK-KMUTT' },
];
