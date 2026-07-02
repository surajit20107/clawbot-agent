import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import { getCronJobsByUserId } from "@/lib/db/queries";
import { DeleteScheduleButton } from "./delete-button";

function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          className="h-20 animate-pulse rounded-xl border bg-muted/30"
          key={i}
        />
      ))}
    </div>
  );
}

async function SchedulesContent() {
  await connection();
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const jobs = await getCronJobsByUserId({ userId: session.user.id });

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Schedules</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Tasks the agent will re-run on a cron tick.
          </p>
        </div>
        <a
          className="text-muted-foreground text-sm hover:underline"
          href="/admin"
        >
          ← Composio admin
        </a>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-xl border p-8 text-center">
          <p className="text-muted-foreground text-sm">
            No schedules yet. Ask the agent in chat:
          </p>
          <p className="mt-2 font-mono text-sm">
            “Send me a Gmail summary every weekday at 9am.”
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div
              className="rounded-xl border bg-card p-5"
              key={job.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
                      {job.cronExpression}
                    </code>
                    <span className="text-muted-foreground text-xs">
                      {job.timezone}
                    </span>
                    {job.enabled ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        <span className="size-1.5 rounded-full bg-green-500" />
                        Enabled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        Disabled
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm">{job.prompt}</p>
                  <div className="mt-3 grid gap-1 text-muted-foreground text-xs sm:grid-cols-2">
                    <div>
                      Next run:{" "}
                      <span className="font-mono">
                        {job.nextRunAt.toISOString()}
                      </span>
                    </div>
                    <div>
                      Last run:{" "}
                      <span className="font-mono">
                        {job.lastRunAt?.toISOString() ?? "never"}
                      </span>
                    </div>
                  </div>
                  {job.lastError ? (
                    <div className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 font-mono text-destructive text-xs">
                      {job.lastError}
                    </div>
                  ) : null}
                  {job.lastOutput ? (
                    <details className="mt-2 rounded-md border bg-muted/30 p-2 text-xs">
                      <summary className="cursor-pointer font-medium">
                        Last output
                      </summary>
                      <pre className="mt-2 whitespace-pre-wrap font-mono text-muted-foreground">
                        {job.lastOutput}
                      </pre>
                    </details>
                  ) : null}
                  <div className="mt-2 font-mono text-muted-foreground text-xs">
                    {job.id}
                  </div>
                </div>
                <DeleteScheduleButton id={job.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

export default function SchedulesPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-5xl px-6 py-12">
          <div className="mb-8">
            <div className="h-7 w-32 animate-pulse rounded-lg bg-muted/50" />
            <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted/30" />
          </div>
          <Skeleton />
        </main>
      }
    >
      <SchedulesContent />
    </Suspense>
  );
}
