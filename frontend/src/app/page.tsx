import { redirect } from "next/navigation";
import { getSession, homePathForRole } from "@/lib/session";

/**
 * Entry point: the login page. A visitor who still holds a live session goes
 * straight to their own area instead (a stale role in the cookie is corrected
 * by that area's layout, see `requireRole`). The public queue board stays
 * reachable without logging in at /queue.
 */
export default async function RootPage() {
  const session = await getSession();
  redirect(session ? homePathForRole(session.role) : "/login");
}
