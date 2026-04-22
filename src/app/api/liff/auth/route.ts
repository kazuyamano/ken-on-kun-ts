import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { userLinks } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getPassword(lineUserId: string) {
  return `line_${lineUserId}_${process.env.LIFF_PASSWORD_SECRET!}`;
}

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
    const password = getPassword(lineUserId);

    // 既存ユーザーの移行処理：サインイン失敗したらadmin APIでパスワードを強制更新
    async function signInOrMigrate(targetEmail: string, targetPassword: string) {
      const { data: signInData } = await supabaseAdmin.auth.signInWithPassword({
        email: targetEmail,
        password: targetPassword,
      });

      if (signInData?.session) return signInData;

      // サインイン失敗 → auth.usersテーブルからemailでユーザーIDを取得しパスワード強制更新
      const rows = await db.execute(
        sql`SELECT id FROM auth.users WHERE email = ${targetEmail} LIMIT 1`
      );

      if (rows.length > 0) {
        const userId = (rows[0] as { id: string }).id;
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: targetPassword,
        });
        const { data: retryData } = await supabaseAdmin.auth.signInWithPassword({
          email: targetEmail,
          password: targetPassword,
        });
        return retryData;
      }

      return null;
    }

    // 1. user_links テーブルで紐付け済みか確認
    const [link] = await db
      .select()
      .from(userLinks)
      .where(eq(userLinks.lineUserId, lineUserId))
      .limit(1);

    if (link) {
      const linkedEmail = `line_${lineUserId}@line.local`;
      const linkedPassword = getPassword(lineUserId);

      const sessionData = await signInOrMigrate(linkedEmail, linkedPassword);

      if (sessionData?.session) {
        return NextResponse.json({
          access_token: sessionData.session.access_token,
          refresh_token: sessionData.session.refresh_token,
          user_id: link.supabaseUserId,
          display_name: displayName,
          line_user_id: lineUserId,
        });
      }

      // ユーザーが存在しない場合は新規作成
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

      const { data: newSession } = await supabaseAdmin.auth.signInWithPassword({
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
    const sessionData = await signInOrMigrate(email, password);

    if (sessionData?.session) {
      return NextResponse.json({
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        user_id: sessionData.user!.id,
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
