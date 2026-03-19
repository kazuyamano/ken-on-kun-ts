"use server";

import { db } from "@/db";
import { entries } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function addEntry(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "ログインが必要です" };
  }

  const temp = parseFloat(formData.get("temp") as string);
  if (isNaN(temp) || temp < 35.0 || temp > 41.0) {
    return { error: "体温は35.0〜41.0°Cの範囲で入力してください" };
  }

  try {
    await db.insert(entries).values({
      userId: user.id,
      userName: user.email ?? user.user_metadata?.display_name ?? null,
      temp,
      breathlessness: formData.get("breathlessness") === "on",
      dullness: formData.get("dullness") === "on",
      comment: (formData.get("comment") as string) || null,
    });
  } catch (e) {
    console.error("DB insert error:", e);
    return { error: "記録に失敗しました。もう一度お試しください。" };
  }

  revalidatePath("/");
  revalidatePath("/history");
  return { success: true };
}

export async function getEntries() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  return db
    .select()
    .from(entries)
    .where(eq(entries.userId, user.id))
    .orderBy(desc(entries.createdAt));
}
