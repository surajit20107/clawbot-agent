import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";
import Link from "next/link";
import { Bot, CalendarClock, Send } from "lucide-react";

type ConnectedAccountSummary = {
  id?: string;
  status?: string;
  toolkit?: {
    slug?: string;
    name?: string;
  };
  authConfig?: {
    id?: string;
    isComposioManaged?: boolean;
    mode?: string;
  };
};

type ToolkitItem = {
  slug: string;
  name: string;
  logo?: string;
  isNoAuth: boolean;
  connection?: {
    isActive: boolean;
    authConfig?: {
      id: string;
      isComposioManaged: boolean;
      mode: string;
    } | null;
    connectedAccount?: {
      id: string;
      status: string;
    };
  };
};

type ToolkitState = {
  items: ToolkitItem[];
  nextCursor?: string;
  totalPages: number;
};

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "ACTIVE";
  if (isActive) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
        <span className="size-1.5 rounded-full bg-green-500" />
        {status}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">
      <span className="size-1.5 rounded-full bg-red-500" />
      {status}
    </span>
  );
}

function ConnectionBadge({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
        <span className="size-1.5 rounded-full bg-green-500" />
        Connected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      <span className="size-1.5 rounded-full bg-muted-foreground/50" />
      Not connected
    </span>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          className="h-16 animate-pulse rounded-xl border bg-muted/30"
          key={i}
        />
      ))}
    </div>
  );
}

async function AdminContent() {
  await connection();
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const userId = session.user.id;
  const isGuest = session.user.type === "guest";
  const hasComposio = Boolean(process.env.COMPOSIO_API_KEY);

  let toolkitState: ToolkitState | null = null;
  let connectedAccounts: ConnectedAccountSummary[] = [];
  let errorMessage: string | null = null;

  if (!isGuest && hasComposio) {
    try {
      const composio = new Composio({ provider: new VercelProvider() });
      const composioSession = await composio.create(userId);
      toolkitState = (await composioSession.toolkits()) as ToolkitState;
      const result = await composio.connectedAccounts.list({
        userIds: [userId],
      });
      connectedAccounts = result.items as ConnectedAccountSummary[];
    } catch (error) {
      errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to load Composio data.";
    }
  }

  const connectedToolkits =
    toolkitState?.items.filter((t) => t.connection?.isActive) ?? [];
  const availableToolkits =
    toolkitState?.items.filter((t) => !t.connection?.isActive && !t.isNoAuth) ??
    [];

  return (
    <main className="mx-auto max-w-5xl ">
      <div className="px-6 py-12 flex flex-row gap-6 justify-end items-center">
        <div className="flex flex-row gap-1">
          <Link href="/admin/agent" className="flex flex-col items-center">
            <Bot />
            Agent
          </Link>
        </div>
        <div className="flex flex-row gap-1">
          <Link href="/admin/schedules" className="flex flex-col items-center">
            <CalendarClock />
            Schedules
          </Link>
        </div>
        <div className="flex flex-row gap-1">
          <Link href="/admin/telegram" className="flex flex-col items-center">
            <Send />
            Telegram
          </Link>
        </div>
      </div>
      <div className="mb-8">
        <h1 className="font-semibold text-2xl tracking-tight">Admin</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Composio integration status for the logged-in user.
        </p>
      </div>

      {/* User info */}
      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="text-muted-foreground text-xs uppercase tracking-wide">
            User ID
          </div>
          <div className="mt-2 break-all font-mono text-sm">{userId}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-muted-foreground text-xs uppercase tracking-wide">
            User Type
          </div>
          <div className="mt-2 capitalize text-sm">{session.user.type}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-muted-foreground text-xs uppercase tracking-wide">
            Connected Accounts
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {isGuest ? "—" : connectedAccounts.length}
          </div>
        </div>
      </section>

      {/* Guest notice */}
      {isGuest ? (
        <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          Guest users are intentionally blocked from Composio connections.
        </section>
      ) : null}

      {/* Composio not configured */}
      {!hasComposio ? (
        <section className="mt-6 rounded-xl border p-4 text-sm text-muted-foreground">
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            COMPOSIO_API_KEY
          </code>{" "}
          is not configured.
        </section>
      ) : null}

      {/* Error */}
      {errorMessage ? (
        <section className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <div className="font-medium">Composio error</div>
          <div className="mt-1 text-muted-foreground">{errorMessage}</div>
        </section>
      ) : null}

      {!isGuest && hasComposio && !errorMessage ? (
        <>
          {/* Connected accounts */}
          <section className="mt-10">
            <div className="mb-4">
              <h2 className="font-medium text-lg">Connected Accounts</h2>
              <p className="mt-0.5 text-muted-foreground text-sm">
                Stored in Composio under this user&apos;s id.
              </p>
            </div>
            {connectedAccounts.length === 0 ? (
              <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
                No connected accounts yet. Connect a toolkit in chat.
              </div>
            ) : (
              <div className="space-y-2">
                {connectedAccounts.map((account) => (
                  <div
                    className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card px-5 py-4"
                    key={account.id}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        alt={account.toolkit?.slug ?? "toolkit"}
                        className="size-7 rounded-md object-contain"
                        src={`https://logos.composio.dev/api/${account.toolkit?.slug}`}
                      />
                      <div>
                        <div className="font-medium text-sm">
                          {account.toolkit?.name ??
                            account.toolkit?.slug ??
                            "Unknown"}
                        </div>
                        <div className="font-mono text-muted-foreground text-xs">
                          {account.id}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {account.authConfig?.mode ? (
                        <span className="rounded-md border px-2 py-0.5 text-muted-foreground text-xs">
                          {account.authConfig.mode}
                        </span>
                      ) : null}
                      {account.status ? (
                        <StatusBadge status={account.status} />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Active toolkits */}
          {connectedToolkits.length > 0 ? (
            <section className="mt-10">
              <div className="mb-4">
                <h2 className="font-medium text-lg">Active Toolkits</h2>
                <p className="mt-0.5 text-muted-foreground text-sm">
                  Toolkits with an active connection for this session.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {connectedToolkits.map((toolkit) => (
                  <div
                    className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3"
                    key={toolkit.slug}
                  >
                    {toolkit.logo ? (
                      <img
                        alt={toolkit.name}
                        className="size-7 rounded-md object-contain"
                        src={toolkit.logo}
                      />
                    ) : (
                      <div className="flex size-7 items-center justify-center rounded-md bg-muted text-xs">
                        {toolkit.name.at(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="truncate font-medium text-sm">
                        {toolkit.name}
                      </div>
                      <ConnectionBadge
                        isActive={toolkit.connection?.isActive ?? false}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* Available toolkits */}
          {availableToolkits.length > 0 ? (
            <section className="mt-10 pb-12">
              <div className="mb-4">
                <h2 className="font-medium text-lg">Available Toolkits</h2>
                <p className="mt-0.5 text-muted-foreground text-sm">
                  Connect these toolkits by asking in chat.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
                {availableToolkits.map((toolkit) => (
                  <div
                    className="flex items-center gap-3 rounded-xl border bg-card/50 px-4 py-3 opacity-60"
                    key={toolkit.slug}
                  >
                    {toolkit.logo ? (
                      <img
                        alt={toolkit.name}
                        className="size-6 rounded-md object-contain grayscale"
                        src={toolkit.logo}
                      />
                    ) : (
                      <div className="flex size-6 items-center justify-center rounded-md bg-muted text-xs">
                        {toolkit.name.at(0)}
                      </div>
                    )}
                    <span className="truncate text-sm">{toolkit.name}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-5xl px-6 py-12">
          <div className="mb-8">
            <div className="h-7 w-24 animate-pulse rounded-lg bg-muted/50" />
            <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted/30" />
          </div>
          <Skeleton />
        </main>
      }
    >
      <AdminContent />
    </Suspense>
  );
}
