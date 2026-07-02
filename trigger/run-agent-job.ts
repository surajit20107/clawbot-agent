import { task, logger } from "@trigger.dev/sdk/v3";
import { generateText, stepCountIs, type ToolSet } from "ai";
import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";
import { DEFAULT_CHAT_MODEL } from "../lib/ai/models";
import { getLanguageModel } from "../lib/ai/providers";
import {
  updateCronJobAfterRun,
  updateCronJobNextRunAt,
} from "../lib/db/queries";
import { computeNextRunAt } from "../lib/cron/cron-utils";

export type AgentJobPayload = {
  id: string;
  userId: string;
  cronExpression: string;
  timezone: string;
  prompt: string;
};

export const runAgentJob = task({
  id: "run-agent-job",
  maxDuration: 300,
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 30000,
    factor: 2,
    randomize: true,
  },
  run: async (payload: AgentJobPayload) => {
    const { id, userId, cronExpression, timezone, prompt } = payload;

    logger.info("Starting agent job", { jobId: id, userId });

    let composioTools: ToolSet = {};

    if (process.env.COMPOSIO_API_KEY) {
      try {
        const composio = new Composio({ provider: new VercelProvider() });
        const session = await composio.create(userId);
        composioTools = (await session.tools()) as unknown as ToolSet;
        logger.info("Composio tools loaded", { jobId: id });
      } catch (error) {
        logger.warn("Composio init failed — continuing without tools", {
          jobId: id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const ranAt = new Date();

    try {
      const result = await generateText({
        model: getLanguageModel(DEFAULT_CHAT_MODEL),
        system:
          "You are a scheduled background agent. There is no human in the loop. Execute the user's instruction using your tools and return a brief summary of what you did. Do not ask clarifying questions — make reasonable assumptions.",
        prompt,
        tools: composioTools,
        stopWhen: stepCountIs(8),
      });

      const nextRunAt = computeNextRunAt(cronExpression, timezone, ranAt);

      await updateCronJobAfterRun({
        id,
        nextRunAt,
        lastRunAt: ranAt,
        lastError: null,
        lastOutput: result.text,
      });

      logger.info("Agent job completed", {
        jobId: id,
        nextRunAt: nextRunAt.toISOString(),
        outputLength: result.text.length,
      });

      return { status: "ran", output: result.text };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      const nextRunAt = computeNextRunAt(cronExpression, timezone, ranAt);

      await updateCronJobAfterRun({
        id,
        nextRunAt,
        lastRunAt: ranAt,
        lastError: errorMessage,
        lastOutput: null,
      });

      logger.error("Agent job failed", { jobId: id, error: errorMessage });

      throw error;
    }
  },
});
