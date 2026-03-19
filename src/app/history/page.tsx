import { getEntries } from "@/lib/actions";
import { Header } from "@/components/header";
import { HistoryTable } from "@/components/history-table";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const entries = await getEntries();

  return (
    <>
      <Header />
      <div style={{ width: "90%", maxWidth: "800px", margin: "0 auto" }}>
        <h1 style={{ margin: "25px auto", textAlign: "center", fontSize: "24px", fontWeight: "bold" }}>
          {user?.email ?? ""}さんの履歴
        </h1>
      </div>
      <div className="module-container">
        <div className="logs-area">
          <HistoryTable entries={entries} />
          <form action="/download" method="get" target="_blank">
            <div className="submit-area">
              <button type="submit" className="module-button" id="download-btn">
                CSVでダウンロード
              </button>
            </div>
          </form>
        </div>
      </div>
      <div style={{ width: "90%", maxWidth: "800px", margin: "0 auto" }}>
        <div className="submit-area">
          <Link href="/">
            <button type="button" className="module-button">
              TOPへ戻る
            </button>
          </Link>
        </div>
      </div>
    </>
  );
}
