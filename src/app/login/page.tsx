"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/auth/callback` },
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage("確認メールを送信しました。メールを確認してください。");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else {
        router.push("/");
        router.refresh();
      }
    }
  }

  return (
    <>
      <div id="top-container">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img id="top-img" src="/ken-on-top.png" alt="毎日検温くんZ" />
      </div>
      <div className="module-container">
        <div className="login-container">
          <form onSubmit={handleSubmit}>
            <div className="login-form-group">
              <label htmlFor="email">メールアドレス</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="login-form-group">
              <label htmlFor="password">パスワード</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            {error && <p className="message-error">{error}</p>}
            {message && <p className="message-success">{message}</p>}
            <div className="submit-area" style={{ paddingTop: "10px" }}>
              <button type="submit" className="module-button">
                {isSignUp ? "新規登録" : "ログイン"}
              </button>
            </div>
          </form>
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              style={{
                background: "none",
                border: "none",
                color: "gray",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              {isSignUp
                ? "アカウントをお持ちの方はログイン"
                : "アカウントを作成する"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
