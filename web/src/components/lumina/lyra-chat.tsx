"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send, Sparkles, MessageCircle } from "lucide-react";

const DAILY_LIMIT_KEY = "rf-lyra-daily";
const DAILY_MAX = 30;

function getDailyCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(DAILY_LIMIT_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    if (parsed.date === new Date().toDateString()) {
      return parsed.count;
    }
  } catch {}
  return 0;
}

function incrementDailyCount(): number {
  const count = getDailyCount() + 1;
  try {
    localStorage.setItem(
      DAILY_LIMIT_KEY,
      JSON.stringify({ date: new Date().toDateString(), count })
    );
  } catch {}
  return count;
}

export function LyraChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<
    Array<{ id: string; role: string; text: string }>
  >([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [dailyUsed, setDailyUsed] = useState(getDailyCount);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const msgId = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function addMessage(role: string, text: string) {
    const id = String(++msgId.current);
    setMessages((prev) => [...prev, { id, role, text }]);
    return id;
  }

  function updateLastMessage(text: string) {
    setMessages((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last && last.role === "assistant") {
        updated[updated.length - 1] = { ...last, text };
      }
      return updated;
    });
  }

  async function sendMessage(text: string) {
    if (streaming || !text.trim()) return;
    setError(null);

    // 1. ตรวจสอบ limit ก่อน
    if (dailyUsed >= DAILY_MAX) {
      const remaining = new Date();
      remaining.setHours(24, 0, 0, 0);
      const hours = Math.round(
        (remaining.getTime() - Date.now()) / (1000 * 60 * 60)
      );
      setError(
        `วันนี้ถามครบ ${DAILY_MAX} คำถามแล้ว พรุ่งนี้กลับมาใหม่นะครับ 🙏 (อีก ~${hours} ชม.)`
      );
      return;
    }

    // 2. เพิ่มข้อความ user
    addMessage("user", text);
    setInput("");

    // 3. increment counter
    const newCount = incrementDailyCount();
    setDailyUsed(newCount);

    // 4. ส่ง request
    setStreaming(true);
    const assistantId = addMessage("assistant", "");
    abortRef.current = new AbortController();

    try {
      // ใช้ device ID ที่ stable
      let deviceId: string;
      try {
        deviceId =
          localStorage.getItem("rf-device-id") ||
          crypto.randomUUID().slice(0, 12);
        localStorage.setItem("rf-device-id", deviceId);
      } catch {
        deviceId = "anon-" + Math.random().toString(36).slice(2, 10);
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "user", parts: [{ type: "text", text }] },
          ],
          deviceId,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        if (res.status === 429) {
          setError(
            errBody?.error ||
              "วันนี้ถามครบจำนวนสูงสุดแล้ว พรุ่งนี้กลับมาใหม่นะครับ 🙏"
          );
        } else {
          setError(`เกิดข้อผิดพลาด (${res.status}) ลองใหม่ทีหลังครับ`);
        }
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        setStreaming(false);
        return;
      }

      // 5. อ่าน stream
      const reader = res.body?.getReader();
      if (!reader) {
        updateLastMessage("ขออภัย เกิดข้อผิดพลาดในการเชื่อมต่อ");
        setStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6);
          if (jsonStr === "[DONE]") break;

          try {
            const data = JSON.parse(jsonStr);
            if (data.type === "text-delta" && data.delta) {
              fullText += data.delta;
              updateLastMessage(fullText);
            }
          } catch {}
        }
      }

      if (!fullText.trim()) {
        updateLastMessage("ขออภัย ฉันไม่สามารถตอบคำถามนี้ได้ ลองถามอย่างอื่นดูนะครับ");
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Chat with Lyra"
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full
          flex items-center justify-center
          transition-all duration-300
          shadow-[0_8px_32px_rgba(74,184,255,0.25)]
          ${open ? "scale-0 opacity-0" : "scale-100 opacity-100"}`}
        style={{
          background: "linear-gradient(135deg, #4ab8ff, #226ddb)",
          border: "2px solid rgba(255,255,255,0.3)",
        }}
      >
        <MessageCircle className="w-6 h-6 text-white" />
      </button>

      {/* Chat panel */}
      <div
        className={`fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)]
          h-[520px] max-h-[calc(100vh-6rem)]
          rounded-[28px] flex flex-col
          transition-all duration-300 origin-bottom-right
          ${open ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"}`}
        style={{
          background: "rgba(255,255,255,0.94)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(85,151,209,0.24)",
          boxShadow: "0 28px 80px rgba(49,99,155,0.17)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0 border-b"
          style={{ borderColor: "rgba(85,151,209,0.16)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #4ab8ff, #226ddb)",
              }}
            >
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-[15px] font-semibold" style={{ color: "#0d2448" }}>
                💫 Lyra
              </div>
              <div className="text-[11px]" style={{ color: "#5e7599" }}>
                {streaming
                  ? "กำลังตอบ..."
                  : `RoboForge AI · วันนี้ ${DAILY_MAX - dailyUsed}/${DAILY_MAX}`}
              </div>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-2 rounded-full hover:bg-black/5 transition-colors"
            aria-label="Close"
            style={{ color: "#5e7599" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ background: "rgba(74,184,255,0.12)" }}
              >
                <Sparkles className="w-8 h-8" style={{ color: "#4ab8ff" }} />
              </div>
              <p className="text-[14px] font-semibold mb-1" style={{ color: "#0d2448" }}>
                💫 สวัสดี! ฉันคือ Lyra
              </p>
              <p className="text-[13px] leading-relaxed" style={{ color: "#5e7599" }}>
                ถามเรื่อง RoboForge ได้เลย — การต่อวงจร, Pin Diagram, Firmware, คำสั่ง WebSocket หรือวิธีเชื่อมต่อ robot
              </p>

              {/* Daily counter */}
              <div
                className="mt-3 text-[11px] px-3 py-1 rounded-full"
                style={{
                  color: dailyUsed >= DAILY_MAX ? "#ff5b64" : "#5e7599",
                  background:
                    dailyUsed >= DAILY_MAX
                      ? "rgba(255,91,100,0.1)"
                      : "rgba(74,184,255,0.08)",
                }}
              >
                วันนี้ใช้ไป {dailyUsed}/{DAILY_MAX} ครั้ง
              </div>

              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                {[
                  "ESP32 pin อะไร?",
                  "ต่อ Wi-Fi ไม่ได้?",
                  "วิธี flash firmware",
                  "WebSocket commands",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    disabled={dailyUsed >= DAILY_MAX}
                    className="text-[12px] px-3 py-1.5 rounded-full border transition-colors disabled:opacity-30"
                    style={{
                      color: "#226ddb",
                      borderColor: "rgba(74,184,255,0.3)",
                      background: "rgba(74,184,255,0.06)",
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div
              className="mx-2 p-3 rounded-[16px] text-[12px] leading-relaxed"
              style={{
                background: "rgba(255,91,100,0.08)",
                color: "#d6303a",
                border: "1px solid rgba(255,91,100,0.2)",
              }}
            >
              <div className="flex items-start gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-[11px] mt-2 underline opacity-70 hover:opacity-100"
              >
                ปิด
              </button>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}
            >
              {m.role !== "user" && (
                <div
                  className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, #4ab8ff, #226ddb)",
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div
                className={`px-4 py-2.5 max-w-[80%] text-[13px] leading-relaxed whitespace-pre-wrap
                  ${m.role === "user"
                    ? "rounded-[18px] rounded-br-md"
                    : "rounded-[18px] rounded-bl-md"
                  }`}
                style={
                  m.role === "user"
                    ? {
                        background: "linear-gradient(135deg, #4ab8ff, #226ddb)",
                        color: "#fff",
                      }
                    : {
                        background: "rgba(74,184,255,0.08)",
                        color: "#0d2448",
                      }
                }
              >
                {m.text}
              </div>
            </div>
          ))}

          {/* Streaming indicator */}
          {streaming && !messages[messages.length - 1]?.text && (
            <div className="flex gap-2">
              <div
                className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #4ab8ff, #226ddb)",
                }}
              >
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <div
                className="px-4 py-2.5 rounded-[18px] rounded-bl-md text-[13px]"
                style={{
                  background: "rgba(74,184,255,0.08)",
                  color: "#5e7599",
                }}
              >
                <span className="animate-pulse">Lyra กำลังคิด...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="p-3 shrink-0 border-t"
          style={{ borderColor: "rgba(85,151,209,0.16)" }}
        >
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                dailyUsed >= DAILY_MAX
                  ? "ครบจำนวนคำถามวันนี้แล้ว..."
                  : "ถามเรื่อง RoboForge..."
              }
              maxLength={1000}
              disabled={streaming || dailyUsed >= DAILY_MAX}
              className="flex-1 px-4 py-2.5 rounded-full text-[13px] outline-none border
                placeholder:text-[#92a4bf] disabled:opacity-50"
              style={{
                background: "rgba(74,184,255,0.05)",
                borderColor: "rgba(85,151,209,0.2)",
                color: "#0d2448",
              }}
            />
            <button
              type="submit"
              disabled={streaming || !input.trim() || dailyUsed >= DAILY_MAX}
              className="w-10 h-10 rounded-full flex items-center justify-center
                transition-all duration-150 disabled:opacity-30 shrink-0"
              style={{
                background: "linear-gradient(135deg, #4ab8ff, #226ddb)",
              }}
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
