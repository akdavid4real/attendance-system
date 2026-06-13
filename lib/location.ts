export type ReverseLocation = {
  label: string;
  source: "openstreetmap" | "coordinates";
};

type NominatimAddress = {
  amenity?: string;
  attraction?: string;
  building?: string;
  city?: string;
  city_district?: string;
  country?: string;
  county?: string;
  hamlet?: string;
  house?: string;
  house_number?: string;
  leisure?: string;
  neighbourhood?: string;
  office?: string;
  postcode?: string;
  quarter?: string;
  residential?: string;
  road?: string;
  shop?: string;
  state?: string;
  suburb?: string;
  tourism?: string;
  town?: string;
  village?: string;
};

type NominatimReverseResponse = {
  display_name?: string;
  address?: NominatimAddress;
};

export function formatCoordinates(latitude: number, longitude: number) {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

function uniqueParts(parts: Array<string | undefined | null>) {
  const seen = new Set<string>();

  return parts.filter((part): part is string => {
    if (!part) {
      return false;
    }

    const normalized = part.trim();

    if (!normalized) {
      return false;
    }

    const key = normalized.toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function compactDisplayName(displayName: string | undefined) {
  if (!displayName) {
    return null;
  }

  const parts = uniqueParts(
    displayName
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part && !/^\d{4,}$/.test(part)),
  );

  return parts.length ? parts.slice(0, 5).join(", ") : null;
}

function compactAddress(address: NominatimAddress | undefined) {
  if (!address) {
    return null;
  }

  const street = [address.house_number, address.road].filter(Boolean).join(" ").trim();
  const locality =
    address.city_district ??
    address.city ??
    address.town ??
    address.village ??
    address.county;
  const parts = uniqueParts([
    address.amenity ??
      address.shop ??
      address.office ??
      address.building ??
      address.house ??
      address.tourism ??
      address.leisure ??
      address.attraction,
    street || undefined,
    address.neighbourhood ??
      address.suburb ??
      address.quarter ??
      address.residential ??
      address.hamlet,
    locality,
    address.state,
  ]);

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
    const label =
      compactDisplayName(payload.display_name) ??
      compactAddress(payload.address) ??
      payload.display_name;

    return {
      label: label || fallback,
      source: label ? "openstreetmap" : "coordinates",
    };
  } catch {
    return { label: fallback, source: "coordinates" };
  }
}
