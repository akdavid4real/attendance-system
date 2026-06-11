import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { CapturePanel } from "@/components/CapturePanel";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function CapturePage() {
  const user = env.isDemoMode
    ? null
    : (
        await (await createClient()).auth.getUser()
      ).data.user;

  if (!env.isDemoMode && !user) {
    redirect("/login");
  }

  const fullName =
    env.isDemoMode
      ? "Demo User"
      : user && typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name
      : user?.email;

  return (
    <>
      <AppHeader />
      <main className="shell capture-layout">
        <section>
          <p className="eyebrow">Live check-in</p>
          <h1>Take your selfie.</h1>
          <p className="lead">
            Allow camera and location access, then submit one check-in record for
            today. Signed in as {fullName}.
          </p>
          <CapturePanel />
        </section>

        <aside className="panel" aria-labelledby="checkin-steps">
          <h2 id="checkin-steps">Check-in proof</h2>
          <p className="panel-subtitle">
            Each attendance record stores the signed-in user, the selfie path, GPS
            coordinates, and the check-in time.
          </p>
          <ul className="status-list">
            <li>
              <strong>1.</strong>
              <span>Camera permission captures the selfie.</span>
            </li>
            <li>
              <strong>2.</strong>
              <span>Location permission records latitude and longitude.</span>
            </li>
            <li>
              <strong>3.</strong>
              <span>Supabase stores the image and attendance record.</span>
            </li>
          </ul>
        </aside>
      </main>
    </>
  );
}
