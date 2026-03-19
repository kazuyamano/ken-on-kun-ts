"use client";

import { useEffect, useState } from "react";
import { initLiff } from "@/lib/liff";

export default function LinkLinePage() {
  const [status, setStatus] = useState<
    "loading" | "linking" | "done" | "error"
  >("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function link() {
      try {
        const liff = await initLiff();

        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href });
          return;
        }

        const accessToken = liff.getAccessToken();
        if (!accessToken) {
          liff.logout();
          liff.login({ redirectUri: window.location.href });
          return;
        }

        setStatus("linking");

        const res = await fetch("/api/link-line", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken }),
        });

        const data = await res.json();

        if (!res.ok) {
          setMessage(data.error || "連携に失敗しました");
          setStatus("error");
          return;
        }

        setMessage(data.message);
        setStatus("done");
      } catch (e) {
        console.error("Link LINE error:", e);
        setMessage("連携処理中にエラーが発生しました");
        setStatus("error");
      }
    }

    link();
  }, []);

  return (
    <>
      <div id="top-container">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img id="top-img" src="/ken-on-top.png" alt="毎日検温くんZ" />
      </div>

      <div className="module-container" style={{ padding: "40px 20px" }}>
        {status === "loading" || status === "linking" ? (
          <div style={{ textAlign: "center" }}>
            <div className="spinner" />
            <p
              style={{ fontSize: "16px", color: "gray", marginTop: "16px" }}
            >
              {status === "loading" ? "LINE認証中..." : "連携処理中..."}
            </p>
          </div>
        ) : (
          <div style={{ textAlign: "center" }}>
            <p
              className={
                status === "done" ? "message-success" : "message-error"
              }
            >
              {message}
            </p>
            <div className="submit-area" style={{ marginTop: "20px" }}>
              <a href="/">
                <button type="button" className="module-button">
                  TOPへ戻る
                </button>
              </a>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
