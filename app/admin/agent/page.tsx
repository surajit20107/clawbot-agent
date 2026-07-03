import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/app/(auth)/auth";
import { DEFAULT_SOUL } from "@/lib/ai/prompts";
import { getUserSoul } from "@/lib/db/queries";
import { SoulEditor } from "./soul-editor";

async function AgentSettingsContent() {
  await connection();
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.type === "guest") {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-semibold text-2xl tracking-tight">Agent</h1>
        <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          Guest users can't customize the agent's soul. Sign up first.
        </section>
      </main>
    );
  }

  const soul = await getUserSoul({ userId: session.user.id });

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Agent soul</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            How your agent thinks and speaks. Markdown is supported. Applies to
            web and Telegram.
          </p>
        </div>
        <a
          className="text-muted-foreground text-sm hover:underline"
          href="/admin"
        >
          ← Dashboard
        </a>
      </div>

      <SoulEditor initialSoul={soul} defaultSoul={DEFAULT_SOUL} />
    </main>
  );
}

export default function AgentSettingsPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-3xl px-6 py-12">
          <div className="h-7 w-40 animate-pulse rounded-lg bg-muted/50" />
          <div className="mt-2 h-4 w-72 animate-pulse rounded bg-muted/30" />
          <div className="mt-8 h-64 animate-pulse rounded-xl border bg-muted/30" />
        </main>
      }
    >
      <AgentSettingsContent />
    </Suspense>
  );
}
