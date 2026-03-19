import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { userLinks } from "@/db/schema";
import { eq } from "drizzle-orm";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { accessToken } = await request.json();

    if (!accessToken) {
      return NextResponse.json(
        { error: "アクセストークンが必要です" },
        { status: 400 }
      );
    }

    // LINE APIでアクセストークンを検証しプロフィール取得
    const profileRes = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileRes.ok) {
      console.error("LINE profile fetch failed:", profileRes.status);
      return NextResponse.json(
        { error: "LINE認証に失敗しました" },
        { status: 401 }
      );
    }

    const profile = await profileRes.json();
    const lineUserId = profile.userId as string;
    const displayName = profile.displayName as string;

    // 1. user_links テーブルで紐付け済みか確認
    const [link] = await db
      .select()
      .from(userLinks)
      .where(eq(userLinks.lineUserId, lineUserId))
      .limit(1);

    if (link) {
      // 紐付け済み → 既存のSupabaseユーザーでセッション発行
      const linkedEmail = `line_${lineUserId}@line.local`;
      const linkedPassword = `line_${lineUserId}_${process.env.SUPABASE_SERVICE_ROLE_KEY!.slice(-8)}`;

      // まずサインインを試みる
      const { data: signInData } =
        await supabaseAdmin.auth.signInWithPassword({
          email: linkedEmail,
          password: linkedPassword,
        });

      if (signInData?.session) {
        return NextResponse.json({
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
          user_id: link.supabaseUserId,
          display_name: displayName,
        line_user_id: lineUserId,
        });
      }

      // LINE用の認証ユーザーがまだ無い場合は作成し、entriesを移行
      const { data: newUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email: linkedEmail,
          password: linkedPassword,
          email_confirm: true,
          user_metadata: { line_user_id: lineUserId, display_name: displayName },
        });

      if (createError || !newUser.user) {
        console.error("Linked user creation failed:", createError);
        return NextResponse.json(
          { error: "ユーザー作成に失敗しました" },
          { status: 500 }
        );
      }

      const { data: newSession } =
        await supabaseAdmin.auth.signInWithPassword({
          email: linkedEmail,
          password: linkedPassword,
        });

      if (!newSession?.session) {
        return NextResponse.json(
          { error: "セッション生成に失敗しました" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        access_token: newSession.session.access_token,
        refresh_token: newSession.session.refresh_token,
        user_id: link.supabaseUserId,
        display_name: displayName,
        line_user_id: lineUserId,
      });
    }

    // 2. 紐付けなし → 従来通りLINE専用ユーザーでサインイン/作成
    const email = `line_${lineUserId}@line.local`;
    const password = `line_${lineUserId}_${process.env.SUPABASE_SERVICE_ROLE_KEY!.slice(-8)}`;

    const { data: signInData } =
      await supabaseAdmin.auth.signInWithPassword({ email, password });

    if (signInData?.session) {
      return NextResponse.json({
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
        user_id: signInData.user!.id,
        display_name: displayName,
        line_user_id: lineUserId,
      });
    }

    // 新規作成
    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { line_user_id: lineUserId, display_name: displayName },
      });

    if (createError || !newUser.user) {
      console.error("User creation failed:", createError);
      return NextResponse.json(
        { error: "ユーザー作成に失敗しました" },
        { status: 500 }
      );
    }

    const { data: newSession, error: newSignInError } =
      await supabaseAdmin.auth.signInWithPassword({ email, password });

    if (newSignInError || !newSession.session) {
      console.error("Sign in after create failed:", newSignInError);
      return NextResponse.json(
        { error: "セッション生成に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      access_token: newSession.session.access_token,
      refresh_token: newSession.session.refresh_token,
      user_id: newUser.user.id,
      display_name: displayName,
        line_user_id: lineUserId,
    });
  } catch (e) {
    console.error("LIFF auth error:", e);
    return NextResponse.json(
      { error: "認証処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
