export type ReverseLocation = {
  label: string;
  source: "openstreetmap" | "nearby-place" | "coordinates";
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

type NearbyPlaceElement = {
  type: "node" | "way" | "relation";
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: {
    name?: string;
    amenity?: string;
    shop?: string;
    office?: string;
    tourism?: string;
    leisure?: string;
    building?: string;
    highway?: string;
    "addr:housenumber"?: string;
    "addr:street"?: string;
  };
};

type NearbyPlacesResponse = {
  elements?: NearbyPlaceElement[];
};

type RankedNearbyPlace = {
  place: NearbyPlaceElement;
  distance: number;
  priority: number;
};

const NEARBY_SEARCH_RADIUS_METERS = 200;

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

function getAreaLabel(address: NominatimAddress | undefined) {
  if (!address) {
    return null;
  }

  const locality =
    address.city_district ??
    address.city ??
    address.town ??
    address.village ??
    address.county;

  const parts = uniqueParts([
    address.neighbourhood ??
      address.suburb ??
      address.quarter ??
      address.residential ??
      address.hamlet,
    locality,
    address.postcode,
    address.state,
  ]);

  return parts.length ? parts.join(", ") : null;
}

function isBroadLocation(address: NominatimAddress | undefined) {
  if (!address) {
    return true;
  }

  const hasSpecificPointOfInterest = Boolean(
    address.amenity ??
      address.shop ??
      address.office ??
      address.building ??
      address.house ??
      address.tourism ??
      address.leisure ??
      address.attraction,
  );
  const hasStreet = Boolean(address.road);
  const hasHouseNumber = Boolean(address.house_number);

  return !hasSpecificPointOfInterest && !(hasStreet && hasHouseNumber);
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceInMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const earthRadius = 6371000;
  const latitudeDelta = toRadians(latitudeB - latitudeA);
  const longitudeDelta = toRadians(longitudeB - longitudeA);
  const a =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(toRadians(latitudeA)) *
      Math.cos(toRadians(latitudeB)) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getNearbyPlacePriority(tags: NearbyPlaceElement["tags"]) {
  if (!tags?.name) {
    return 999;
  }

  if (tags.amenity || tags.shop || tags.office || tags.tourism || tags.leisure) {
    return 1;
  }

  if (tags.building) {
    return 2;
  }

  if (tags.highway) {
    return 3;
  }

  return 4;
}

function formatNearbyPlaceLabel(
  place: NearbyPlaceElement,
  address: NominatimAddress | undefined,
) {
  const parts = uniqueParts([
    place.tags?.name,
    [place.tags?.["addr:housenumber"], place.tags?.["addr:street"]]
      .filter(Boolean)
      .join(" ")
      .trim() || undefined,
    getAreaLabel(address),
  ]);

  return parts.length ? parts.join(", ") : null;
}

async function findNearbyNamedPlace(
  latitude: number,
  longitude: number,
  address: NominatimAddress | undefined,
) {
  const query = [
    "[out:json][timeout:25];",
    "(",
    `node(around:${NEARBY_SEARCH_RADIUS_METERS},${latitude},${longitude})[name];`,
    `way(around:${NEARBY_SEARCH_RADIUS_METERS},${latitude},${longitude})[name];`,
    `relation(around:${NEARBY_SEARCH_RADIUS_METERS},${latitude},${longitude})[name];`,
    ");",
    "out center tags 30;",
  ].join("");
  const url = new URL("https://overpass-api.de/api/interpreter");
  url.searchParams.set("data", query);

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
      return null;
    }

    const payload = (await response.json()) as NearbyPlacesResponse;
    const rankedPlaces = (payload.elements ?? [])
      .map((place) => {
        const latitudeValue = place.center?.lat ?? place.lat;
        const longitudeValue = place.center?.lon ?? place.lon;

        if (
          !place.tags?.name ||
          typeof latitudeValue !== "number" ||
          typeof longitudeValue !== "number" ||
          !Number.isFinite(latitudeValue) ||
          !Number.isFinite(longitudeValue)
        ) {
          return null;
        }

        return {
          place,
          distance: distanceInMeters(latitude, longitude, latitudeValue, longitudeValue),
          priority: getNearbyPlacePriority(place.tags),
        };
      })
      .filter((place): place is RankedNearbyPlace => place !== null)
      .sort((left, right) => {
        if (left.priority !== right.priority) {
          return left.priority - right.priority;
        }

        return left.distance - right.distance;
      });

    const bestPlace = rankedPlaces[0]?.place;

    if (!bestPlace) {
      return null;
    }

    return formatNearbyPlaceLabel(bestPlace, address);
  } catch {
    return null;
  }
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
    const reverseLabel =
      compactDisplayName(payload.display_name) ??
      compactAddress(payload.address) ??
      payload.display_name;

    if (reverseLabel && !isBroadLocation(payload.address)) {
      return {
        label: reverseLabel,
        source: "openstreetmap",
      };
    }

    const nearbyLabel = await findNearbyNamedPlace(
      latitude,
      longitude,
      payload.address,
    );

    if (nearbyLabel) {
      return {
        label: nearbyLabel,
        source: "nearby-place",
      };
    }

    return {
      label: reverseLabel || fallback,
      source: reverseLabel ? "openstreetmap" : "coordinates",
    };
  } catch {
    return { label: fallback, source: "coordinates" };
  }
}
