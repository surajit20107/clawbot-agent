"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";

function ChatPanel({
  title,
  description,
  useMemory,
  userId,
  accentClass,
}: {
  title: string;
  description: string;
  useMemory: boolean;
  userId: string;
  accentClass: string;
}) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/memory-demo/api/chat",
        body: { useMemory, userId },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId]
  );

  const { messages, sendMessage, status } = useChat({
    id: useMemory ? "with-memory" : "without-memory",
    transport,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submit = () => {
    if (!input.trim() || status !== "ready") return;
    sendMessage({ role: "user", parts: [{ type: "text", text: input }] });
    setInput("");
  };

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card">
      <div className={`rounded-t-xl px-5 py-4 ${accentClass}`}>
        <h2 className="font-semibold text-base">{title}</h2>
        <p className="mt-0.5 text-sm opacity-80">{description}</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
        {messages.length === 0 ? (
          <p className="mt-8 text-center text-muted-foreground text-sm">
            Tell it your name or a preference. Refresh the page and ask if it
            remembers.
          </p>
        ) : (
          messages.map((m) => (
            <div
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              key={m.id}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user"
                    ? "bg-foreground text-background"
                    : "bg-muted text-foreground"
                }`}
              >
                {m.parts?.map((part, i) => {
                  if (part.type === "text") {
                    return <span key={i}>{part.text}</span>;
                  }
                  if (part.type.startsWith("tool-")) {
                    return (
                      <span
                        className="mt-1 block text-xs italic opacity-60"
                        key={i}
                      >
                        [{part.type.replace("tool-", "")}...]
                      </span>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          ))
        )}
        {(status === "streaming" || status === "submitted") && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-muted px-4 py-2.5 text-sm">
              <span className="animate-pulse">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 border-t px-4 py-3">
        <input
          className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Type a message..."
          value={input}
        />
        <button
          className="rounded-lg bg-foreground px-4 py-2 text-background text-sm font-medium disabled:opacity-40"
          disabled={status !== "ready" || !input.trim()}
          onClick={submit}
          type="button"
        >
          Send
        </button>
      </div>
    </div>
  );
}

function MemoryDemo() {
  const [userId] = useState<string | null>(null);
  const [resolvedId, setResolvedId] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("memory-demo-user-id");
    if (stored) {
      setResolvedId(stored);
    } else {
      const id = `demo-user-${crypto.randomUUID().slice(0, 8)}`;
      sessionStorage.setItem("memory-demo-user-id", id);
      setResolvedId(id);
    }
  }, [userId]);

  if (!resolvedId) {
    return (
      <div className="flex h-dvh items-center justify-center text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      <div className="border-b px-6 py-5">
        <h1 className="font-semibold text-xl tracking-tight">Memory Demo</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Same model, same conversation. Left has no memory. Right uses{" "}
          <a
            className="underline underline-offset-2"
            href="https://supermemory.ai"
            rel="noopener noreferrer"
            target="_blank"
          >
            Supermemory
          </a>{" "}
          — tell it something, refresh the page, and ask again.
        </p>
        <p className="mt-1 font-mono text-muted-foreground text-xs">
          session: {resolvedId}
        </p>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 p-4 md:grid-cols-2">
        <ChatPanel
          accentClass="bg-muted"
          description="Forgets everything on refresh"
          title="Without Memory"
          useMemory={false}
          userId={resolvedId}
        />
        <ChatPanel
          accentClass="bg-violet-100 dark:bg-violet-950/40"
          description="Remembers across conversations"
          title="With Memory (Supermemory)"
          useMemory={true}
          userId={resolvedId}
        />
      </div>
    </div>
  );
}

export default function MemoryDemoPage() {
  return <MemoryDemo />;
}
