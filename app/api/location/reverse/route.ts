import { NextResponse } from "next/server";
import { formatCoordinates, reverseGeocodeLocation } from "@/lib/location";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const latitude = Number(url.searchParams.get("latitude"));
  const longitude = Number(url.searchParams.get("longitude"));

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json(
      { message: "Valid latitude and longitude are required." },
      { status: 400 },
    );
  }

  const location = await reverseGeocodeLocation(latitude, longitude);

  return NextResponse.json({
    label: location.label,
    coordinates: formatCoordinates(latitude, longitude),
    source: location.source,
  });
}
