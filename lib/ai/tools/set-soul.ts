import { tool } from "ai";
import { z } from "zod";
import { updateUserSoul } from "@/lib/db/queries";

const MAX_SOUL_LENGTH = 4000;

type SetSoulProps = {
  userId: string;
};

export const setSoul = ({ userId }: SetSoulProps) =>
  tool({
    description:
      "Persist the agent's identity (the 'soul') for this user. Call exactly once during first-time onboarding after gathering enough info, OR immediately with default content if the user wants to skip. Markdown is supported. Replaces any previous soul.",
    inputSchema: z.object({
      soul: z
        .string()
        .min(20)
        .max(MAX_SOUL_LENGTH)
        .describe(
          "A markdown block (~200-500 words) defining the agent's identity, voice, and rules. Should include sections like '## Who You Are', '## Communication Style', and any personality traits or boundaries the user specified. Use the default soul as a baseline if the user didn't customize."
        ),
    }),
    execute: async ({ soul }) => {
      await updateUserSoul({ userId, soul });
      return { ok: true, charsStored: soul.length };
    },
  });
