import { useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (err) => toast.error(err.message || "Chat failed"),
  });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    document.documentElement.classList.toggle("chatbot-open", open);
    return () => document.documentElement.classList.remove("chatbot-open");
  }, [open]);

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
        <Card data-chatbot-panel="open" className="pointer-events-auto h-[min(32rem,calc(100dvh-1.5rem))] w-full max-w-sm flex flex-col shadow-2xl animate-fade-in overflow-hidden sm:w-[24rem]">
          <header className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary to-accent text-primary-foreground">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <div>
                <div className="font-bold text-sm leading-tight">PariBot</div>
                <div className="text-[10px] opacity-80">Powered by Lovable AI</div>
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
              <div className="text-center text-sm text-muted-foreground py-8 px-2">
                👋 Hi! Ask me about Pariksha, TriShield Vault, exams, or how the platform works.
              </div>
            )}
            {messages.map((m) => {
              const text = m.parts
                .map((p) => (p.type === "text" ? p.text : ""))
                .join("");
              const isUser = m.role === "user";
              return (
                <div
                  key={m.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                      isUser
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-card border rounded-bl-sm"
                    }`}
                  >
                    {text}
                  </div>
                </div>
              );
            })}
            {busy && (
              <div className="flex justify-start">
                <div className="bg-card border rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-muted-foreground">
                  Thinking…
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const v = input.trim();
              if (!v || busy) return;
              sendMessage({ text: v });
              setInput("");
            }}
            className="flex gap-2 p-3 border-t bg-background"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask PariBot…"
              aria-label="Chat message"
              disabled={busy}
              autoFocus
            />
            <Button type="submit" size="icon" disabled={busy || !input.trim()} aria-label="Send">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
