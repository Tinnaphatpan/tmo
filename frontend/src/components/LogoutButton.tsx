"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";

export function LogoutButton() {
  const t = useT();
  const router = useRouter();
  async function handleLogout() {
    await api.post("/auth/logout");
    router.push("/login");
    router.refresh();
  }
  return (
    <Button variant="ghost" onClick={handleLogout}>
      {t("log_out")}
    </Button>
  );
}
