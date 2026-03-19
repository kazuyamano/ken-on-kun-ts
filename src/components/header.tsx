"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function Header() {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="nav-header">
      <button onClick={() => router.push("/link-line")}>LINE連携</button>
      <button onClick={handleLogout}>ログアウト</button>
    </nav>
  );
}
