import { list } from "@vercel/blob";

type StoredVideo = { title: string; description: string; category: "arte" | "lego"; duration: string; format: "horizontal" | "vertical"; videoUrl: string; pathname: string; createdAt: string; featured: number };

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { blobs } = await list({ prefix: "metadata/", limit: 500 });
    const records = await Promise.all(blobs.map(async (blob) => {
      const response = await fetch(blob.url, { cache: "no-store" });
      if (!response.ok) return null;
      return await response.json() as StoredVideo;
    }));
    const videos = records.filter((record): record is StoredVideo => Boolean(record)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((record) => ({ ...record, id: record.pathname, category: record.category === "arte" ? "art" : "lego" }));
    return Response.json({ videos }, { headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=120" } });
  } catch {
    return Response.json({ videos: [] });
  }
}
