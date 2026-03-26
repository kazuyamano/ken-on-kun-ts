import { db } from "@/db";
import { userLinks } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * 認証ユーザーに紐付くすべてのuserIdを返す。
 * - LINE連携前: 自分のIDのみ
 * - LINE連携後: WebのsupabaseUserId + LINEのauthユーザーID（両方）
 */
export async function resolveUserIds(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}): Promise<string[]> {
  const ids = [user.id];

  // ケース1: LINEユーザー（user_metadataにline_user_idがある）→ 紐付け先のWebユーザーIDを追加
  const lineUserId = user.user_metadata?.line_user_id as string | undefined;
  if (lineUserId) {
    const [link] = await db
      .select()
      .from(userLinks)
      .where(eq(userLinks.lineUserId, lineUserId))
      .limit(1);

    if (link && link.supabaseUserId !== user.id) {
      ids.push(link.supabaseUserId);
    }
    return ids;
  }

  // ケース2: Webユーザー → 紐付いたLINE authユーザーのIDを探す
  const [link] = await db
    .select()
    .from(userLinks)
    .where(eq(userLinks.supabaseUserId, user.id))
    .limit(1);

  if (link) {
    // LINE authユーザーのIDを取得するため、line_user_idからemailを逆引き
    // LINE authユーザーのemailは line_{lineUserId}@line.local
    // そのSupabase auth userのIDをentriesのuserIdとして使っている可能性がある
    // → entriesテーブルにlineUserId自体が入っている場合もカバー
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const lineEmail = `line_${link.lineUserId}@line.local`;
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const lineAuthUser = users.find((u) => u.email === lineEmail);
    if (lineAuthUser && lineAuthUser.id !== user.id) {
      ids.push(lineAuthUser.id);
    }
    // lineUserId自体がentriesに入っている場合もカバー
    if (!ids.includes(link.lineUserId)) {
      ids.push(link.lineUserId);
    }
  }

  return ids;
}
