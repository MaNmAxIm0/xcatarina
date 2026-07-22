import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { list } from "@vercel/blob";
import { Readable } from "node:stream";

const required = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_URL", "BLOB_READ_WRITE_TOKEN"];
for (const name of required) if (!process.env[name]) throw new Error(`Falta ${name}.`);
const client = new S3Client({ region: "auto", endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } });
const bucket = process.env.R2_BUCKET;
const publicUrl = process.env.R2_PUBLIC_URL.replace(/\/$/, "");
const publicObjectUrl = (key) => `${publicUrl}/${key.split("/").map(encodeURIComponent).join("/")}`;

async function allBlobs(prefix) {
  const blobs = [];
  let cursor;
  do {
    const page = await list({ prefix, limit: 500, cursor });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return blobs;
}

const videos = await allBlobs("videos/");
for (const [index, blob] of videos.entries()) {
  const response = await fetch(blob.url);
  if (!response.ok) throw new Error(`Falhou a leitura de ${blob.pathname}.`);
  if (!response.body) throw new Error(`Sem conteúdo em ${blob.pathname}.`);
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: blob.pathname, Body: Readable.fromWeb(response.body), ContentLength: blob.size, ContentType: blob.contentType || "video/mp4", CacheControl: "public, max-age=31536000, immutable" }));
  process.stdout.write(`\rVídeos: ${index + 1}/${videos.length}`);
}

const metadataBlobs = await allBlobs("metadata/");
const publications = new Map();
for (const blob of metadataBlobs) {
  const response = await fetch(blob.url);
  if (!response.ok) continue;
  const parsed = await response.json();
  const records = Array.isArray(parsed) ? parsed : [parsed];
  for (const record of records) {
    if (!record.pathname) continue;
    record.videoUrl = publicObjectUrl(record.pathname);
    delete record.downloadUrl;
    const id = record.publicationId || blob.pathname.replace(/[^a-zA-Z0-9-]/g, "-");
    const group = publications.get(id) || [];
    group.push(record);
    publications.set(id, group);
  }
}
for (const [id, records] of publications) await client.send(new PutObjectCommand({ Bucket: bucket, Key: `metadata/${id}.json`, Body: JSON.stringify(records), ContentType: "application/json", CacheControl: "no-cache" }));
process.stdout.write(`\nMigração concluída: ${videos.length} vídeos e ${publications.size} publicações.\n`);
