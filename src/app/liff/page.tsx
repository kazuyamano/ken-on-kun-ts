"use client";

import { useEffect, useState } from "react";
import { initLiff } from "@/lib/liff";
import { createClient } from "@/lib/supabase/client";
import { addEntry } from "@/lib/actions";
import type { Liff } from "@line/liff";
import type { Entry } from "@/db/schema";

export default function LiffPage() {
  const [status, setStatus] = useState<"loading" | "ready" | "done" | "error">(
    "loading"
  );
  const [errorDetail, setErrorDetail] = useState("");
  const [profile, setProfile] = useState<{ displayName: string } | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [temp, setTemp] = useState("");
  const [extraOpen, setExtraOpen] = useState(false);
  const [liffClient, setLiffClient] = useState<Liff | null>(null);
  const [historyEntries, setHistoryEntries] = useState<Entry[]>([]);

  const tempNum = parseFloat(temp);
  const isValid = !isNaN(tempNum) && tempNum >= 35 && tempNum < 41;

  useEffect(() => {
    async function setup() {
      try {
        const liff = await initLiff();
        setLiffClient(liff);

        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        const accessToken = liff.getAccessToken();
        if (!accessToken) {
          liff.logout();
          liff.login();
          return;
        }

        const res = await fetch("/api/liff/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.error("LIFF auth API error:", res.status, errData);
          if (res.status === 401) {
            liff.logout();
            liff.login();
            return;
          }
          setErrorDetail(`API ${res.status}: ${errData.error || "unknown"}`);
          setStatus("error");
          return;
        }

        const data = await res.json();

        const supabase = createClient();
        await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });

        setProfile({ displayName: data.display_name });
        setStatus("ready");
      } catch (e) {
        console.error("LIFF setup error:", e);
        setErrorDetail(e instanceof Error ? e.message : String(e));
        setStatus("error");
      }
    }

    setup();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isValid) return;
    setPending(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await addEntry(formData);
    setPending(false);

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      // 履歴を取得して完了画面へ
      const entriesRes = await fetch("/api/liff/entries");
      if (entriesRes.ok) {
        setHistoryEntries(await entriesRes.json());
      }
      setStatus("done");
    }
  }

  function backToForm() {
    setTemp("");
    setMessage(null);
    setExtraOpen(false);
    setStatus("ready");
  }

  if (status === "loading") {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <div className="spinner" />
        <p style={{ fontSize: "16px", color: "gray", marginTop: "16px" }}>読み込み中...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <p className="message-error">
          認証に失敗しました。LINEからもう一度開いてください。
        </p>
        {errorDetail && (
          <p style={{ fontSize: "12px", color: "gray", marginTop: "8px" }}>
            {errorDetail}
          </p>
        )}
      </div>
    );
  }

  // 送信完了 → 履歴表示
  if (status === "done") {
    return (
      <>
        <div
          style={{ width: "90%", maxWidth: "540px", margin: "0 auto" }}
        >
          <h1 style={{ margin: "25px auto", textAlign: "center", fontSize: "24px", fontWeight: "bold" }}>
            {profile?.displayName ?? ""}さんの履歴
          </h1>
        </div>
        <div className="module-container">
          <div className="logs-area">
            <div className="logs-box">
              <table className="logs-table">
                <thead>
                  <tr>
                    <th>記録日時</th>
                    <th>体温</th>
                  </tr>
                </thead>
                <tbody>
                  {historyEntries.map((entry) => (
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
            <form action="/download" method="get" target="_blank">
              <div className="submit-area">
                <button
                  type="submit"
                  className="module-button"
                  id="download-btn"
                >
                  CSVでダウンロード
                </button>
              </div>
            </form>
          </div>
        </div>

        {liffClient && liffClient.isInClient() && (
          <div style={{ width: "90%", maxWidth: "540px", margin: "0 auto" }}>
            <div className="submit-area">
              <button
                type="button"
                className="module-button"
                onClick={() => liffClient.closeWindow()}
              >
                閉じる
              </button>
            </div>
          </div>
        )}

        <div style={{ width: "90%", maxWidth: "540px", margin: "0 auto" }}>
          <div className="submit-area">
            <button
              type="button"
              className="module-button"
              onClick={backToForm}
            >
              TOPへ戻る
            </button>
          </div>
        </div>
      </>
    );
  }

  // 入力フォーム
  return (
    <>
      <div id="top-container">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img id="top-img" src="/ken-on-top.png" alt="毎日検温くんZ" />
      </div>

      <div className="module-container">
        <form onSubmit={handleSubmit} autoComplete="on">
          <div className="qa-area">
            <div className="temp-box">
              <div className="qa-set">
                <div className="q-line">
                  <p>体温は？</p>
                </div>
                <div className="a-form">
                  <input
                    type="text"
                    name="temp"
                    maxLength={4}
                    value={temp}
                    onChange={(e) => setTemp(e.target.value)}
                    className={isValid ? "valid" : ""}
                  />
                </div>
              </div>
              <div className="alert-line">
                <p>{isValid ? "" : "※ 35.0以上41.0未満"}</p>
              </div>
            </div>
          </div>

          <div className="extra-area">
            <div>
              <button
                type="button"
                id="extra-btn"
                className={isValid ? "active" : ""}
                disabled={!isValid}
                onClick={() => setExtraOpen(!extraOpen)}
              >
                {extraOpen ? "－" : "＋"}
              </button>
            </div>
            {extraOpen && (
              <div id="extra-box">
                <div className="checkbox-set">
                  <div className="extra-checkbox">
                    <input type="checkbox" name="breathlessness" /> 息つらい
                  </div>
                  <div className="extra-checkbox">
                    <input type="checkbox" name="dullness" /> 体だるい
                  </div>
                </div>
                <div className="extra-comment">
                  <input type="text" name="comment" placeholder="その他メモ" />
                </div>
              </div>
            )}
          </div>

          {message && (
            <p
              className={
                message.type === "success"
                  ? "message-success"
                  : "message-error"
              }
            >
              {message.text}
            </p>
          )}

          <div className="submit-area">
            <button
              type="submit"
              className="module-button"
              disabled={!isValid || pending}
            >
              {pending ? "記録中..." : "これで記録"}
            </button>
          </div>
        </form>
      </div>

      <div style={{ width: "90%", maxWidth: "540px", margin: "0 auto" }}>
        <div className="submit-area">
          <button
            type="button"
            className="module-button"
            onClick={async () => {
              const res = await fetch("/api/liff/entries");
              if (res.ok) setHistoryEntries(await res.json());
              setStatus("done");
            }}
          >
            履歴を見る
          </button>
        </div>
      </div>

      {liffClient && liffClient.isInClient() && (
        <div style={{ width: "90%", maxWidth: "540px", margin: "0 auto" }}>
          <div className="submit-area">
            <button
              type="button"
              className="module-button"
              onClick={() => liffClient.closeWindow()}
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  );
}
