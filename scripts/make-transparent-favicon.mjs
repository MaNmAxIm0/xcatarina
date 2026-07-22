import sharp from "sharp";

const size = 256;
const mask = Buffer.from(`<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="128" cy="128" r="124" fill="white"/></svg>`);
await sharp("public/favicon.png")
  .ensureAlpha()
  .composite([{ input: mask, blend: "dest-in" }])
  .png()
  .toFile("public/favicon-transparent.png");
