import { getWebhookInfo, getBotInfo, setWebhook, deleteWebhook, sendTelegramMessage } from "@/lib/telegram";
import { revalidatePath } from "next/cache";
import { Suspense } from "react";

// ── Server Actions ──────────────────────────────────────────────────────────

async function actionRegisterWebhook(formData: FormData) {
  "use server";
  const url = String(formData.get("webhookUrl") ?? "").trim();
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";
  if (!url) return;
  await setWebhook(url, secret);
  revalidatePath("/telegram");
}

async function actionDeleteWebhook() {
  "use server";
  await deleteWebhook();
  revalidatePath("/telegram");
}

async function actionSendTestMessage(formData: FormData) {
  "use server";
  const chatId = String(formData.get("chatId") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();
  if (!chatId || !text) return;
  await sendTelegramMessage(chatId, text);
  revalidatePath("/telegram");
}

function TelegramStatusFallback() {
  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="mb-2 text-base font-medium">Loading live Telegram status...</h2>
      <p className="text-sm text-muted-foreground">
        Fetching bot info and webhook info.
      </p>
    </section>
  );
}

async function TelegramLiveStatus({
  configured,
  defaultWebhookUrl,
}: {
  configured: boolean;
  defaultWebhookUrl: string;
}) {
  let botInfo: Record<string, unknown> | null = null;
  let webhookInfo: Record<string, unknown> | null = null;
  let fetchError: string | null = null;

  if (configured) {
    try {
      [botInfo, webhookInfo] = await Promise.all([getBotInfo(), getWebhookInfo()]);
    } catch (err) {
      fetchError = err instanceof Error ? err.message : String(err);
    }
  }

  const webhookResult = (webhookInfo as { result?: Record<string, unknown> } | null)?.result;
  const botResult = (botInfo as { result?: Record<string, unknown> } | null)?.result;
  const currentWebhookUrl = typeof webhookResult?.url === "string" ? webhookResult.url : "";
  const pendingUpdateCount = webhookResult?.pending_update_count ?? "?";
  const lastErrorMessage = webhookResult?.last_error_message;
  const lastErrorDate = webhookResult?.last_error_date;

  return (
    <>
      {fetchError && (
        <section className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
          <h2 className="text-base font-medium text-destructive">Error Fetching Telegram API</h2>
          <pre className="mt-2 overflow-x-auto text-sm text-destructive">{fetchError}</pre>
        </section>
      )}

      {botResult && (
        <section className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 text-base font-medium">2. Bot Info</h2>
          <pre className="overflow-x-auto rounded-md border bg-muted p-3 text-xs">
            {JSON.stringify(botResult, null, 2)}
          </pre>
        </section>
      )}

      {webhookResult && (
        <section className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 text-base font-medium">3. Webhook Status</h2>
          <table className="w-full border-collapse text-sm">
            <tbody>
              <tr className="border-b">
                <td className="py-2 font-medium">URL</td>
                <td className="py-2 break-all">{currentWebhookUrl || "(none)"}</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 font-medium">Pending updates</td>
                <td className="py-2">{String(pendingUpdateCount)}</td>
              </tr>
              {Boolean(lastErrorMessage) && (
                <tr>
                  <td className="py-2 font-medium">Last error</td>
                  <td className="py-2 text-destructive">
                    {String(lastErrorMessage)}
                    {lastErrorDate ? ` (${new Date(Number(lastErrorDate) * 1000).toISOString()})` : ""}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-medium">Raw webhook response</summary>
            <pre className="mt-2 overflow-x-auto rounded-md border bg-muted p-3 text-xs">
              {JSON.stringify(webhookInfo, null, 2)}
            </pre>
          </details>
        </section>
      )}

      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-2 text-base font-medium">4. Register Webhook</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Must be an HTTPS URL reachable by Telegram. Use ngrok or deploy to Vercel.
        </p>
        <form action={actionRegisterWebhook} className="space-y-2">
          <input
            name="webhookUrl"
            type="text"
            defaultValue={defaultWebhookUrl}
            className="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
          />
          <button type="submit" className="rounded-md border px-3 py-2 text-sm font-medium">
            Register webhook
          </button>
        </form>

        <form action={actionDeleteWebhook} className="mt-3">
          <button type="submit" className="rounded-md border border-destructive/40 px-3 py-2 text-sm font-medium text-destructive">
            Delete webhook
          </button>
        </form>
      </section>

      {/* ── Send test message ── */}
      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-2 text-base font-medium">5. Send Test Message</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Get your chat ID: message your bot, then check{" "}
          <a
            href={`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN ?? "TOKEN"}/getUpdates`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            getUpdates
          </a>.
        </p>
        <form action={actionSendTestMessage} className="space-y-3">
          <label className="block text-sm">
            Chat ID:
            <input
              name="chatId"
              type="text"
              placeholder="123456789"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
            />
          </label>
          <label className="block text-sm">
            Message:
            <input
              name="text"
              type="text"
              defaultValue="Hello from the webhook!"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
          <button type="submit" className="rounded-md border px-3 py-2 text-sm font-medium">
            Send
          </button>
        </form>
      </section>

      {/* ── Webhook endpoint info ── */}
      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-2 text-base font-medium">6. Webhook Endpoint</h2>
        <p className="text-sm">Your webhook URL: <code>/api/telegram-webhook</code></p>
        <p className="mt-1 text-sm">Telegram calls this with a POST for every incoming message.</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>Validates <code>x-telegram-bot-api-secret-token</code> header against <code>TELEGRAM_WEBHOOK_SECRET</code></li>
          <li>Returns <code>200 OK</code> immediately, runs the AI agent in the background via <code>after()</code></li>
          <li>Uses Composio tools via <code>COMPOSIO_API_KEY</code> (keyed to the Telegram chat ID)</li>
          <li>Replies to the same chat with the agent response</li>
        </ul>
      </section>
    </>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function TelegramDebugPage() {
  const configured = Boolean(process.env.TELEGRAM_BOT_TOKEN);
  const defaultWebhookUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://your-app.vercel.app"}/api/telegram-webhook`;

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Telegram Debug</h1>
        <p className="text-sm text-muted-foreground">
          Minimal setup page: check config, register webhook, and send test messages.
        </p>
      </header>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-base font-medium">1. Environment</h2>
        <table className="w-full border-collapse text-sm">
          <tbody>
            <tr className="border-b">
              <td className="py-2 font-mono">TELEGRAM_BOT_TOKEN</td>
              <td className="py-2">{process.env.TELEGRAM_BOT_TOKEN ? "✅ set" : "❌ missing"}</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 font-mono">TELEGRAM_BOT_USERNAME</td>
              <td className="py-2">{process.env.TELEGRAM_BOT_USERNAME ? `✅ @${process.env.TELEGRAM_BOT_USERNAME}` : "❌ missing"}</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 font-mono">TELEGRAM_WEBHOOK_SECRET</td>
              <td className="py-2">{process.env.TELEGRAM_WEBHOOK_SECRET ? "✅ set" : "❌ missing"}</td>
            </tr>
            <tr>
              <td className="py-2 font-mono">COMPOSIO_API_KEY</td>
              <td className="py-2">{process.env.COMPOSIO_API_KEY ? "✅ set" : "❌ missing"}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <Suspense fallback={<TelegramStatusFallback />}>
        <TelegramLiveStatus configured={configured} defaultWebhookUrl={defaultWebhookUrl} />
      </Suspense>
    </main>
  );
}
