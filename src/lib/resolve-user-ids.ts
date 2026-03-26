import { db } from "@/db";
import { userLinks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 認証ユーザーに紐付くすべてのuserIdを返す。
 * - LINE連携前: 自分のIDのみ
 * - LINE連携後: WebのsupabaseUserId + LINE authユーザーのID
 */
export async function resolveUserIds(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}): Promise<string[]> {
  const idSet = new Set<string>([user.id]);

  // ケース1: LINEユーザー（user_metadataにline_user_idがある）→ 紐付け先のWebユーザーIDを追加
  const lineUserId = user.user_metadata?.line_user_id as string | undefined;
  if (lineUserId) {
    const [link] = await db
      .select()
      .from(userLinks)
      .where(eq(userLinks.lineUserId, lineUserId))
      .limit(1);

    if (link) {
      idSet.add(link.supabaseUserId);
      await addLineAuthUserId(idSet, link.lineUserId);
    }
    return [...idSet];
  }

  // ケース2: Webユーザー → 紐付いたLINEユーザーのIDを探す
  const [link] = await db
    .select()
    .from(userLinks)
    .where(eq(userLinks.supabaseUserId, user.id))
    .limit(1);

  if (link) {
    await addLineAuthUserId(idSet, link.lineUserId);
  }

  return [...idSet];
}

/**
 * LINE user IDに関連するIDをすべて収集する。
 * - lineUserId自体
 * - line_{lineUserId}@line.local で作成されたSupabase authユーザーのID
 */
async function addLineAuthUserId(
  idSet: Set<string>,
  lineUserId: string
): Promise<void> {
  // lineUserId自体がentriesに入っている場合をカバー
  idSet.add(lineUserId);

  // Supabase admin API (service_role) でLINE authユーザーを検索
  const lineEmail = `line_${lineUserId.toLowerCase()}@line.local`;
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const lineAuthUser = users.find((u) => u.email === lineEmail);
  if (lineAuthUser) {
    idSet.add(lineAuthUser.id);
  }
}
