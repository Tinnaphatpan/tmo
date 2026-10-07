const http = require('http');

const schools = [
  { id: 's1', name: 'โรงเรียนเตรียมอุดมศึกษา', code: 'TU' },
  { id: 's2', name: 'โรงเรียนมหิดลวิทยานุสรณ์', code: 'MWIT' },
  { id: 's3', name: 'โรงเรียนกำเนิดวิทย์', code: 'KVIS' },
  { id: 's4', name: 'ศูนย์ สอวน. มหาวิทยาลัยเชียงใหม่', code: 'CMU' },
  { id: 's5', name: 'ศูนย์ สอวน. มหาวิทยาลัยขอนแก่น', code: 'KKU' },
  { id: 's6', name: 'ศูนย์ สอวน. มหาวิทยาลัยสงขลานครินทร์', code: 'PSU' },
  { id: 's7', name: 'ศูนย์ สอวน. มหาวิทยาลัยนเรศวร', code: 'NU' },
  { id: 's8', name: 'ศูนย์ สอวน. มหาวิทยาลัยบูรพา', code: 'BUU' },
  { id: 's9', name: 'ศูนย์ สอวน. จุฬาลงกรณ์มหาวิทยาลัย', code: 'CU' },
  { id: 's10', name: 'ศูนย์ สอวน. มหาวิทยาลัยเกษตรศาสตร์', code: 'KU' },
  { id: 's11', name: 'ศูนย์ สอวน. มหาวิทยาลัยธรรมศาสตร์', code: 'TU-C' },
  { id: 's12', name: 'ศูนย์ สอวน. มหาวิทยาลัยศิลปากร', code: 'SU' },
  { id: 's13', name: 'ศูนย์ สอวน. มหาวิทยาลัยอุบลราชธานี', code: 'UBU' },
  { id: 's14', name: 'ศูนย์ สอวน. มหาวิทยาลัยทักษิณ', code: 'TSU' },
  { id: 's15', name: 'โรงเรียนสวนกุหลาบวิทยาลัย', code: 'SK' },
  { id: 's16', name: 'โรงเรียนบดินทรเดชา', code: 'BD' },
];

const studentsS1 = [
  { id: 'std-1', seqNo: 1, name: 'นายกิตติคุณ ศิริโชคสถิต', studentCode: 'TU-01' },
  { id: 'std-2', seqNo: 2, name: 'นางสาวณิชาภา พิริยเวทย์', studentCode: 'TU-02' },
  { id: 'std-3', seqNo: 3, name: 'นายธนกฤต วชิรปัญญา', studentCode: 'TU-03' },
  { id: 'std-4', seqNo: 4, name: 'นายพงศธร มงคลพานิช', studentCode: 'TU-04' },
  { id: 'std-5', seqNo: 5, name: 'นางสาววรรณิดา อัครศิลป์', studentCode: 'TU-05' },
  { id: 'std-6', seqNo: 6, name: 'นายสิรภพ วิเศษรัตน์', studentCode: 'TU-06' },
];

const startTime = new Date('2026-10-03T06:30:00.000Z');

// Generate slots
const slots = [];
const items = [];
for (let slotIdx = 0; slotIdx < 16; slotIdx++) {
  const slotDate = new Date(startTime.getTime() + slotIdx * 15 * 60 * 1000);
  const cells = [];
  for (let p = 1; p <= 5; p++) {
    const schoolIdx = (slotIdx + (p - 1) * 3) % 16;
    const school = schools[schoolIdx];
    let status = 'WAITING';
    if (slotIdx < 4) status = 'DONE';
    else if (slotIdx === 4 && p <= 3) status = 'IN_PROGRESS';

    const cellId = `q-${slotIdx}-${p}`;
    cells.push({
      id: cellId,
      problemNumber: p,
      school: { id: school.id, name: school.name, code: school.code },
      status: status,
    });

    items.push({
      id: cellId,
      problemNumber: p,
      status: status,
      position: slotIdx * 5 + p,
      scheduledAt: slotDate.toISOString(),
      school: { id: school.id, name: school.name, code: school.code, studentCount: 6 },
    });
  }
  slots.push({
    startsAt: slotDate.toISOString(),
    cells: cells,
  });
}

const queueData = {
  items: items,
  counts: { waiting: 57, inProgress: 3, done: 20 },
  problemNumbers: [1, 2, 3, 4, 5],
  byProblem: [
    { problemNumber: 1, waiting: 11, inProgress: 1, done: 4 },
    { problemNumber: 2, waiting: 11, inProgress: 1, done: 4 },
    { problemNumber: 3, waiting: 11, inProgress: 1, done: 4 },
    { problemNumber: 4, waiting: 12, inProgress: 0, done: 4 },
    { problemNumber: 5, waiting: 12, inProgress: 0, done: 4 },
  ],
  slots: slots,
  scheduleDate: startTime.toISOString(),
  updatedAt: new Date().toISOString(),
};

const myQueueData = {
  currentItemId: 'q-curr-1',
  awaitingApproval: false,
  scoringLocked: false,
  items: [
    {
      id: 'q-curr-1',
      problemNumber: 1,
      status: 'IN_PROGRESS',
      position: 1,
      scheduledAt: startTime.toISOString(),
      school: { id: 's1', name: 'โรงเรียนเตรียมอุดมศึกษา', code: 'TU', students: studentsS1 },
      scores: [
        { id: 'sc-1', studentId: 'std-1', value: 8.5 },
        { id: 'sc-2', studentId: 'std-2', value: 7.0 },
      ],
      approvalStatus: 'NOT_SUBMITTED',
    },
    {
      id: 'q-wait-2',
      problemNumber: 1,
      status: 'WAITING',
      position: 2,
      scheduledAt: new Date(startTime.getTime() + 15 * 60000).toISOString(),
      school: { id: 's2', name: 'โรงเรียนมหิดลวิทยานุสรณ์', code: 'MWIT', students: [] },
      scores: [],
      approvalStatus: 'NOT_SUBMITTED',
    },
    {
      id: 'q-wait-3',
      problemNumber: 1,
      status: 'WAITING',
      position: 3,
      scheduledAt: new Date(startTime.getTime() + 30 * 60000).toISOString(),
      school: { id: 's3', name: 'โรงเรียนกำเนิดวิทย์', code: 'KVIS', students: [] },
      scores: [],
      approvalStatus: 'NOT_SUBMITTED',
    },
    {
      id: 'q-done-1',
      problemNumber: 1,
      status: 'DONE',
      position: 0,
      scheduledAt: startTime.toISOString(),
      school: { id: 's4', name: 'ศูนย์ สอวน. มหาวิทยาลัยเชียงใหม่', code: 'CMU', students: studentsS1 },
      scores: [
        { id: 'sc-d1', studentId: 'std-1', value: 9.0 },
        { id: 'sc-d2', studentId: 'std-2', value: 8.0 },
        { id: 'sc-d3', studentId: 'std-3', value: 6.5 },
        { id: 'sc-d4', studentId: 'std-4', value: 10.0 },
        { id: 'sc-d5', studentId: 'std-5', value: 7.5 },
        { id: 'sc-d6', studentId: 'std-6', value: 8.5 },
      ],
      approvalStatus: 'APPROVED',
    },
  ],
};

const pendingApprovals = [
  {
    id: 'appr-1',
    problemNumber: 1,
    schoolName: 'โรงเรียนเตรียมอุดมศึกษา',
    scores: [
      { scoreId: 'sc-1', studentCode: 'TU-01', studentName: 'นายกิตติคุณ ศิริโชคสถิต', value: 8.5 },
      { scoreId: 'sc-2', studentCode: 'TU-02', studentName: 'นางสาวณิชาภา พิริยเวทย์', value: 7.0 },
      { scoreId: 'sc-3', studentCode: 'TU-03', studentName: 'นายธนกฤต วชิรปัญญา', value: 9.5 },
      { scoreId: 'sc-4', studentCode: 'TU-04', studentName: 'นายพงศธร มงคลพานิช', value: 6.0 },
      { scoreId: 'sc-5', studentCode: 'TU-05', studentName: 'นางสาววรรณิดา อัครศิลป์', value: 8.0 },
      { scoreId: 'sc-6', studentCode: 'TU-06', studentName: 'นายสิรภพ วิเศษรัตน์', value: 10.0 },
    ],
  },
  {
    id: 'appr-2',
    problemNumber: 2,
    schoolName: 'โรงเรียนเตรียมอุดมศึกษา',
    scores: [
      { scoreId: 'sc-21', studentCode: 'TU-01', studentName: 'นายกิตติคุณ ศิริโชคสถิต', value: 7.5 },
      { scoreId: 'sc-22', studentCode: 'TU-02', studentName: 'นางสาวณิชาภา พิริยเวทย์', value: 8.0 },
      { scoreId: 'sc-23', studentCode: 'TU-03', studentName: 'นายธนกฤต วชิรปัญญา', value: 6.5 },
      { scoreId: 'sc-24', studentCode: 'TU-04', studentName: 'นายพงศธร มงคลพานิช', value: 8.5 },
      { scoreId: 'sc-25', studentCode: 'TU-05', studentName: 'นางสาววรรณิดา อัครศิลป์', value: 9.0 },
      { scoreId: 'sc-26', studentCode: 'TU-06', studentName: 'นายสิรภพ วิเศษรัตน์', value: 7.0 },
    ],
  },
];

const permissionMatrix = [
  {
    id: 'u-1',
    username: 'committee1',
    displayName: 'ศ.ดร.สมชาย ปัญญาดี (กรรมการข้อ 1)',
    role: 'COMMITTEE',
    schoolId: null,
    hasSignature: true,
    assignments: [{ problemNumber: 1, schoolId: null }],
  },
  {
    id: 'u-2',
    username: 'committee2',
    displayName: 'รศ.ดร.กมลทิพย์ สัจจา (กรรมการข้อ 2)',
    role: 'COMMITTEE',
    schoolId: null,
    hasSignature: true,
    assignments: [{ problemNumber: 2, schoolId: null }],
  },
  {
    id: 'u-3',
    username: 'staff_tu',
    displayName: 'นายวิชัย สุขเกษม (เจ้าหน้าที่ศูนย์เตรียมอุดม)',
    role: 'STAFF',
    schoolId: 's1',
    hasSignature: true,
    assignments: [{ problemNumber: 1, schoolId: 's1' }, { problemNumber: 2, schoolId: 's1' }],
  },
  {
    id: 'u-4',
    username: 'teamleader_tu',
    displayName: 'ผศ.ดร.ประเสริฐ ธีรภาพ (หัวหน้าทีมโรงเรียนเตรียมอุดมศึกษา)',
    role: 'TEAM_LEADER',
    schoolId: 's1',
    hasSignature: true,
    assignments: [],
  },
];

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  const url = req.url;

  if (url === '/queue' || url.startsWith('/queue?')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(queueData));
  }

  if (url === '/queue/mine') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(myQueueData));
  }

  if (url === '/team-leader/approvals') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(pendingApprovals));
  }

  if (url === '/team-leader/report') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      school: schools[0],
      problems: [1, 2, 3, 4, 5],
      students: studentsS1.map(s => ({
        ...s,
        scores: { 1: 8.5, 2: 7.5, 3: null, 4: null, 5: null },
        total: 16.0,
      })),
    }));
  }

  if (url === '/admin/permissions') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(permissionMatrix));
  }

  if (url === '/admin/schools') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(schools));
  }

  if (url === '/queue/stream' || url.startsWith('/realtime')) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    res.write('event: ready\ndata: {}\n\n');
    return;
  }

  if (url === '/auth/login' && req.method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3ItMSIsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQURNSU4ifQ.dummy_signature',
      user: {
        id: 'usr-admin',
        username: 'admin',
        displayName: 'ผู้ดูแลระบบสูงสุด (Super Admin)',
        role: 'ADMIN',
      },
    }));
  }

  // Handle /auth/me dynamically by cookie or header
  if (url === '/auth/me') {
    const auth = req.headers['authorization'] || '';
    if (auth.includes('TEAM_LEADER') || req.headers['cookie']?.includes('TEAM_LEADER')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        id: 'u-4',
        username: 'teamleader_tu',
        displayName: 'ผศ.ดร.ประเสริฐ ธีรภาพ (หัวหน้าทีมศูนย์เตรียมอุดม)',
        role: 'TEAM_LEADER',
        schoolId: 's1',
      }));
    }

    if (auth.includes('ADMIN') || req.headers['cookie']?.includes('ADMIN')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        id: 'usr-admin',
        username: 'admin',
        displayName: 'ผู้ดูแลระบบ (Administrator)',
        role: 'ADMIN',
        schoolId: null,
      }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      id: 'usr-1',
      username: 'committee1',
      displayName: 'ดร.สมชาย ใจดี (กรรมการข้อ 1)',
      role: 'COMMITTEE',
      schoolId: null,
    }));
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true }));
});

server.listen(4000, () => {
  console.log('Mock TMO Backend listening on port 4000 with Approvals & Permissions');
});
