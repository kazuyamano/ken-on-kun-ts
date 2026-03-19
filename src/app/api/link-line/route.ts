import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { userLinks, entries } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const { accessToken } = await request.json();

    // 現在ログイン中のSupabaseユーザーを確認
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "ログインが必要です" },
        { status: 401 }
      );
    }

    // LINEアクセストークンでプロフィール取得
    const profileRes = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileRes.ok) {
      return NextResponse.json(
        { error: "LINE認証に失敗しました" },
        { status: 401 }
      );
    }

    const profile = await profileRes.json();
    const lineUserId = profile.userId as string;

    // 既に紐付け済みか確認
    const [existing] = await db
      .select()
      .from(userLinks)
      .where(eq(userLinks.lineUserId, lineUserId))
      .limit(1);

    if (existing) {
      if (existing.supabaseUserId === user.id) {
        return NextResponse.json({ message: "既に連携済みです" });
      }
      return NextResponse.json(
        { error: "このLINEアカウントは別のユーザーに連携されています" },
        { status: 409 }
      );
    }

    // 紐付けを作成
    await db.insert(userLinks).values({
      supabaseUserId: user.id,
      lineUserId,
    });

    // LINE専用ユーザーで記録済みのエントリがあれば、現在のユーザーに移行
    const lineEmail = `line_${lineUserId}@line.local`;
    const lineEntries = await db
      .select()
      .from(entries)
      .where(eq(entries.userName, lineEmail))
      .limit(1);

    if (lineEntries.length > 0) {
      await db
        .update(entries)
        .set({ userId: user.id })
        .where(eq(entries.userId, lineEntries[0].userId));
    }

    return NextResponse.json({
      message: "LINE連携が完了しました",
      lineDisplayName: profile.displayName,
    });
  } catch (e) {
    console.error("Link LINE error:", e);
    return NextResponse.json(
      { error: "連携処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
