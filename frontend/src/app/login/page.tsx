"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, getApiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";

const ROLE_HOME: Record<string, string> = {
  ADMIN: "/admin",
  COMMITTEE: "/committee",
  STAFF: "/staff",
  TEAM_LEADER: "/team-leader",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { username, password });
      const callbackUrl = searchParams.get("callbackUrl");
      router.push(callbackUrl || ROLE_HOME[data.user.role] || "/");
      router.refresh();
    } catch (err) {
      setError(getApiErrorMessage(err, "เข้าสู่ระบบไม่สำเร็จ"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="card-soft w-full max-w-sm p-8 animate-slide-up">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-ink-900">TMO Grading Queue</h1>
          <p className="mt-1 text-sm text-ink-500">เข้าสู่ระบบเพื่อดำเนินการต่อ</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="mb-1 block text-sm font-medium text-ink-700">
              ชื่อผู้ใช้
            </label>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              className="touch-target w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink-900 outline-none focus:border-saed-500 focus:ring-1 focus:ring-saed-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-ink-700">
              รหัสผ่าน
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="touch-target w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink-900 outline-none focus:border-saed-500 focus:ring-1 focus:ring-saed-500"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-state-active-bg px-3 py-2 text-sm text-state-active-fg">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </Button>
        </form>

        <div className="mt-6 border-t border-line pt-4 text-center">
          <Link href="/queue" className="text-sm font-medium text-saed-600 hover:underline">
            ดูคิวทั้งหมด (ไม่ต้องเข้าสู่ระบบ)
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
