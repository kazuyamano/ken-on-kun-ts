"use client";

import { useEffect, useState } from "react";
import { initLiff } from "@/lib/liff";
import { createClient } from "@/lib/supabase/client";
import { addEntry } from "@/lib/actions";
import type { Liff } from "@line/liff";

export default function LiffPage() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [profile, setProfile] = useState<{ displayName: string } | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [temp, setTemp] = useState("");
  const [extraOpen, setExtraOpen] = useState(false);
  const [liffClient, setLiffClient] = useState<Liff | null>(null);

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
          setStatus("error");
          return;
        }

        // LINE認証 → Supabaseセッション取得
        const res = await fetch("/api/liff/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken }),
        });

        if (!res.ok) {
          setStatus("error");
          return;
        }

        const data = await res.json();

        // Supabaseセッションをセット
        const supabase = createClient();
        await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });

        setProfile({ displayName: data.display_name });
        setStatus("ready");
      } catch {
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
      setMessage({ type: "success", text: "記録しました！" });
      setTemp("");
      (e.target as HTMLFormElement).reset();
    }
  }

  if (status === "loading") {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <p style={{ fontSize: "18px", color: "gray" }}>読み込み中...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <p className="message-error">認証に失敗しました。LINEからもう一度開いてください。</p>
      </div>
    );
  }

  return (
    <>
      <div id="top-container">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img id="top-img" src="/ken-on-top.png" alt="毎日検温くんZ" />
      </div>

      {profile && (
        <p style={{ textAlign: "center", fontSize: "16px", color: "#666" }}>
          {profile.displayName} さん
        </p>
      )}

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
                message.type === "success" ? "message-success" : "message-error"
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
