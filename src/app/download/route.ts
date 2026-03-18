import { getEntries } from "@/lib/actions";

export async function GET() {
  const entries = await getEntries();

  const header = "管理No,記録日時,体温,息つらい,体だるい,メモ\n";
  const rows = entries
    .map((e) => {
      const date = e.createdAt
        ? new Date(e.createdAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
        : "";
      return [
        e.id,
        date,
        e.temp,
        e.breathlessness ? "あり" : "なし",
        e.dullness ? "あり" : "なし",
        `"${(e.comment ?? "").replace(/"/g, '""')}"`,
      ].join(",");
    })
    .join("\n");

  const csv = "\uFEFF" + header + rows;
  const now = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=ken-on-log_${now}.csv`,
    },
  });
}
