import type { MentorReport } from "@/lib/use-mentor-report";

export function MentorScoreTable({ report }: { report: MentorReport }) {
  return (
    <table className="w-full min-w-[520px] border-collapse text-sm">
      <thead>
        <tr className="bg-surface-sunken text-ink-700">
          <th className="border border-line px-3 py-2 text-left">รหัส</th>
          <th className="border border-line px-3 py-2 text-left">ชื่อ</th>
          {[1, 2, 3, 4, 5].map((p) => (
            <th key={p} className="border border-line px-3 py-2 text-center">
              ข้อ {p}
            </th>
          ))}
          <th className="border border-line px-3 py-2 text-center">รวม</th>
        </tr>
      </thead>
      <tbody>
        {report.rows.map((row) => (
          <tr key={row.studentCode}>
            <td className="border border-line px-3 py-2 text-ink-900">{row.studentCode}</td>
            <td className="border border-line px-3 py-2 text-ink-900">{row.name}</td>
            {row.scores.map((score, i) => (
              <td key={i} className="border border-line px-3 py-2 text-center text-ink-700">
                {score === null ? "-" : score.toFixed(2)}
              </td>
            ))}
            <td className="border border-line px-3 py-2 text-center font-semibold text-ink-900">
              {row.total.toFixed(2)}
            </td>
          </tr>
        ))}
        <tr className="font-bold">
          <td className="border border-line px-3 py-2" colSpan={2}>
            รวมทั้งโรงเรียน
          </td>
          <td className="border border-line px-3 py-2" colSpan={5} />
          <td className="border border-line px-3 py-2 text-center">
            {report.grandTotal.toFixed(2)}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
