"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";

export function LogoutButton() {
  const router = useRouter();
  async function handleLogout() {
    await api.post("/auth/logout");
    router.push("/login");
    router.refresh();
  }
  return (
    <Button variant="ghost" onClick={handleLogout}>
      ออกจากระบบ
    </Button>
  );
}
