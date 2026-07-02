import { tool } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import { deleteCronJob } from "@/lib/db/queries";

type CancelScheduleProps = {
  session: Session;
};

export const cancelSchedule = ({ session }: CancelScheduleProps) =>
  tool({
    description:
      "Cancel a previously scheduled task by its id. Use listMySchedules first if you don't know the id.",
    inputSchema: z.object({
      id: z.string().uuid().describe("The schedule id to delete."),
    }),
    execute: async ({ id }) => {
      const deleted = await deleteCronJob({ id, userId: session.user.id });
      if (!deleted) {
        return {
          error: `No schedule found with id ${id} for this user.`,
        };
      }
      return { id, deleted: true };
    },
  });
