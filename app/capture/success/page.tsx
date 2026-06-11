import Link from "next/link";
import { CheckCircle2, Sparkles } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function CheckInSuccessPage() {
  const user = env.isDemoMode
    ? null
    : (
        await (await createClient()).auth.getUser()
      ).data.user;
  const isAdmin = env.isDemoMode || user?.user_metadata.role === "admin";

  const fullName =
    env.isDemoMode
      ? "Demo User"
      : user && typeof user.user_metadata.full_name === "string"
        ? user.user_metadata.full_name
        : user?.email ?? "there";

  return (
    <>
      <AppHeader />
      <main className="shell success-layout">
        <section className="success-card" aria-labelledby="success-heading">
          <div className="success-burst" aria-hidden="true">
            <span className="success-ring ring-one" />
            <span className="success-ring ring-two" />
            <span className="success-ring ring-three" />
            <div className="success-icon">
              <CheckCircle2 size={54} />
            </div>
          </div>

          <p className="eyebrow">Check-in complete</p>
          <h1 id="success-heading">Attendance recorded successfully.</h1>
          <p className="lead success-lead">
            {fullName}, your selfie and live location have been submitted. You can
            return to the capture page whenever you need to check in again.
          </p>

          <div className="success-note">
            <Sparkles size={18} aria-hidden="true" />
            <span>Your attendance proof is now stored in Supabase.</span>
          </div>

          <div className="success-actions">
            <Link className="button" href="/capture">
              Check in again
            </Link>
            {isAdmin ? (
              <Link className="ghost-button" href="/admin">
                Open admin
              </Link>
            ) : null}
          </div>
        </section>
      </main>
    </>
  );
}
