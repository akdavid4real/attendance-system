export type ReverseLocation = {
  label: string;
  source: "openstreetmap" | "coordinates";
};

type NominatimAddress = {
  amenity?: string;
  road?: string;
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
  country?: string;
};

type NominatimReverseResponse = {
  display_name?: string;
  address?: NominatimAddress;
};

export function formatCoordinates(latitude: number, longitude: number) {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

function compactAddress(address: NominatimAddress | undefined) {
  if (!address) {
    return null;
  }

  const locality = address.city ?? address.town ?? address.village;
  const parts = [
    address.amenity,
    address.road,
    address.neighbourhood ?? address.suburb,
    locality,
    address.state,
    address.country,
  ].filter(Boolean);

  return parts.length ? parts.join(", ") : null;
}

export async function reverseGeocodeLocation(
  latitude: number,
  longitude: number,
): Promise<ReverseLocation> {
  const fallback = formatCoordinates(latitude, longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { label: fallback, source: "coordinates" };
  }

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));

  try {
    const response = await fetch(url, {
      headers: {
        "Accept-Language": "en",
        "User-Agent": "AttendlyAttendanceSystem/1.0",
        Referer: "http://localhost:3000",
      },
      next: {
        revalidate: 60 * 60 * 24 * 7,
      },
    });

    if (!response.ok) {
      return { label: fallback, source: "coordinates" };
    }

    const payload = (await response.json()) as NominatimReverseResponse;
    const label = compactAddress(payload.address) ?? payload.display_name;

    return {
      label: label || fallback,
      source: label ? "openstreetmap" : "coordinates",
    };
  } catch {
    return { label: fallback, source: "coordinates" };
  }
}
