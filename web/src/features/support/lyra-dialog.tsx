"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { LogIn, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

const MONTHLY_LIMIT = 10;
const QUICK_QUESTIONS = ["ESP32 ใช้ pin อะไร?", "ต่อ Wi-Fi ไม่ได้", "วิธีติดตั้ง firmware"] as const;

type ChatMessage = { id: number; role: "assistant" | "user"; text: string };

type LyraDialogProps = {
  isAuthenticated: boolean;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export default function LyraDialog({ isAuthenticated, onOpenChange, open }: LyraDialogProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [streaming, setStreaming] = useState(false);
  const deviceIdRef = useRef("");
  const messageIdRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const readUsage = useCallback(async (readonly: boolean) => {
    if (!deviceIdRef.current) return false;
    const response = await fetch("/api/chat/usage", {
      body: JSON.stringify({ readonly, userId: deviceIdRef.current }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    if (!response.ok) return false;
    const data = (await response.json()) as { allowed?: boolean; remaining?: number };
    setRemaining(typeof data.remaining === "number" ? data.remaining : 0);
    return data.allowed === true;
  }, []);

  useEffect(() => {
    if (!open || !isAuthenticated) return;
    const stored = window.localStorage.getItem("rf-lyra-user-id");
    deviceIdRef.current = stored || window.crypto.randomUUID().slice(0, 12);
    if (!stored) window.localStorage.setItem("rf-lyra-user-id", deviceIdRef.current);
    void readUsage(true);
  }, [isAuthenticated, open, readUsage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);

  async function sendMessage(text: string) {
    const value = text.trim();
    if (!value || streaming) return;
    setError("");
    if (!(await readUsage(false))) {
      setError(`เดือนนี้ใช้ Lyra ครบ ${MONTHLY_LIMIT} ครั้งแล้ว`);
      return;
    }

    const userMessage: ChatMessage = { id: ++messageIdRef.current, role: "user", text: value };
    const assistantId = ++messageIdRef.current;
    setMessages((current) => [...current, userMessage, { id: assistantId, role: "assistant", text: "" }]);
    setInput("");
    setStreaming(true);

    try {
      const response = await fetch("/api/chat", {
        body: JSON.stringify({
          deviceId: deviceIdRef.current,
          messages: [{ parts: [{ text: value, type: "text" }], role: "user" }],
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (!response.ok || !response.body) throw new Error("Lyra ยังตอบไม่ได้ในตอนนี้");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6)) as { delta?: string; type?: string };
            if (event.type === "text-delta" && event.delta) {
              setMessages((current) => current.map((message) =>
                message.id === assistantId ? { ...message, text: message.text + event.delta } : message,
              ));
            }
          } catch {
            continue;
          }
        }
      }
    } catch (caught) {
      setMessages((current) => current.filter((message) => message.id !== assistantId));
      setError(caught instanceof Error ? caught.message : "Lyra ยังตอบไม่ได้ในตอนนี้");
    } finally {
      setStreaming(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  const blocked = remaining !== null && remaining <= 0;

  return (
    <Dialog className="max-sm:h-dvh max-sm:max-h-dvh max-sm:w-full max-sm:rounded-none" labelledBy="lyra-dialog-title" onOpenChange={onOpenChange} open={open}>
      <div className="flex h-full max-h-dvh min-h-96 flex-col" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-blue-600 text-white"><Sparkles className="size-5" /></span>
            <div><h2 className="font-bold" id="lyra-dialog-title">คุยกับ Lyra</h2><p className="text-xs text-slate-500">ผู้ช่วย RoboForge · เหลือ {remaining ?? "–"}/{MONTHLY_LIMIT} ครั้ง</p></div>
          </div>
          <Button aria-label="ปิด Lyra" onClick={() => onOpenChange(false)} size="icon" variant="ghost"><X className="size-5" /></Button>
        </header>

        {!isAuthenticated ? (
          <div className="grid flex-1 place-items-center p-8 text-center">
            <div className="max-w-sm"><Sparkles className="mx-auto mb-4 size-10 text-blue-600" /><h3 className="text-xl font-bold">เข้าสู่ระบบเพื่อคุยกับ Lyra</h3><p className="mt-2 text-sm leading-6 text-slate-600">Lyra ช่วยตอบเรื่องวงจร การติดตั้ง firmware และการเชื่อมต่อ Rover</p><Button asChild className="mt-6"><Link href="/login?redirect=/&lang=th"><LogIn className="size-4" />เข้าสู่ระบบ</Link></Button></div>
          </div>
        ) : (
          <>
            <div aria-live="polite" className="flex-1 space-y-3 overflow-y-auto p-5">
              {messages.length === 0 ? <div className="rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-slate-700"><strong className="block text-slate-950">สวัสดี ฉันคือ Lyra</strong>ถามเรื่อง RoboForge ได้เลย หรือเริ่มจากคำถามด้านล่าง</div> : null}
              {messages.map((message) => <div className={message.role === "user" ? "ml-auto max-w-md rounded-2xl rounded-br-md bg-blue-600 px-4 py-3 text-sm text-white" : "max-w-md rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3 text-sm leading-6 text-slate-800"} key={message.id}>{message.text || "Lyra กำลังคิด…"}</div>)}
              {error ? <p className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700" role="alert">{error}</p> : null}
              <div ref={bottomRef} />
            </div>
            <div className="flex flex-wrap gap-2 border-t border-slate-100 px-4 pt-3">
              {QUICK_QUESTIONS.map((question) => <button className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100" disabled={blocked || streaming} key={question} onClick={() => void sendMessage(question)} type="button">{question}</button>)}
            </div>
            <form className="flex gap-2 p-4" onSubmit={submit}><label className="sr-only" htmlFor="lyra-message">ถาม Lyra</label><input className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" disabled={blocked || streaming} id="lyra-message" maxLength={1000} onChange={(event) => setInput(event.target.value)} placeholder={blocked ? "ครบจำนวนครั้งของเดือนนี้แล้ว" : "ถามเรื่อง RoboForge…"} value={input} /><Button aria-label="ส่งข้อความ" disabled={blocked || streaming || !input.trim()} size="icon" type="submit"><Send className="size-4" /></Button></form>
          </>
        )}
      </div>
    </Dialog>
  );
}
