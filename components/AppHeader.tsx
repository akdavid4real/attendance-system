import Link from "next/link";
import { Camera, LayoutDashboard, LogIn, UserPlus } from "lucide-react";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions";

export async function AppHeader() {
  const user = env.isDemoMode
    ? null
    : (
        await (await createClient()).auth.getUser()
      ).data.user;
  const isAdmin = user?.user_metadata.role === "admin";

  return (
    <header className="shell topbar">
      <Link className="brand" href={isAdmin ? "/admin" : user ? "/capture" : "/login"}>
        <span className="brand-mark">
          <Camera size={20} aria-hidden="true" />
        </span>
        <span>Attendly</span>
      </Link>

      <nav className="nav-actions" aria-label="Main navigation">
        {env.isDemoMode ? (
          <>
            <Link className="ghost-button" href="/capture">
              <Camera size={18} aria-hidden="true" />
              Capture
            </Link>
            <Link className="button" href="/admin">
              <LayoutDashboard size={18} aria-hidden="true" />
              Admin
            </Link>
          </>
        ) : (
          user ? (
            <>
              {isAdmin ? (
                <Link className="ghost-button" href="/admin">
                  <LayoutDashboard size={18} aria-hidden="true" />
                  Admin
                </Link>
              ) : null}
              <form action={signOut}>
                <button className="ghost-button" type="submit">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link className="ghost-button" href="/login">
                <LogIn size={18} aria-hidden="true" />
                Login
              </Link>
              <Link className="button" href="/signup">
                <UserPlus size={18} aria-hidden="true" />
                Sign up
              </Link>
            </>
          )
        )}
      </nav>
    </header>
  );
}
