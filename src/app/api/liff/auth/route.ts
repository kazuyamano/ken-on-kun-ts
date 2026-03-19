import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

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
    const email = `line_${lineUserId}@line.local`;
    const password = `line_${lineUserId}_${process.env.SUPABASE_SERVICE_ROLE_KEY!.slice(-8)}`;

    // 既存ユーザーでサインインを試みる
    const { data: signInData, error: signInError } =
      await supabaseAdmin.auth.signInWithPassword({ email, password });

    if (signInData?.session) {
      return NextResponse.json({
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
        user_id: signInData.user!.id,
        display_name: displayName,
      });
    }

    // ユーザーが存在しない場合は新規作成
    console.log("Sign in failed, creating new user:", signInError?.message);

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

    // 作成後にサインイン
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
    });
  } catch (e) {
    console.error("LIFF auth error:", e);
    return NextResponse.json(
      { error: "認証処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
