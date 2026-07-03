"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { X, Send, Sparkles, MessageCircle } from "lucide-react";

export function LyraChat() {
  const [open, setOpen] = useState(false);
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    sendMessage({ text });
    setInput("");
  };

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
        <div className="flex items-center justify-between px-5 py-4 shrink-0 border-b"
          style={{ borderColor: "rgba(85,151,209,0.16)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center"
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
                {status === "streaming" ? "กำลังตอบ..." : "RoboForge AI · DeepSeek"}
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
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
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
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                {["ESP32 pin อะไร?", "ต่อ Wi-Fi ไม่ได้?", "วิธี flash firmware", "WebSocket commands"].map((q) => (
                  <button
                    key={q}
                    onClick={() => { sendMessage({ text: q }); }}
                    className="text-[12px] px-3 py-1.5 rounded-full border transition-colors hover:bg-opacity-10"
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
          {messages.map((m) => (
            <div key={m.id} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role !== "user" && (
                <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #4ab8ff, #226ddb)" }}
                >
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div
                className={`px-4 py-2.5 max-w-[80%] text-[13px] leading-relaxed
                  ${m.role === "user"
                    ? "rounded-[18px] rounded-br-md"
                    : "rounded-[18px] rounded-bl-md"
                  }`}
                style={m.role === "user" ? {
                  background: "linear-gradient(135deg, #4ab8ff, #226ddb)",
                  color: "#fff",
                } : {
                  background: "rgba(74,184,255,0.08)",
                  color: "#0d2448",
                }}
              >
                {m.parts.map((p, i) =>
                  p.type === "text" ? <span key={i}>{p.text}</span> : null
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-3 shrink-0 border-t"
          style={{ borderColor: "rgba(85,151,209,0.16)" }}
        >
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="ถามเรื่อง RoboForge..."
              maxLength={1000}
              disabled={status === "streaming"}
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
              disabled={status === "streaming" || !input.trim()}
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
