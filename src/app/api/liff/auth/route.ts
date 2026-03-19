import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const { accessToken } = await request.json();

  if (!accessToken) {
    return NextResponse.json({ error: "アクセストークンが必要です" }, { status: 400 });
  }

  // LINE APIでアクセストークンを検証しプロフィール取得
  const profileRes = await fetch("https://api.line.me/v2/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!profileRes.ok) {
    return NextResponse.json({ error: "LINE認証に失敗しました" }, { status: 401 });
  }

  const profile = await profileRes.json();
  const lineUserId = profile.userId as string;
  const displayName = profile.displayName as string;
  const email = `line_${lineUserId}@line.local`;

  // 既存ユーザーをメールで検索
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find((u) => u.email === email);

  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
  } else {
    // 新規ユーザー作成
    const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { line_user_id: lineUserId, display_name: displayName },
    });
    if (error || !newUser.user) {
      return NextResponse.json({ error: "ユーザー作成に失敗しました" }, { status: 500 });
    }
    userId = newUser.user.id;
  }

  // セッション用のマジックリンクを生成
  const { data: linkData, error: linkError } =
    await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

  if (linkError || !linkData) {
    return NextResponse.json({ error: "セッション生成に失敗しました" }, { status: 500 });
  }

  // リンクからトークンハッシュを抽出
  const url = new URL(linkData.properties.hashed_token ? linkData.properties.action_link : "");
  const token_hash = url.searchParams.get("token") ?? linkData.properties.hashed_token;

  // OTP でセッションを確立
  const { data: sessionData, error: sessionError } =
    await supabaseAdmin.auth.verifyOtp({
      type: "magiclink",
      token_hash: token_hash!,
    });

  if (sessionError || !sessionData.session) {
    return NextResponse.json({ error: "セッション確立に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({
    access_token: sessionData.session.access_token,
    refresh_token: sessionData.session.refresh_token,
    user_id: userId,
    display_name: displayName,
  });
}
