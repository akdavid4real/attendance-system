import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { reverseGeocodeLocation } from "@/lib/location";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "attendance-selfies";
const LAGOS_UTC_OFFSET_HOURS = 1;

function getLagosDayBounds(now: Date) {
  const lagosNow = new Date(now.getTime() + LAGOS_UTC_OFFSET_HOURS * 60 * 60 * 1000);
  const lagosDate = lagosNow.toISOString().slice(0, 10);
  const start = new Date(`${lagosDate}T00:00:00+01:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

export async function POST(request: Request) {
  if (env.isDemoMode) {
    const formData = await request.formData();
    const selfie = formData.get("selfie");
    const latitude = Number(formData.get("latitude"));
    const longitude = Number(formData.get("longitude"));
    const locationName = formData.get("locationName");

    if (!(selfie instanceof File)) {
      return NextResponse.json({ message: "Selfie image is required." }, { status: 400 });
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json(
        { message: "Valid latitude and longitude are required." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      message: "Check in successful",
      selfiePath: "demo/selfie.jpg",
      locationName: typeof locationName === "string" ? locationName : undefined,
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ message: "You must login first." }, { status: 401 });
  }

  const formData = await request.formData();
  const selfie = formData.get("selfie");
  const latitude = Number(formData.get("latitude"));
  const longitude = Number(formData.get("longitude"));
  const submittedLocationName = formData.get("locationName");

  if (!(selfie instanceof File)) {
    return NextResponse.json({ message: "Selfie image is required." }, { status: 400 });
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json(
      { message: "Valid latitude and longitude are required." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const now = new Date();
  const { startIso, endIso } = getLagosDayBounds(now);
  const { data: existingCheckIn, error: existingCheckInError } = await admin
    .from("attendance_records")
    .select("id")
    .eq("user_id", user.id)
    .gte("checked_in_at", startIso)
    .lt("checked_in_at", endIso)
    .maybeSingle();

  if (existingCheckInError) {
    return NextResponse.json({ message: existingCheckInError.message }, { status: 500 });
  }

  if (existingCheckIn) {
    return NextResponse.json(
      { message: "You have already checked in today." },
      { status: 409 },
    );
  }

  const safeTimestamp = now.toISOString().replace(/[:.]/g, "-");
  const selfiePath = `${user.id}/${safeTimestamp}.jpg`;
  const bytes = await selfie.arrayBuffer();
  const resolvedLocation =
    typeof submittedLocationName === "string" && submittedLocationName.trim()
      ? submittedLocationName.trim()
      : (await reverseGeocodeLocation(latitude, longitude)).label;

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(selfiePath, bytes, {
      contentType: selfie.type || "image/jpeg",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ message: uploadError.message }, { status: 500 });
  }

  const { error: insertError } = await admin.from("attendance_records").insert({
    user_id: user.id,
    selfie_path: selfiePath,
    latitude,
    longitude,
    location_name: resolvedLocation,
  });

  if (insertError) {
    await admin.storage.from(BUCKET).remove([selfiePath]);
    const duplicateCheckIn =
      insertError.code === "23505" &&
      insertError.message.includes("attendance_records_user_id_lagos_day_key");

    return NextResponse.json(
      {
        message: duplicateCheckIn
          ? "You have already checked in today."
          : insertError.message,
      },
      { status: duplicateCheckIn ? 409 : 500 },
    );
  }

  return NextResponse.json({
    message: "Check in successful",
    selfiePath,
    locationName: resolvedLocation,
  });
}
