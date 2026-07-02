import { tool } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import { computeNextRunAt, validateCronExpression } from "@/lib/cron/cron-utils";
import { createCronJob } from "@/lib/db/queries";

type ScheduleTaskProps = {
  session: Session;
};

export const scheduleTask = ({ session }: ScheduleTaskProps) =>
  tool({
    description:
      "Schedule a task to run automatically on a recurring schedule. The agent will re-run with the given prompt at every cron tick. Use 5-field cron expressions (minute hour day-of-month month day-of-week). Examples: '0 9 * * *' = 9am daily, '0 9 * * 1-5' = 9am weekdays, '*/15 * * * *' = every 15 minutes.",
    inputSchema: z.object({
      cronExpression: z
        .string()
        .describe("Standard 5-field cron expression in the given timezone."),
      prompt: z
        .string()
        .describe(
          "The instruction to re-run when the schedule fires. Be explicit and self-contained — the cron has no chat history."
        ),
      timezone: z
        .string()
        .default("UTC")
        .describe(
          "IANA timezone (e.g. 'America/Los_Angeles'). Defaults to UTC."
        ),
    }),
    execute: async ({ cronExpression, prompt, timezone }) => {
      if (session.user.type === "guest") {
        return {
          error:
            "Guest users cannot schedule tasks. Sign up for a real account first.",
        };
      }

      const validation = validateCronExpression(cronExpression, timezone);
      if (!validation.valid) {
        return { error: `Invalid cron expression: ${validation.error}` };
      }

      const nextRunAt = computeNextRunAt(cronExpression, timezone);

      const job = await createCronJob({
        userId: session.user.id,
        cronExpression,
        timezone,
        prompt,
        nextRunAt,
      });

      return {
        id: job.id,
        cronExpression: job.cronExpression,
        timezone: job.timezone,
        prompt: job.prompt,
        nextRunAt: job.nextRunAt.toISOString(),
      };
    },
  });
