import type { Entry } from "@/db/schema";

export function HistoryTable({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) {
    return (
      <p style={{ textAlign: "center", color: "gray", fontSize: "18px" }}>
        まだ記録がありません。
      </p>
    );
  }

  return (
    <div className="logs-box">
      <table className="logs-table">
        <thead>
          <tr>
            <th>記録日時</th>
            <th>体温</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td>
                {entry.createdAt
                  ? new Date(entry.createdAt).toLocaleString("ja-JP", {
                      timeZone: "Asia/Tokyo",
                      weekday: "short",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : ""}
              </td>
              <td>{entry.temp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
