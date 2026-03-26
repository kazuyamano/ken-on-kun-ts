import { db } from "@/db";
import { entries, userLinks } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json([], { status: 200 });
  }

  // user_metadataにline_user_idがあれば、紐付け先のsupabaseUserIdで検索
  const lineUserId = user.user_metadata?.line_user_id as string | undefined;
  let queryUserId = user.id;

  if (lineUserId) {
    const [link] = await db
      .select()
      .from(userLinks)
      .where(eq(userLinks.lineUserId, lineUserId))
      .limit(1);

    if (link) {
      queryUserId = link.supabaseUserId;
    }
  }

  const rows = await db
    .select()
    .from(entries)
    .where(eq(entries.userId, queryUserId))
    .orderBy(desc(entries.createdAt));

  return NextResponse.json(rows);
}
