import { getDownloadUrl, list } from "@vercel/blob";

type StoredCategory = "arte" | "art" | "lego";
type StoredFormat = "horizontal" | "vertical";

type StoredVideo = {
  publicationId?: string;
  title?: string;
  description?: string;
  category?: StoredCategory;
  duration?: string;
  format?: StoredFormat;
  videoUrl?: string;
  downloadUrl?: string;
  horizontalUrl?: string;
  verticalUrl?: string;
  horizontalDownloadUrl?: string;
  verticalDownloadUrl?: string;
  pathname?: string;
  createdAt?: string;
  featured?: number | boolean;
};

type VideoGroup = {
  publicationId?: string;
  title: string;
  description: string;
  category: "art" | "lego";
  duration: string;
  createdAt: string;
  featured: number;
  horizontalUrl: string;
  verticalUrl: string;
  legacyUrl: string;
  horizontalDownloadUrl: string;
  verticalDownloadUrl: string;
  legacyDownloadUrl: string;
  horizontalPathname: string;
  verticalPathname: string;
  legacyPathname: string;
};

// Os dois formatos antigos eram publicados um a seguir ao outro. Uma janela
// curta evita juntar por engano trabalhos diferentes com o mesmo título.
const LEGACY_PAIR_WINDOW_MS = 15 * 60 * 1000;

export const dynamic = "force-dynamic";

function normalizedCategory(category: StoredCategory | undefined): "art" | "lego" {
  return category === "arte" || category === "art" ? "art" : "lego";
}

function comparableText(value: string | undefined) {
  return (value || "").trim().toLocaleLowerCase("pt-PT");
}

function legacySignature(record: StoredVideo) {
  return [
    comparableText(record.title),
    comparableText(record.description),
    normalizedCategory(record.category),
    comparableText(record.duration),
  ].join("\u0000");
}

function timestamp(value: string | undefined) {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function newGroup(record: StoredVideo): VideoGroup {
  return {
    publicationId: record.publicationId,
    title: record.title?.trim() || "Timelapse xCatarina",
    description: record.description?.trim() || "",
    category: normalizedCategory(record.category),
    duration: record.duration?.trim() || "",
    createdAt: record.createdAt || new Date(0).toISOString(),
    featured: record.featured ? 1 : 0,
    horizontalUrl: record.horizontalUrl || "",
    verticalUrl: record.verticalUrl || "",
    legacyUrl: "",
    horizontalDownloadUrl: record.horizontalDownloadUrl || "",
    verticalDownloadUrl: record.verticalDownloadUrl || "",
    legacyDownloadUrl: "",
    horizontalPathname: "",
    verticalPathname: "",
    legacyPathname: "",
  };
}

function addRecord(group: VideoGroup, record: StoredVideo) {
  const url = record.videoUrl || "";
  const pathname = record.pathname || url;

  if (record.horizontalUrl) group.horizontalUrl ||= record.horizontalUrl;
  if (record.verticalUrl) group.verticalUrl ||= record.verticalUrl;
  if (record.horizontalDownloadUrl) group.horizontalDownloadUrl ||= record.horizontalDownloadUrl;
  if (record.verticalDownloadUrl) group.verticalDownloadUrl ||= record.verticalDownloadUrl;

  if (record.format === "horizontal") {
    group.horizontalUrl ||= url;
    group.horizontalDownloadUrl ||= record.downloadUrl || "";
    group.horizontalPathname ||= pathname;
  } else if (record.format === "vertical") {
    group.verticalUrl ||= url;
    group.verticalDownloadUrl ||= record.downloadUrl || "";
    group.verticalPathname ||= pathname;
  } else {
    // Os registos anteriores à introdução de `format` eram sempre o vídeo
    // principal. São tratados como 16:9 sem alterar os dados armazenados.
    group.legacyUrl ||= url;
    group.legacyDownloadUrl ||= record.downloadUrl || "";
    group.legacyPathname ||= pathname;
  }

  if (timestamp(record.createdAt) > timestamp(group.createdAt)) {
    group.createdAt = record.createdAt || group.createdAt;
  }
  group.featured = Math.max(group.featured, record.featured ? 1 : 0);
}

function canAcceptLegacyPair(group: VideoGroup, record: StoredVideo) {
  if (legacySignature(group) !== legacySignature(record)) return false;
  if (Math.abs(timestamp(group.createdAt) - timestamp(record.createdAt)) > LEGACY_PAIR_WINDOW_MS) return false;
  if (record.format === "horizontal") return !group.horizontalUrl;
  if (record.format === "vertical") return !group.verticalUrl;
  return !group.legacyUrl;
}

export function groupRecords(records: StoredVideo[]) {
  const groups: VideoGroup[] = [];
  const byPublicationId = new Map<string, VideoGroup>();

  for (const record of [...records].sort((a, b) => timestamp(b.createdAt) - timestamp(a.createdAt))) {
    if (!record.videoUrl && !record.horizontalUrl && !record.verticalUrl) continue;

    let group: VideoGroup | undefined;
    if (record.publicationId) {
      group = byPublicationId.get(record.publicationId);
    } else {
      group = groups.find((candidate) => !candidate.publicationId && canAcceptLegacyPair(candidate, record));
    }

    if (!group) {
      group = newGroup(record);
      groups.push(group);
      if (record.publicationId) byPublicationId.set(record.publicationId, group);
    }
    addRecord(group, record);
  }

  return groups
    .map((group) => {
      const horizontalUrl = group.horizontalUrl || group.legacyUrl;
      const videoUrl = horizontalUrl || group.verticalUrl;
      const primaryFormat = horizontalUrl ? "horizontal" : "vertical";
      const id = group.publicationId || group.horizontalPathname || group.legacyPathname || group.verticalPathname || videoUrl;
      const horizontalDownloadUrl = group.horizontalDownloadUrl || group.legacyDownloadUrl || toDownloadUrl(horizontalUrl);
      const verticalDownloadUrl = group.verticalDownloadUrl || toDownloadUrl(group.verticalUrl);
      return {
        id,
        title: group.title,
        description: group.description,
        category: group.category,
        duration: group.duration,
        createdAt: group.createdAt,
        featured: group.featured,
        horizontalUrl,
        verticalUrl: group.verticalUrl,
        horizontalDownloadUrl,
        verticalDownloadUrl,
        videoUrl,
        primaryFormat,
      };
    })
    .sort((a, b) => timestamp(b.createdAt) - timestamp(a.createdAt));
}

function toDownloadUrl(videoUrl: string) {
  if (!videoUrl) return "";
  try {
    return getDownloadUrl(videoUrl);
  } catch {
    return videoUrl;
  }
}

export async function GET() {
  try {
    const { blobs } = await list({ prefix: "metadata/", limit: 500 });
    const records = await Promise.all(blobs.map(async (blob) => {
      const response = await fetch(blob.url, { cache: "no-store" });
      if (!response.ok) return null;
      return await response.json() as StoredVideo;
    }));
    const videos = groupRecords(records.filter((record): record is StoredVideo => Boolean(record)));
    return Response.json({ videos }, { headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=120" } });
  } catch {
    return Response.json({ videos: [] });
  }
}
