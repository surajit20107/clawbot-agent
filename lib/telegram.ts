import "server-only";

function getApiBase(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  return `https://api.telegram.org/bot${token}`;
}

export async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  const base = getApiBase();

  // Try Markdown first, fall back to plain text
  const mdRes = await fetch(`${base}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });

  if (mdRes.ok) return;

  const plainRes = await fetch(`${base}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!plainRes.ok) {
    const body = await plainRes.text().catch(() => "(no body)");
    throw new Error(`Telegram sendMessage failed: ${plainRes.status} — ${body}`);
  }
}

export async function getWebhookInfo(): Promise<Record<string, unknown>> {
  const res = await fetch(`${getApiBase()}/getWebhookInfo`);
  const json = await res.json();
  return json as Record<string, unknown>;
}

export async function setWebhook(url: string, secret: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${getApiBase()}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, secret_token: secret, allowed_updates: ["message"] }),
  });
  const json = await res.json();
  return json as Record<string, unknown>;
}

export async function deleteWebhook(): Promise<Record<string, unknown>> {
  const res = await fetch(`${getApiBase()}/deleteWebhook`, { method: "POST" });
  const json = await res.json();
  return json as Record<string, unknown>;
}

export async function getBotInfo(): Promise<Record<string, unknown>> {
  const res = await fetch(`${getApiBase()}/getMe`);
  const json = await res.json();
  return json as Record<string, unknown>;
}
