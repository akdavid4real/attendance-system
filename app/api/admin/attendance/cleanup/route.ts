import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "attendance-selfies";

type AttendanceCleanupRow = {
  id: string;
  selfie_path: string;
};

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return !error && user?.user_metadata.role === "admin";
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: "Admin access is required." }, { status: 403 });
  }

  const payload = (await request.json()) as { retentionDays?: number };
  const retentionDays = Number(payload.retentionDays);

  if (!Number.isFinite(retentionDays) || retentionDays < 1) {
    return NextResponse.json({ message: "Retention days must be at least 1." }, { status: 400 });
  }

  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const admin = createAdminClient();
  const { data: records, error: recordsError } = await admin
    .from("attendance_records")
    .select("id,selfie_path")
    .lt("checked_in_at", cutoff.toISOString())
    .returns<AttendanceCleanupRow[]>();

  if (recordsError) {
    return NextResponse.json({ message: recordsError.message }, { status: 500 });
  }

  if (!records?.length) {
    return NextResponse.json({ deletedIds: [] });
  }

  const { error: deleteError } = await admin
    .from("attendance_records")
    .delete()
    .in(
      "id",
      records.map((record) => record.id),
    );

  if (deleteError) {
    return NextResponse.json({ message: deleteError.message }, { status: 500 });
  }

  const { error: storageError } = await admin.storage
    .from(BUCKET)
    .remove(records.map((record) => record.selfie_path));

  if (storageError) {
    return NextResponse.json({ message: storageError.message }, { status: 500 });
  }

  return NextResponse.json({
    deletedIds: records.map((record) => record.id),
  });
}
