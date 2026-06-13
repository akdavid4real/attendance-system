import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { AdminBoard, type AdminAttendanceRecord } from "@/components/AdminBoard";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "attendance-selfies";
const PAGE_SIZE = 12;
const LAGOS_UTC_OFFSET_HOURS = 1;

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

type LiveAttendanceResult = {
  records: AdminAttendanceRecord[];
  totalRecords: number;
  selectedDay: string;
  page: number;
  totalPages: number;
  previousDay: string;
  nextDay: string;
};

function getLagosDateString(now = new Date()) {
  const lagosNow = new Date(now.getTime() + LAGOS_UTC_OFFSET_HOURS * 60 * 60 * 1000);
  return lagosNow.toISOString().slice(0, 10);
}

function normalizeSelectedDay(value: string | undefined) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return getLagosDateString();
}

function getDayBounds(day: string) {
  const start = new Date(`${day}T00:00:00+01:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

function shiftDay(day: string, amount: number) {
  const start = new Date(`${day}T00:00:00+01:00`);
  start.setUTCDate(start.getUTCDate() + amount);
  return start.toISOString().slice(0, 10);
}

async function getLiveAttendanceRecords(
  requestedDay: string | undefined,
  requestedPage: number,
): Promise<LiveAttendanceResult> {
  const admin = createAdminClient();
  const selectedDay = normalizeSelectedDay(requestedDay);
  const { startIso, endIso } = getDayBounds(selectedDay);
  const { count, error: countError } = await admin
    .from("attendance_records")
    .select("id", { count: "exact", head: true })
    .gte("checked_in_at", startIso)
    .lt("checked_in_at", endIso);

  if (countError) {
    throw new Error(countError.message);
  }

  const totalRecords = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));
  const page = Math.min(Math.max(requestedPage, 1), totalPages);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data: rows, error } = await admin
    .from("attendance_records")
    .select("id,user_id,selfie_path,latitude,longitude,location_name,checked_in_at")
    .gte("checked_in_at", startIso)
    .lt("checked_in_at", endIso)
    .order("checked_in_at", { ascending: false })
    .range(from, to)
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

  return {
    records: records.map((record) => {
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
    }),
    totalRecords,
    selectedDay,
    page,
    totalPages,
    previousDay: shiftDay(selectedDay, -1),
    nextDay: shiftDay(selectedDay, 1),
  };
}

type AdminPageProps = {
  searchParams?: Promise<{
    day?: string | string[];
    page?: string | string[];
  }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  let records: AdminAttendanceRecord[] = [];
  let selectedDay = getLagosDateString();
  let page = 1;
  let totalPages = 1;
  let totalRecords = 0;
  let previousDay = shiftDay(selectedDay, -1);
  let nextDay = shiftDay(selectedDay, 1);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedDay = Array.isArray(resolvedSearchParams?.day)
    ? resolvedSearchParams.day[0]
    : resolvedSearchParams?.day;
  const requestedPageValue = Array.isArray(resolvedSearchParams?.page)
    ? resolvedSearchParams.page[0]
    : resolvedSearchParams?.page;
  const requestedPage = Math.max(1, Number.parseInt(requestedPageValue ?? "1", 10) || 1);

  if (!env.isDemoMode) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    if (user.user_metadata.role !== "admin") {
      redirect("/capture");
    }

    const liveResult = await getLiveAttendanceRecords(requestedDay, requestedPage);
    records = liveResult.records;
    selectedDay = liveResult.selectedDay;
    page = liveResult.page;
    totalPages = liveResult.totalPages;
    totalRecords = liveResult.totalRecords;
    previousDay = liveResult.previousDay;
    nextDay = liveResult.nextDay;
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
              Review check-ins by day, inspect selfie proof and location, then
              delete old pictures when they are no longer needed.
            </p>
          </div>
        </section>
        <AdminBoard
          initialRecords={records}
          mode={env.isDemoMode ? "demo" : "live"}
          nextDay={nextDay}
          page={page}
          previousDay={previousDay}
          selectedDay={selectedDay}
          totalPages={totalPages}
          totalRecords={totalRecords}
        />
      </main>
    </>
  );
}
