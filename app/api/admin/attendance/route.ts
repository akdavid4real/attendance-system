import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "attendance-selfies";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return !error && user?.user_metadata.role === "admin";
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: "Admin access is required." }, { status: 403 });
  }

  const payload = (await request.json()) as { id?: string };

  if (!payload.id) {
    return NextResponse.json({ message: "Attendance record ID is required." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: record, error: recordError } = await admin
    .from("attendance_records")
    .select("id,selfie_path")
    .eq("id", payload.id)
    .maybeSingle();

  if (recordError) {
    return NextResponse.json({ message: recordError.message }, { status: 500 });
  }

  if (!record) {
    return NextResponse.json({ message: "Attendance record was not found." }, { status: 404 });
  }

  const { error: deleteError } = await admin
    .from("attendance_records")
    .delete()
    .eq("id", record.id);

  if (deleteError) {
    return NextResponse.json({ message: deleteError.message }, { status: 500 });
  }

  const { error: storageError } = await admin.storage
    .from(BUCKET)
    .remove([record.selfie_path]);

  if (storageError) {
    return NextResponse.json({ message: storageError.message }, { status: 500 });
  }

  return NextResponse.json({ deletedId: record.id });
}
