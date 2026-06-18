import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";

type Msg = { id: string; role: "user" | "bot"; text: string };

const PRESETS: { q: string; a: string }[] = [
  {
    q: "What is Pariksha?",
    a: "**Pariksha** is India's national exam-integrity platform. We protect papers with **TriShield Vault** (SHA-256 sealed, AES-256-GCM encrypted, time-locked), run **AI proxy detection** with face matching every 5 minutes, and provide **live integrity monitoring** (tab-switch, copy, fullscreen-exit detection).",
  },
  {
    q: "How does TriShield Vault work?",
    a: "TriShield seals every paper with **SHA-256** + **AES-256-GCM** and a time-lock. Papers cannot be decrypted before the exam starts — even by admins. Every access is audit-logged.",
  },
  {
    q: "What are the demo logins?",
    a: "Try any of these — all use password **Demo@1234**:\n\n- candidate@pariksha.in\n- invigilator@pariksha.in\n- institute@pariksha.in\n- admin@pariksha.in\n- superadmin@pariksha.in",
  },
  {
    q: "How do I register for an exam?",
    a: "Click **Register** in the top nav, enter the **access code** your institute shared, fill in your details, and confirm. You'll receive your admit card in the candidate dashboard once the paper is published.",
  },
  {
    q: "How is cheating detected?",
    a: "We combine **live face matching**, **tab-switch detection**, **copy/paste blocking**, **fullscreen-exit alerts**, and **AI proxy detection**. Every incident is logged and reviewed by invigilators in real time.",
  },
  {
    q: "Who can I contact for support?",
    a: "Use the **Support** section in your dashboard to raise a ticket, or email **support@pariksha.in**. We respond within 24 hours on working days.",
  },
];

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);

  useEffect(() => {
    document.documentElement.classList.toggle("chatbot-open", open);
    return () => document.documentElement.classList.remove("chatbot-open");
  }, [open]);

  const shownPresets = useMemo(() => PRESETS, []);

  const push = (m: Msg) => setMessages((prev) => [...prev, m]);

  const ask = (preset: { q: string; a: string }) => {
    push({ id: crypto.randomUUID(), role: "user", text: preset.q });
    setTimeout(() => push({ id: crypto.randomUUID(), role: "bot", text: preset.a }), 250);
  };

  const submitCustom = (text: string) => {
    push({ id: crypto.randomUUID(), role: "user", text });
    setTimeout(
      () =>
        push({
          id: crypto.randomUUID(),
          role: "bot",
          text:
            "Thanks for your question! 🤖 Our **AI assistant is coming soon** — for now, please pick one of the suggested questions below, or email **support@pariksha.in** and our team will get back to you.",
        }),
      300,
    );
  };

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-3 z-[80] flex justify-end sm:inset-x-auto sm:right-4 sm:bottom-4">
      {!open && (
        <Button
          size="lg"
          aria-label="Open PariBot chatbot"
          onClick={() => setOpen(true)}
          className="pointer-events-auto rounded-full h-14 w-14 p-0 shadow-elegant bg-accent hover:bg-accent/90 animate-fade-in"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {open && (
        <Card
          data-chatbot-panel="open"
          className="pointer-events-auto h-[min(34rem,calc(100dvh-1.5rem))] w-full max-w-sm flex flex-col shadow-2xl animate-fade-in overflow-hidden sm:w-[24rem]"
        >
          <header className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary to-accent text-primary-foreground">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <div>
                <div className="font-bold text-sm leading-tight">PariBot</div>
                <div className="text-[10px] opacity-80">Quick answers · AI coming soon</div>
              </div>
            </div>
            <button
              aria-label="Close chatbot"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 hover:bg-white/20 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-muted/30">
            {messages.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-4 px-2">
                👋 Hi! Pick a question below to get started.
              </div>
            )}
            {messages.map((m) => {
              const isUser = m.role === "user";
              return (
                <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                      isUser
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-card border rounded-bl-sm"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })}

            <div className="pt-2">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 px-1">
                Suggested questions
              </div>
              <div className="flex flex-col gap-1.5">
                {shownPresets.map((p) => (
                  <button
                    key={p.q}
                    onClick={() => ask(p)}
                    className="text-left text-xs rounded-lg border bg-card hover:bg-accent/10 px-3 py-2 transition"
                  >
                    {p.q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const v = input.trim();
              if (!v) return;
              submitCustom(v);
              setInput("");
            }}
            className="flex gap-2 p-3 border-t bg-background"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything…"
              aria-label="Chat message"
              autoFocus
            />
            <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Send">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
