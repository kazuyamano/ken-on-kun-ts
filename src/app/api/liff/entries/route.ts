import { db } from "@/db";
import { entries } from "@/db/schema";
import { inArray, desc } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { resolveUserIds } from "@/lib/resolve-user-ids";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json([], { status: 200 });
  }

  const userIds = await resolveUserIds(user);

  const rows = await db
    .select()
    .from(entries)
    .where(inArray(entries.userId, userIds))
    .orderBy(desc(entries.createdAt));

  return NextResponse.json(rows);
}
