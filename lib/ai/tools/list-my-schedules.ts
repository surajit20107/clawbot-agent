import { tool } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import { getCronJobsByUserId } from "@/lib/db/queries";

type ListMySchedulesProps = {
  session: Session;
};

export const listMySchedules = ({ session }: ListMySchedulesProps) =>
  tool({
    description:
      "List all scheduled tasks belonging to the current user. Returns id, cron expression, prompt, next run time, and last run/error info.",
    inputSchema: z.object({}),
    execute: async () => {
      const jobs = await getCronJobsByUserId({ userId: session.user.id });
      return {
        schedules: jobs.map((j) => ({
          id: j.id,
          cronExpression: j.cronExpression,
          timezone: j.timezone,
          prompt: j.prompt,
          enabled: j.enabled,
          nextRunAt: j.nextRunAt.toISOString(),
          lastRunAt: j.lastRunAt?.toISOString() ?? null,
          lastError: j.lastError,
          lastOutput: j.lastOutput,
        })),
      };
    },
  });
