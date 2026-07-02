import { schedules, tasks, logger } from "@trigger.dev/sdk/v3";
import { getDueCronJobs, updateCronJobNextRunAt } from "../lib/db/queries";
import { computeNextRunAt } from "../lib/cron/cron-utils";
import { type AgentJobPayload, runAgentJob } from "./run-agent-job";

export const cronTick = schedules.task({
  id: "cron-tick",
  cron: "* * * * *",
  maxDuration: 30,
  run: async (payload: any) => {
    const now = payload.timestamp ?? new Date();

    logger.info("Cron tick firing", { now: now.toISOString() });

    const dueJobs = await getDueCronJobs({ now });

    if (dueJobs.length === 0) {
      logger.info("No due jobs found");
      return { triggered: 0 };
    }

    logger.info(`Found ${dueJobs.length} due job(s)`, {
      jobIds: dueJobs.map((j) => j.id),
    });

    const triggered: string[] = [];
    const skipped: { id: string; reason: string }[] = [];

    for (const job of dueJobs) {
      const nextRunAt = computeNextRunAt(job.cronExpression, job.timezone, now);

      await updateCronJobNextRunAt({ id: job.id, nextRunAt });

      const jobPayload: AgentJobPayload = {
        id: job.id,
        userId: job.userId,
        cronExpression: job.cronExpression,
        timezone: job.timezone,
        prompt: job.prompt,
      };

      try {
        await tasks.trigger<typeof runAgentJob>("run-agent-job", jobPayload);
        triggered.push(job.id);
        logger.info("Triggered agent job", {
          jobId: job.id,
          nextRunAt: nextRunAt.toISOString(),
        });
      } catch (error) {
        const reason =
          error instanceof Error ? error.message : "Unknown trigger error";
        skipped.push({ id: job.id, reason });
        logger.error("Failed to trigger agent job", {
          jobId: job.id,
          error: reason,
        });
      }
    }

    return {
      triggered: triggered.length,
      triggeredJobIds: triggered,
      skipped,
    };
  },
});
