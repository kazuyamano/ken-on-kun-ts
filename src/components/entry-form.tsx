"use client";

import { useState, useRef } from "react";
import { addEntry } from "@/lib/actions";
import { useRouter } from "next/navigation";

export function EntryForm() {
  const [temp, setTemp] = useState("");
  const [extraOpen, setExtraOpen] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const tempNum = parseFloat(temp);
  const isValid = !isNaN(tempNum) && tempNum >= 35 && tempNum < 41;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || !formRef.current) return;
    setPending(true);
    setMessage(null);

    const formData = new FormData(formRef.current);
    const result = await addEntry(formData);
    setPending(false);

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "記録しました！" });
      setTemp("");
      formRef.current.reset();
    }
  }

  function goToHistory() {
    router.push("/history");
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
                    <input
                      type="checkbox"
                      name="breathlessness"
                      id="input3"
                    />{" "}
                    息つらい
                  </div>
                  <div className="extra-checkbox">
                    <input type="checkbox" name="dullness" id="input4" /> 体だるい
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
