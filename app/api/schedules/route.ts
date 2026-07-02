import { auth } from "@/app/(auth)/auth";
import { getCronJobsByUserId } from "@/lib/db/queries";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const jobs = await getCronJobsByUserId({ userId: session.user.id });
  return Response.json({
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
      createdAt: j.createdAt.toISOString(),
    })),
  });
}
