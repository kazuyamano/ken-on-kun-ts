import { NextResponse } from "next/server";
import { db } from "@/db";
import { entries, userLinks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { userId, displayName, temp, breathlessness, dullness, comment } =
      await request.json();

    if (!userId) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const tempNum = parseFloat(temp);
    if (isNaN(tempNum) || tempNum < 35.0 || tempNum > 41.0) {
      return NextResponse.json(
        { error: "体温は35.0〜41.0°Cの範囲で入力してください" },
        { status: 400 }
      );
    }

    // user_links で紐付け先を確認し、あればそちらのuserIdとuserNameを使用
    const lineUserId = userId;
    let actualUserId = userId;
    let actualUserName: string | null = displayName ?? null;

    const [link] = await db
      .select()
      .from(userLinks)
      .where(eq(userLinks.lineUserId, lineUserId))
      .limit(1);

    if (link) {
      actualUserId = link.supabaseUserId;
      // 紐付け先のSupabaseユーザーのemailをuserNameに使用
      const { data: { user: supabaseUser } } = await supabaseAdmin.auth.admin.getUserById(link.supabaseUserId);
      if (supabaseUser?.email) {
        actualUserName = supabaseUser.email;
      }
    }

    await db.insert(entries).values({
      userId: actualUserId,
      userName: actualUserName,
      temp: tempNum,
      breathlessness: !!breathlessness,
      dullness: !!dullness,
      comment: comment || null,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("LIFF add entry error:", e);
    return NextResponse.json(
      { error: "記録に失敗しました" },
      { status: 500 }
    );
  }
}
