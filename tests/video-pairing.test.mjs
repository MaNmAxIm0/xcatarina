import assert from "node:assert/strict";
import test from "node:test";
import { groupRecords } from "../app/api/videos/route.ts";

const horizontal = "https://example.public.blob.vercel-storage.com/videos/lego/work-horizontal.mp4";
const vertical = "https://example.public.blob.vercel-storage.com/videos/lego/work-vertical.mp4";

test("groups the two formats and keeps 16:9 as the primary video", () => {
  const publicationId = "019f8760-775d-74c3-974f-25027abf358f";
  const videos = groupRecords([
    {
      publicationId,
      title: "Construção LEGO",
      description: "Da primeira peça ao resultado final.",
      category: "lego",
      duration: "01:30",
      format: "vertical",
      videoUrl: vertical,
      downloadUrl: `${vertical}?download=1`,
      pathname: "videos/lego/work-vertical.mp4",
      createdAt: "2026-07-22T18:01:00.000Z",
    },
    {
      publicationId,
      title: "Construção LEGO",
      description: "Da primeira peça ao resultado final.",
      category: "lego",
      duration: "01:30",
      format: "horizontal",
      videoUrl: horizontal,
      downloadUrl: `${horizontal}?download=1`,
      pathname: "videos/lego/work-horizontal.mp4",
      createdAt: "2026-07-22T18:00:00.000Z",
    },
  ]);

  assert.equal(videos.length, 1);
  assert.equal(videos[0].videoUrl, horizontal);
  assert.equal(videos[0].horizontalUrl, horizontal);
  assert.equal(videos[0].verticalUrl, vertical);
  assert.equal(videos[0].primaryFormat, "horizontal");
  assert.match(videos[0].horizontalDownloadUrl, /download=1/);
  assert.match(videos[0].verticalDownloadUrl, /download=1/);
});

test("keeps unrelated legacy publications separate", () => {
  const base = {
    title: "Mesmo título",
    description: "Mesmo texto",
    category: "arte",
    duration: "00:30",
    format: "horizontal",
  };
  const videos = groupRecords([
    { ...base, videoUrl: `${horizontal}?one`, pathname: "one.mp4", createdAt: "2026-07-22T12:00:00.000Z" },
    { ...base, videoUrl: `${horizontal}?two`, pathname: "two.mp4", createdAt: "2026-07-22T12:20:01.000Z" },
  ]);

  assert.equal(videos.length, 2);
});

test("uses the 30-second horizontal variant as primary and exposes all six durations", () => {
  const publicationId = "119f8760-775d-74c3-974f-25027abf358f";
  const records = [8, 15, 30, 45, 60, 90].flatMap((durationSeconds) => (["horizontal", "vertical"].map((format) => ({
    publicationId,
    title: "Pacote completo",
    category: "lego",
    durationSeconds,
    duration: `00:${String(durationSeconds).padStart(2, "0")}`,
    format,
    videoUrl: `https://example.public.blob.vercel-storage.com/videos/lego/${durationSeconds}-${format}.mp4`,
    pathname: `videos/lego/${durationSeconds}-${format}.mp4`,
    createdAt: "2026-07-22T20:00:00.000Z",
  }))));
  const [video] = groupRecords(records);
  assert.equal(video.videoUrl, "https://example.public.blob.vercel-storage.com/videos/lego/30-horizontal.mp4");
  assert.equal(video.duration, "00:30");
  assert.deepEqual(video.variants.map((variant) => variant.durationSeconds), [8, 15, 30, 45, 60, 90]);
  assert.ok(video.variants.every((variant) => variant.horizontalUrl && variant.verticalUrl));
});
