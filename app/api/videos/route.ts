import { getDownloadUrl, list } from "@vercel/blob";
import { GetObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type StoredCategory = "arte" | "art" | "lego";
type StoredFormat = "horizontal" | "vertical";

type StoredVideo = {
  publicationId?: string;
  title?: string;
  description?: string;
  category?: StoredCategory;
  duration?: string;
  durationSeconds?: number;
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

type VideoVariant = {
  durationSeconds: number;
  horizontalUrl: string;
  verticalUrl: string;
  horizontalDownloadUrl: string;
  verticalDownloadUrl: string;
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
  variants: Record<string, VideoVariant>;
};

// Os dois formatos antigos eram publicados um a seguir ao outro. Uma janela
// curta evita juntar por engano trabalhos diferentes com o mesmo título.
const LEGACY_PAIR_WINDOW_MS = 15 * 60 * 1000;

export const dynamic = "force-dynamic";

function r2Client() {
  const accountId = process.env.R2_ACCOUNT_ID || "";
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
  const bucket = process.env.R2_BUCKET || "";
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return { bucket, client: new S3Client({ region: "auto", endpoint: `https://${accountId}.r2.cloudflarestorage.com`, credentials: { accessKeyId, secretAccessKey } }) };
}

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
    variants: {},
  };
}

function recordDurationSeconds(record: StoredVideo) {
  if ([8, 15, 30, 45, 60, 90].includes(record.durationSeconds || 0)) return record.durationSeconds || 0;
  const parts = (record.duration || "").split(":").map(Number);
  if (parts.length === 2 && parts.every(Number.isFinite)) {
    const total = parts[0] * 60 + parts[1];
    if ([8, 15, 30, 45, 60, 90].includes(total)) return total;
  }
  return 0;
}

function addRecord(group: VideoGroup, record: StoredVideo) {
  const url = record.videoUrl || "";
  const pathname = record.pathname || url;
  const durationSeconds = recordDurationSeconds(record);
  if (durationSeconds && record.format) {
    const key = String(durationSeconds);
    const variant = group.variants[key] ||= { durationSeconds, horizontalUrl: "", verticalUrl: "", horizontalDownloadUrl: "", verticalDownloadUrl: "" };
    if (record.format === "horizontal") {
      variant.horizontalUrl ||= url;
      variant.horizontalDownloadUrl ||= record.downloadUrl || toDownloadUrl(url);
    } else {
      variant.verticalUrl ||= url;
      variant.verticalDownloadUrl ||= record.downloadUrl || toDownloadUrl(url);
    }
  }

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
      const primary = group.variants["30"];
      const horizontalUrl = primary?.horizontalUrl || group.horizontalUrl || group.legacyUrl;
      const primaryVerticalUrl = primary?.verticalUrl || group.verticalUrl;
      const videoUrl = horizontalUrl || primaryVerticalUrl;
      const primaryFormat = horizontalUrl ? "horizontal" : "vertical";
      const id = group.publicationId || group.horizontalPathname || group.legacyPathname || group.verticalPathname || videoUrl;
      const horizontalDownloadUrl = primary?.horizontalDownloadUrl || group.horizontalDownloadUrl || group.legacyDownloadUrl || toDownloadUrl(horizontalUrl);
      const verticalDownloadUrl = primary?.verticalDownloadUrl || group.verticalDownloadUrl || toDownloadUrl(primaryVerticalUrl);
      const variants = Object.values(group.variants).sort((a, b) => a.durationSeconds - b.durationSeconds);
      return {
        id,
        title: group.title,
        description: group.description,
        category: group.category,
        duration: primary ? "00:30" : group.duration,
        createdAt: group.createdAt,
        featured: group.featured,
        horizontalUrl,
        verticalUrl: primaryVerticalUrl,
        horizontalDownloadUrl,
        verticalDownloadUrl,
        videoUrl,
        primaryFormat,
        variants,
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

async function loadVercelRecords() {
  try {
    const blobs: Awaited<ReturnType<typeof list>>["blobs"] = [];
    let cursor: string | undefined;
    do {
      const page = await list({ prefix: "metadata/", limit: 500, cursor });
      blobs.push(...page.blobs);
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    const recordGroups = await Promise.all(blobs.map(async (blob) => {
      const response = await fetch(blob.url, { cache: "no-store" });
      if (!response.ok) return null;
      const stored = await response.json() as StoredVideo | StoredVideo[];
      return Array.isArray(stored) ? stored : [stored];
    }));
    const records = recordGroups.flatMap((records) => records || []);
    return records.filter((record): record is StoredVideo => Boolean(record));
  } catch {
    return [];
  }
}

async function loadR2Records() {
  const config = r2Client();
  if (!config) return [];
  const records: StoredVideo[] = [];
  let continuationToken: string | undefined;
  do {
    const page = await config.client.send(new ListObjectsV2Command({ Bucket: config.bucket, Prefix: "metadata/", ContinuationToken: continuationToken }));
    for (const object of page.Contents || []) {
      if (!object.Key) continue;
      const response = await config.client.send(new GetObjectCommand({ Bucket: config.bucket, Key: object.Key }));
      const text = await response.Body?.transformToString();
      if (!text) continue;
      const stored = JSON.parse(text) as StoredVideo | StoredVideo[];
      const group = Array.isArray(stored) ? stored : [stored];
      for (const record of group) {
        if (record.pathname) {
          record.downloadUrl = await getSignedUrl(config.client, new GetObjectCommand({ Bucket: config.bucket, Key: record.pathname, ResponseContentDisposition: `attachment; filename="xcatarina-${record.durationSeconds || 30}s-${record.format || "video"}.mp4"` }), { expiresIn: 3600 });
        }
        records.push(record);
      }
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);
  return records;
}

export async function GET() {
  try {
    const [r2Records, legacyRecords] = await Promise.all([loadR2Records(), loadVercelRecords()]);
    const videos = groupRecords([...r2Records, ...legacyRecords]);
    return Response.json({ videos }, { headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=120" } });
  } catch {
    return Response.json({ videos: [] });
  }
}
