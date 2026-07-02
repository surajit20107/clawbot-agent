import { auth } from "@/app/(auth)/auth";
import { deleteCronJob } from "@/lib/db/queries";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const deleted = await deleteCronJob({ id, userId: session.user.id });
  if (!deleted) {
    return new Response("Not found", { status: 404 });
  }
  return Response.json({ id, deleted: true });
}
