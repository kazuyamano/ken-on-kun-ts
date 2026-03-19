"use client";

import { useState, useRef } from "react";
import { addEntry, getEntries } from "@/lib/actions";
import type { Entry } from "@/db/schema";

export function EntryForm() {
  const [view, setView] = useState<"form" | "loading" | "history">("form");
  const [temp, setTemp] = useState("");
  const [extraOpen, setExtraOpen] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<Entry[]>([]);
  const [userName, setUserName] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const tempNum = parseFloat(temp);
  const isValid = !isNaN(tempNum) && tempNum >= 35 && tempNum < 41;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || !formRef.current) return;
    setPending(true);
    setMessage(null);

    const formData = new FormData(formRef.current);
    const result = await addEntry(formData);

    if (result.error) {
      setPending(false);
      setMessage({ type: "error", text: result.error });
    } else {
      setTemp("");
      formRef.current.reset();
      setPending(false);
      setView("loading");
      const data = await getEntries();
      setHistoryEntries(data);
      if (data.length > 0 && data[0].userName) {
        setUserName(data[0].userName);
      }
      setView("history");
    }
  }

  async function goToHistory() {
    setView("loading");
    const data = await getEntries();
    setHistoryEntries(data);
    if (data.length > 0 && data[0].userName) {
      setUserName(data[0].userName);
    }
    setView("history");
  }

  function backToForm() {
    setTemp("");
    setMessage(null);
    setExtraOpen(false);
    setView("form");
  }

  if (view === "loading") {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <div className="spinner" />
        <p style={{ fontSize: "16px", color: "gray", marginTop: "16px" }}>
          読み込み中...
        </p>
      </div>
    );
  }

  if (view === "history") {
    return (
      <>
        <div style={{ width: "90%", maxWidth: "540px", margin: "0 auto" }}>
          <h1
            style={{
              margin: "25px auto",
              textAlign: "center",
              fontSize: "24px",
              fontWeight: "bold",
            }}
          >
            {userName || "あなた"}さんの履歴
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

  return (
    <>
      <div className="module-container">
        <form ref={formRef} onSubmit={handleSubmit} autoComplete="on">
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
                  <input
                    type="text"
                    name="comment"
                    placeholder="その他メモ"
                  />
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
            onClick={goToHistory}
          >
            履歴を見る
          </button>
        </div>
      </div>
    </>
  );
}
