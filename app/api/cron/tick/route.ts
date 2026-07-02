import { generateText, stepCountIs, type ToolSet } from "ai";
import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";
import { computeNextRunAt } from "@/lib/cron/cron-utils";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { getLanguageModel } from "@/lib/ai/providers";
import {
  getDueCronJobs,
  updateCronJobAfterRun,
} from "@/lib/db/queries";

export const maxDuration = 60;

type CronResult = {
  id: string;
  status: "ran" | "errored" | "skipped";
  error?: string;
  output?: string;
};

function isAuthorized(request: Request): boolean {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

async function runJob(job: {
  id: string;
  userId: string;
  cronExpression: string;
  timezone: string;
  prompt: string;
}): Promise<CronResult> {
  let composioTools: ToolSet = {};

  if (process.env.COMPOSIO_API_KEY) {
    try {
      const composio = new Composio({ provider: new VercelProvider() });
      const session = await composio.create(job.userId);
      composioTools = (await session.tools()) as unknown as ToolSet;
    } catch (error) {
      console.error(`[cron ${job.id}] Composio init failed:`, error);
    }
  }

  try {
    const result = await generateText({
      model: getLanguageModel(DEFAULT_CHAT_MODEL),
      system:
        "You are a scheduled background agent. There is no human in the loop. Execute the user's instruction using your tools and return a brief summary of what you did. Do not ask clarifying questions — make reasonable assumptions.",
      prompt: job.prompt,
      tools: composioTools,
      stopWhen: stepCountIs(8),
    });
    return { id: job.id, status: "ran", output: result.text };
  } catch (error) {
    return {
      id: job.id,
      status: "errored",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const due = await getDueCronJobs({ now });

  if (due.length === 0) {
    return Response.json({ ran: 0, results: [], now: now.toISOString() });
  }

  const results: CronResult[] = [];

  for (const job of due) {
    const result = await runJob(job);
    const ranAt = new Date();
    const nextRunAt = computeNextRunAt(
      job.cronExpression,
      job.timezone,
      ranAt
    );
    await updateCronJobAfterRun({
      id: job.id,
      nextRunAt,
      lastRunAt: ranAt,
      lastError: result.status === "errored" ? (result.error ?? null) : null,
      lastOutput: result.output ?? null,
    });
    results.push(result);
    console.log(
      `[cron ${job.id}] ${result.status} — next run ${nextRunAt.toISOString()}`
    );
  }

  return Response.json({
    ran: results.length,
    results,
    now: now.toISOString(),
  });
}
