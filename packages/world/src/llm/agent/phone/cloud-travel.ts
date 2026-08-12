import { getYuijuConfig } from "@yuiju/utils/config/config";
import { getLangfuseTelemetry } from "@yuiju/utils/llm/langfuse-telemetry";
import { visionModel } from "@yuiju/utils/llm/models";
import { baseInformation } from "@yuiju/utils/prompt/character-card";
import { cloudTravelSystemPrompt } from "@yuiju/utils/prompt/phone";
import { generateText } from "ai";

interface TravelSpot {
  name: string;
  lat: number;
  lon: number;
}

interface StreetViewImage {
  id: string;
  thumb_1024_url: string;
}

interface CloudTravelSource {
  spot: TravelSpot;
  images: StreetViewImage[];
}

interface WikidataResponse {
  results: {
    bindings: Array<{
      placeLabel: { value: string };
      coord: { value: string };
    }>;
  };
}

interface NominatimResult {
  lat: string;
  lon: string;
}

interface MapillaryImageListResponse {
  data: Array<{ id: string }>;
}

interface MapillarySequenceResponse {
  sequence: string;
}

type MapillaryImageResponse = StreetViewImage;

const MAPILLARY_BASE_URL = "https://graph.mapillary.com";
const WIKIDATA_SPARQL_URL = "https://query.wikidata.org/sparql";
const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "Yuiju/1.0";
const RANDOM_SPOT_LIMIT = 30;
const STREET_VIEW_IMAGE_LIMIT = 5;
const STREET_VIEW_SEARCH_RADIUS_METERS = 80;
const EXTERNAL_REQUEST_TIMEOUT_MS = 30_000;

const wikidataSpotTypeIds = [
  "Q570116",
  "Q33506",
  "Q23413",
  "Q22698",
  "Q697295",
  "Q44539",
  "Q1107656",
] as const;

async function fetchJson<T>(url: URL, headers?: HeadersInit): Promise<T> {
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(EXTERNAL_REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`云旅游外部请求失败：${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

async function queryMapillary<T>(path: string, params: Record<string, string | number>) {
  const url = new URL(path, MAPILLARY_BASE_URL);
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, String(value));
  }
  url.searchParams.set("access_token", getYuijuConfig().world.phone!.mapillaryAccessToken!);

  return fetchJson<T>(url, { Accept: "application/json" });
}

async function searchPanoramaIds(lat: number, lon: number) {
  const latDelta = STREET_VIEW_SEARCH_RADIUS_METERS / 111320;
  const lonDelta = STREET_VIEW_SEARCH_RADIUS_METERS / (111320 * Math.cos((lat * Math.PI) / 180));
  const bbox = [lon - lonDelta, lat - latDelta, lon + lonDelta, lat + latDelta].join(",");
  const result = await queryMapillary<MapillaryImageListResponse>("/images", {
    bbox,
    limit: STREET_VIEW_IMAGE_LIMIT,
    is_pano: "true",
    fields: "id",
  });

  return result.data.map((image) => image.id);
}

async function getSequenceImages(imageId: string, limit: number) {
  const image = await queryMapillary<MapillarySequenceResponse>(`/${imageId}`, {
    fields: "sequence",
  });
  const sequence = await queryMapillary<MapillaryImageListResponse>("/image_ids", {
    sequence_id: image.sequence,
    fields: "id",
  });

  return Promise.all(
    sequence.data.slice(0, limit).map((item) =>
      queryMapillary<MapillaryImageResponse>(`/${item.id}`, {
        fields: "id,thumb_1024_url",
      }),
    ),
  );
}

async function findRandomJapanStreetView(): Promise<CloudTravelSource> {
  const spotTypeId = wikidataSpotTypeIds[Math.floor(Math.random() * wikidataSpotTypeIds.length)];
  const query = `
SELECT ?place ?placeLabel ?coord WHERE {
  ?place wdt:P17 wd:Q17;
         wdt:P625 ?coord;
         wdt:P31 wd:${spotTypeId}.
  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "zh,ja,en".
  }
}
LIMIT ${RANDOM_SPOT_LIMIT}
OFFSET ${Math.floor(Math.random() * 201)}
`.trim();
  const url = new URL(WIKIDATA_SPARQL_URL);
  url.searchParams.set("query", query);
  url.searchParams.set("format", "json");
  const data = await fetchJson<WikidataResponse>(url, {
    Accept: "application/sparql-results+json",
    "User-Agent": USER_AGENT,
  });
  const spots = data.results.bindings
    .map((item) => {
      const coordinate = /^Point\(([-0-9.]+) ([-0-9.]+)\)$/.exec(item.coord.value);
      if (!coordinate) {
        return null;
      }

      return {
        name: item.placeLabel.value,
        lat: Number(coordinate[2]),
        lon: Number(coordinate[1]),
      };
    })
    .filter((spot): spot is TravelSpot => spot !== null)
    .sort(() => Math.random() - 0.5);

  for (const spot of spots) {
    const panoramaIds = await searchPanoramaIds(spot.lat, spot.lon);
    if (panoramaIds.length === 0) {
      continue;
    }

    const images = await getSequenceImages(panoramaIds[0], STREET_VIEW_IMAGE_LIMIT);
    if (images.length > 0) {
      return { spot, images };
    }
  }

  throw new Error("本次随机探索没有找到可用街景");
}

async function findSpecifiedJapanStreetView(location: string): Promise<CloudTravelSource> {
  const geocodeUrl = new URL(NOMINATIM_SEARCH_URL);
  geocodeUrl.searchParams.set("q", location);
  geocodeUrl.searchParams.set("format", "json");
  geocodeUrl.searchParams.set("countrycodes", "jp");
  geocodeUrl.searchParams.set("limit", "1");
  const geocodeResults = await fetchJson<NominatimResult[]>(geocodeUrl, {
    "User-Agent": USER_AGENT,
  });
  if (geocodeResults.length === 0) {
    throw new Error(`没有找到日本地点：${location}`);
  }

  const lat = Number(geocodeResults[0].lat);
  const lon = Number(geocodeResults[0].lon);
  const offsets = [
    [0, 0],
    [0.0004, 0.0004],
    [-0.0004, 0.0004],
    [0.0004, -0.0004],
    [-0.0004, -0.0004],
  ];
  const panoramaIds = [
    ...new Set(
      (
        await Promise.all(
          offsets.map(([latOffset, lonOffset]) =>
            searchPanoramaIds(lat + latOffset, lon + lonOffset),
          ),
        )
      ).flat(),
    ),
  ];
  if (panoramaIds.length === 0) {
    throw new Error(`${location}附近没有可用街景`);
  }

  const images = (
    await Promise.all(panoramaIds.slice(0, 3).map((imageId) => getSequenceImages(imageId, 2)))
  )
    .flat()
    .slice(0, STREET_VIEW_IMAGE_LIMIT);
  if (images.length === 0) {
    throw new Error(`${location}附近没有可用街景图片`);
  }

  return {
    spot: { name: location, lat, lon },
    images,
  };
}

export async function runCloudTravel(location: string | null) {
  const source = location
    ? await findSpecifiedJapanStreetView(location)
    : await findRandomJapanStreetView();
  const { text } = await generateText({
    model: visionModel,
    telemetry: getLangfuseTelemetry(),
    instructions: [baseInformation, cloudTravelSystemPrompt].join("\n\n"),
    providerOptions: {
      vision: {
        enable_thinking: false,
      },
    },
    maxOutputTokens: 400,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `云旅游地点：${source.spot.name}`,
          },
          ...source.images.map((image) => ({
            type: "file" as const,
            data: new URL(image.thumb_1024_url),
            mediaType: "image/jpeg",
          })),
        ],
      },
    ],
  });

  return text.trim();
}
