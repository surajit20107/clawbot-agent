import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { getUserSoul, updateUserSoul } from "@/lib/db/queries";

const MAX_SOUL_LENGTH = 4000;

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.type === "guest") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const soul = await getUserSoul({ userId: session.user.id });
  return NextResponse.json({ soul });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.type === "guest") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { soul?: string | null };
  try {
    body = (await request.json()) as { soul?: string | null };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = body.soul;
  const next =
    raw === null || raw === undefined || (typeof raw === "string" && raw.trim() === "")
      ? null
      : String(raw).slice(0, MAX_SOUL_LENGTH);

  await updateUserSoul({ userId: session.user.id, soul: next });
  return NextResponse.json({ soul: next });
}
