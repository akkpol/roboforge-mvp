"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send, Sparkles, MessageCircle } from "lucide-react";

const MAX_PER_MONTH = 10;

function getUserId(): string {
  try {
    const stored = localStorage.getItem("rf-lyra-user-id");
    if (stored) return stored;
    const id = crypto.randomUUID().slice(0, 12);
    localStorage.setItem("rf-lyra-user-id", id);
    return id;
  } catch {
    return "anon-" + Math.random().toString(36).slice(2, 10);
  }
}

export function LyraChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ id: string; role: string; text: string }>>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remainingRef = useRef(MAX_PER_MONTH);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [checking, setChecking] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const msgId = useRef(0);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // เช็ค usage ทันทีตอนเปิด component
  useEffect(() => {
    checkUsage().then((r) => {
      remainingRef.current = r.remaining;
      setRemaining(r.remaining);
      setChecking(false);
    });
  }, []);

  async function checkUsage(): Promise<{ remaining: number; allowed: boolean }> {
    try {
      const res = await fetch("/api/chat/usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: getUserId() }),
      });
      if (!res.ok) return { remaining: 0, allowed: false };
      const data = await res.json();
      return { remaining: data.remaining, allowed: data.allowed };
    } catch {
      return { remaining: 0, allowed: false };
    }
  }

  async function deductUsage(): Promise<boolean> {
    try {
      const res = await fetch("/api/chat/usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: getUserId() }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      remainingRef.current = data.remaining;
      setRemaining(data.remaining);
      return data.allowed;
    } catch { return false; }
  }

  function addMsg(role: string, text: string) {
    const id = String(++msgId.current);
    setMessages((prev) => [...prev, { id, role, text }]);
    return id;
  }

  function updateLast(text: string) {
    setMessages((prev) => {
      const arr = [...prev];
      const last = arr[arr.length - 1];
      if (last?.role === "assistant") arr[arr.length - 1] = { ...last, text };
      return arr;
    });
  }

  async function sendMessage(text: string) {
    if (streaming || !text.trim()) return;
    setError(null);

    // 1. Deduct usage
    const allowed = await deductUsage();
    if (!allowed) {
      setError(`เดือนนี้คุณใช้ครบ ${MAX_PER_MONTH} ครั้งแล้ว เดือนหน้ากลับมาใหม่นะครับ 🙏`);
      return;
    }

    // 2. Add user message
    addMsg("user", text);
    setInput("");

    // 3. Send API
    setStreaming(true);
    const assistantId = addMsg("assistant", "");
    const abort = new AbortController();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", parts: [{ type: "text", text }] }],
          deviceId: getUserId(),
        }),
        signal: abort.signal,
      });

      if (!res.ok) {
        setError(`เกิดข้อผิดพลาด (${res.status}) ลองใหม่ทีหลังครับ`);
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        setStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) { updateLast("ขออภัย เกิดข้อผิดพลาด"); setStreaming(false); return; }

      const decoder = new TextDecoder();
      let buf = "";
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const d = JSON.parse(line.slice(6));
            if (d.type === "text-delta" && d.delta) { full += d.delta; updateLast(full); }
          } catch { /* skip */ }
        }
      }
      if (!full.trim()) updateLast("ขออภัย ลองถามอย่างอื่นดูนะครับ");
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setStreaming(false);
    }
  }

  const isBlocked = checking || (remaining !== null && remaining <= 0);

  return (
    <>
      {/* 🔵 Floating button — ใหญ่ พร้อมข้อความ */}
      <button
        onClick={() => setOpen(true)}
        aria-label="คุยกับ Lyra"
        className={`fixed z-50 transition-all duration-300 ${open ? "scale-0 opacity-0" : "scale-100 opacity-100"}`}
        style={{ bottom: "24px", right: "24px" }}
      >
        <div
          className="flex items-center gap-3 px-5 py-3 rounded-full shadow-lg"
          style={{
            background: "linear-gradient(135deg, #4ab8ff, #226ddb)",
            border: "2px solid rgba(255,255,255,0.3)",
          }}
        >
          <MessageCircle className="w-6 h-6 text-white" />
          <span className="text-[15px] font-bold text-white whitespace-nowrap">คุยกับ Lyra</span>
          {!checking && remaining !== null && (
            <span
              className="text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap"
              style={{
                background: remaining <= 2 ? "rgba(255,91,100,0.25)" : "rgba(255,255,255,0.2)",
                color: remaining <= 2 ? "#ffb3b8" : "rgba(255,255,255,0.85)",
              }}
            >
              เหลือ {remaining}/{MAX_PER_MONTH}
            </span>
          )}
        </div>
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
        <div className="flex items-center justify-between px-5 py-4 shrink-0 border-b" style={{ borderColor: "rgba(85,151,209,0.16)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #4ab8ff, #226ddb)" }}>
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-[15px] font-semibold" style={{ color: "#0d2448" }}>
                💫 Lyra
              </div>
              <div className="text-[11px]" style={{ color: "#5e7599" }}>
                {streaming ? "กำลังตอบ..." : `RoboForge AI · เดือนนี้เหลือ ${remaining ?? "..."}/${MAX_PER_MONTH} ครั้ง`}
              </div>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="p-2 rounded-full hover:bg-black/5 transition-colors" aria-label="Close" style={{ color: "#5e7599" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {checking && (
            <div className="flex items-center justify-center h-full">
              <p className="text-[13px]" style={{ color: "#5e7599" }}>⏳ ตรวจสอบสิทธิ์...</p>
            </div>
          )}

          {!checking && messages.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(74,184,255,0.12)" }}>
                <Sparkles className="w-8 h-8" style={{ color: "#4ab8ff" }} />
              </div>
              <p className="text-[14px] font-semibold mb-1" style={{ color: "#0d2448" }}>
                💫 สวัสดี! ฉันคือ Lyra
              </p>
              <p className="text-[13px] leading-relaxed" style={{ color: "#5e7599" }}>
                ถามเรื่อง RoboForge ได้เลย — การต่อวงจร, Pin Diagram, Firmware, คำสั่ง WebSocket หรือวิธีเชื่อมต่อ robot
              </p>
              <p className="text-[11px] mt-3 px-3 py-1 rounded-full"
                style={{
                  color: isBlocked ? "#ff5b64" : "#5e7599",
                  background: isBlocked ? "rgba(255,91,100,0.1)" : "rgba(74,184,255,0.08)",
                }}
              >
                {isBlocked
                  ? `ครบ ${MAX_PER_MONTH} ครั้งแล้ว เดือนหน้ากลับมาใหม่นะครับ`
                  : `เดือนนี้เหลือ ${remaining}/${MAX_PER_MONTH} ครั้ง`
                }
              </p>
              {!isBlocked && (
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  {["ESP32 pin อะไร?", "ต่อ Wi-Fi ไม่ได้?", "วิธี flash firmware", "WebSocket commands"].map((q) => (
                    <button key={q} onClick={() => sendMessage(q)}
                      className="text-[12px] px-3 py-1.5 rounded-full border transition-colors"
                      style={{ color: "#226ddb", borderColor: "rgba(74,184,255,0.3)", background: "rgba(74,184,255,0.06)" }}
                    >{q}</button>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mx-2 p-3 rounded-[16px] text-[12px] leading-relaxed" style={{ background: "rgba(255,91,100,0.08)", color: "#d6303a", border: "1px solid rgba(255,91,100,0.2)" }}>
              <div className="flex items-start gap-2"><span>⚠️</span><span>{error}</span></div>
              <button onClick={() => setError(null)} className="text-[11px] mt-2 underline opacity-70 hover:opacity-100">ปิด</button>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role !== "user" && (
                <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #4ab8ff, #226ddb)" }}>
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div className={`px-4 py-2.5 max-w-[80%] text-[13px] leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "rounded-[18px] rounded-br-md" : "rounded-[18px] rounded-bl-md"}`}
                style={m.role === "user" ? { background: "linear-gradient(135deg, #4ab8ff, #226ddb)", color: "#fff" } : { background: "rgba(74,184,255,0.08)", color: "#0d2448" }}
              >{m.text}</div>
            </div>
          ))}

          {streaming && !messages[messages.length - 1]?.text && (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #4ab8ff, #226ddb)" }}>
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="px-4 py-2.5 rounded-[18px] rounded-bl-md text-[13px]" style={{ background: "rgba(74,184,255,0.08)", color: "#5e7599" }}>
                <span className="animate-pulse">Lyra กำลังคิด...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
          className="p-3 shrink-0 border-t" style={{ borderColor: "rgba(85,151,209,0.16)" }}
        >
          <div className="flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)}
              placeholder={isBlocked ? "ครบจำนวนครั้งแล้ว..." : "ถามเรื่อง RoboForge..."}
              maxLength={1000} disabled={streaming || isBlocked}
              className="flex-1 px-4 py-2.5 rounded-full text-[13px] outline-none border placeholder:text-[#92a4bf] disabled:opacity-50"
              style={{ background: "rgba(74,184,255,0.05)", borderColor: "rgba(85,151,209,0.2)", color: "#0d2448" }}
            />
            <button type="submit" disabled={streaming || !input.trim() || isBlocked}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-150 disabled:opacity-30 shrink-0"
              style={{ background: "linear-gradient(135deg, #4ab8ff, #226ddb)" }}
            ><Send className="w-4 h-4 text-white" /></button>
          </div>
        </form>
      </div>
    </>
  );
}
