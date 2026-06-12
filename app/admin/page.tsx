import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { AdminBoard, type AdminAttendanceRecord } from "@/components/AdminBoard";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "attendance-selfies";

type AttendanceRow = {
  id: string;
  user_id: string;
  selfie_path: string;
  latitude: number;
  longitude: number;
  location_name: string | null;
  checked_in_at: string;
};

type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
};

async function getLiveAttendanceRecords(): Promise<AdminAttendanceRecord[]> {
  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("attendance_records")
    .select("id,user_id,selfie_path,latitude,longitude,location_name,checked_in_at")
    .order("checked_in_at", { ascending: false })
    .limit(100)
    .returns<AttendanceRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  const records = rows ?? [];
  const userIds = Array.from(new Set(records.map((record) => record.user_id)));
  const { data: profiles, error: profileError } = userIds.length
    ? await admin
        .from("profiles")
        .select("id,full_name,email")
        .in("id", userIds)
        .returns<ProfileRow[]>()
    : { data: [], error: null };

  if (profileError) {
    throw new Error(profileError.message);
  }

  const profileById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile]),
  );
  const signedUrlResult = records.length
    ? await admin.storage
        .from(BUCKET)
        .createSignedUrls(
          records.map((record) => record.selfie_path),
          60 * 60,
        )
    : { data: [], error: null };

  if (signedUrlResult.error) {
    throw new Error(signedUrlResult.error.message);
  }

  const signedUrlByPath = new Map(
    (signedUrlResult.data ?? []).map((item) => [item.path, item.signedUrl]),
  );

  return records.map((record) => {
    const profile = profileById.get(record.user_id);

    return {
      id: record.id,
      fullName: profile?.full_name || "Unknown user",
      email: profile?.email || record.user_id,
      selfieUrl: signedUrlByPath.get(record.selfie_path) ?? "",
      selfiePath: record.selfie_path,
      latitude: record.latitude,
      longitude: record.longitude,
      locationName: record.location_name ?? undefined,
      checkedInAt: record.checked_in_at,
    };
  });
}

export default async function AdminPage() {
  let records: AdminAttendanceRecord[] = [];

  if (!env.isDemoMode) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const role = user.user_metadata.role;

    if (role !== "admin") {
      redirect("/capture");
    }

    records = await getLiveAttendanceRecords();
  }

  return (
    <>
      <AppHeader />
      <main className="shell admin-page">
        <section className="admin-hero">
          <div>
            <p className="eyebrow">Admin board</p>
            <h1>Manage attendance records.</h1>
            <p className="lead">
              Review check-ins, inspect selfie proof and location, then delete old
              pictures when they are no longer needed.
            </p>
          </div>
        </section>
        <AdminBoard
          initialRecords={records}
          mode={env.isDemoMode ? "demo" : "live"}
        />
      </main>
    </>
  );
}
