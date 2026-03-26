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
    // LINE authで作成されたSupabaseユーザーのIDで記録されたエントリを探す
    const lineEmail = `line_${lineUserId}@line.local`;
    const supabaseAdmin = (await import("@supabase/supabase-js")).createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const lineAuthUser = users.find((u) => u.email === lineEmail);

    if (lineAuthUser) {
      // LINE用authユーザーのIDで記録されたエントリをWebユーザーに移行
      await db
        .update(entries)
        .set({ userId: user.id, userName: user.email ?? null })
        .where(eq(entries.userId, lineAuthUser.id));
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
