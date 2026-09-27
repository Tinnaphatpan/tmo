"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, getApiErrorMessage } from "@/lib/api-client";
import { useT } from "@/lib/i18n";
import { LocaleSwitcher } from "@/lib/i18n";
import { SchoolLogo, SCHOOL_LOGO_CODES } from "@/components/SchoolLogo";

/** [left %, top %, size px, rotate deg] — hand-placed around the edges, clear of the centred card. */
const LOGO_SPOTS: Array<[number, number, number, number]> = [
  [4, 8, 84, -8],
  [20, 4, 60, 6],
  [38, 3, 48, -4],
  [60, 5, 56, 9],
  [78, 3, 72, -6],
  [92, 12, 60, 7],
  [7, 34, 56, 5],
  [90, 38, 88, -9],
  [3, 60, 72, -5],
  [93, 63, 52, 6],
  [14, 82, 88, 8],
  [30, 90, 52, -7],
  [50, 92, 64, 4],
  [68, 88, 56, -6],
  [84, 84, 84, 7],
  [22, 56, 44, -10],
];
import { Button } from "@/components/ui/Button";

const ROLE_HOME: Record<string, string> = {
  ADMIN: "/admin",
  COMMITTEE: "/committee",
  STAFF: "/staff",
  TEAM_LEADER: "/team-leader",
};

function LoginForm() {
  const t = useT();
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
      setError(getApiErrorMessage(err, t("sign_in_failed")));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-bg flex min-h-dvh items-center justify-center px-4 py-10">
      <div aria-hidden className="login-bg__photo" />
      <div aria-hidden className="login-bg__overlay" />
      <div aria-hidden className="login-bg__pattern" />
      <div aria-hidden className="login-bg__logos">
        {SCHOOL_LOGO_CODES.map((code, i) => {
          const [left, top, size, rot] = LOGO_SPOTS[i % LOGO_SPOTS.length];
          return (
            <span
              key={code}
              className="login-bg__logo"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                rotate: `${rot}deg`,
                animationDelay: `${-(i * 1.7)}s`,
              }}
            >
              <SchoolLogo code={code} size={size} />
            </span>
          );
        })}
      </div>
      <div className="absolute right-4 top-4 z-10">
        <LocaleSwitcher tone="dark" />
      </div>
      <div className="card-soft animate-slide-up relative w-full max-w-sm bg-white p-8 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.5)]">
        <div className="mb-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon.png"
            alt=""
            width={80}
            height={80}
            className="mx-auto mb-4 h-20 w-20 rounded-full object-contain"
          />
          <h1 className="text-xl font-bold tracking-tight text-ink-900">
            TMO Grading Queue
          </h1>
          <p className="mt-0.5 text-xs tracking-wide text-ink-300">
            King Mongkut&apos;s University of Technology North Bangkok
          </p>
          <p className="mt-3 text-sm text-ink-500">
            {t("sign_in_to_continue")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="mb-1 block text-sm font-medium text-ink-700"
            >
              {t("username")}
            </label>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              className="touch-target w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-ink-900"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-ink-700"
            >
              {t("password")}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="touch-target w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-ink-900"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-state-active-bg px-3 py-2 text-sm text-state-active-fg">
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="crimson"
            disabled={loading}
            className="w-full"
          >
            {loading ? t("signing_in") : t("sign_in")}
          </Button>
        </form>

        <div className="mt-6 border-t border-line pt-4 text-center">
          <Link
            href="/queue"
            className="text-sm font-medium text-saed-600 hover:underline"
          >
            {t("view_the_public_queue_no_sign_in")}
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
