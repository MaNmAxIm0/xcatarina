"use client";

import { useEffect, useMemo, useState } from "react";

type Category = "art" | "lego";
type VideoFormat = "horizontal" | "vertical";
type VideoVariant = { durationSeconds: number; horizontalUrl: string; verticalUrl: string; horizontalDownloadUrl: string; verticalDownloadUrl: string };

type VideoItem = {
  id: string;
  title: string;
  description: string;
  category: Category;
  createdAt: string;
  duration: string;
  featured: number;
  videoUrl: string;
  horizontalUrl: string;
  verticalUrl: string;
  horizontalDownloadUrl: string;
  verticalDownloadUrl: string;
  primaryFormat: VideoFormat;
  format?: VideoFormat;
  variants: VideoVariant[];
};

const filters = [
  { value: "all", label: "Todos" },
  { value: "art", label: "Arte" },
  { value: "lego", label: "LEGO" },
] as const;

const demos: VideoItem[] = [
  { id: "demo-1", title: "Flores de LEGO", description: "Uma construção cheia de cor, pétala a pétala.", category: "lego", createdAt: "2026-07-18", duration: "00:22", featured: 1, videoUrl: "", horizontalUrl: "", verticalUrl: "", horizontalDownloadUrl: "", verticalDownloadUrl: "", primaryFormat: "horizontal", variants: [] },
  { id: "demo-2", title: "Retrato em tons pastel", description: "Do primeiro traço aos últimos detalhes.", category: "art", createdAt: "2026-07-11", duration: "00:18", featured: 0, videoUrl: "", horizontalUrl: "", verticalUrl: "", horizontalDownloadUrl: "", verticalDownloadUrl: "", primaryFormat: "horizontal", variants: [] },
  { id: "demo-3", title: "Pequeno jardim botânico", description: "A mesa transforma-se num jardim de peças.", category: "lego", createdAt: "2026-07-03", duration: "00:15", featured: 0, videoUrl: "", horizontalUrl: "", verticalUrl: "", horizontalDownloadUrl: "", verticalDownloadUrl: "", primaryFormat: "horizontal", variants: [] },
];

function normalizeVideo(video: Partial<VideoItem>, index: number): VideoItem {
  const legacyUrl = video.videoUrl || "";
  const horizontalUrl = video.horizontalUrl || (video.format === "vertical" ? "" : legacyUrl);
  const verticalUrl = video.verticalUrl || (video.format === "vertical" ? legacyUrl : "");
  return {
    id: video.id || `video-${index}`,
    title: video.title || "Timelapse xCatarina",
    description: video.description || "",
    category: video.category === "art" ? "art" : "lego",
    createdAt: video.createdAt || new Date(0).toISOString(),
    duration: video.duration || "",
    featured: video.featured ? 1 : 0,
    videoUrl: horizontalUrl || verticalUrl,
    horizontalUrl,
    verticalUrl,
    horizontalDownloadUrl: video.horizontalDownloadUrl || horizontalUrl,
    verticalDownloadUrl: video.verticalDownloadUrl || verticalUrl,
    primaryFormat: horizontalUrl ? "horizontal" : "vertical",
    format: video.format,
    variants: Array.isArray(video.variants) ? video.variants : [],
  };
}

function safeFilename(title: string, duration: number, ratio: "horizontal" | "vertical", url: string) {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "timelapse";
  const extension = /\.webm(?:$|\?)/i.test(url) ? "webm" : "mp4";
  return `xcatarina-${slug}-${duration}s-${ratio}.${extension}`;
}

function VideoDownloads({ video }: { video: VideoItem }) {
  const [duration, setDuration] = useState(30);
  const selected = video.variants.find((variant) => variant.durationSeconds === duration);
  if (!video.variants.length) return <div className="video-actions" aria-label={`Downloads de ${video.title}`}>
    {video.horizontalUrl && <a className="download-horizontal" href={video.horizontalDownloadUrl} download={safeFilename(video.title, 30, "horizontal", video.horizontalUrl)}>{downloadLabel(video.horizontalUrl, "Horizontal")} <span aria-hidden="true">↓</span></a>}
    {video.verticalUrl && <a className="download-vertical" href={video.verticalDownloadUrl} download={safeFilename(video.title, 30, "vertical", video.verticalUrl)}>{downloadLabel(video.verticalUrl, "Vertical")} <span aria-hidden="true">↓</span></a>}
  </div>;
  return <div className="variant-downloads">
    <label><span>Duração</span><select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>
      {video.variants.map((variant) => <option value={variant.durationSeconds} key={variant.durationSeconds}>{variant.durationSeconds === 60 ? "1 minuto" : variant.durationSeconds === 90 ? "1 minuto e 30" : `${variant.durationSeconds} segundos`}{variant.durationSeconds === 30 ? " · principal" : ""}</option>)}
    </select></label>
    {selected && <div className="video-actions" aria-label={`Downloads de ${video.title} com ${duration} segundos`}>
      {selected.horizontalUrl && <a className="download-horizontal" href={selected.horizontalDownloadUrl} download={safeFilename(video.title, duration, "horizontal", selected.horizontalUrl)}>{downloadLabel(selected.horizontalUrl, "Horizontal")} <span aria-hidden="true">↓</span></a>}
      {selected.verticalUrl && <a className="download-vertical" href={selected.verticalDownloadUrl} download={safeFilename(video.title, duration, "vertical", selected.verticalUrl)}>{downloadLabel(selected.verticalUrl, "Vertical")} <span aria-hidden="true">↓</span></a>}
    </div>}
  </div>;
}

function downloadLabel(url: string, ratio: "Horizontal" | "Vertical") {
  return /\.webm(?:$|\?)/i.test(url) ? `Descarregar ${ratio}` : `Descarregar MP4 ${ratio}`;
}

export function VideoGallery() {
  const [filter, setFilter] = useState<"all" | Category>("all");
  const [videos, setVideos] = useState<VideoItem[]>(demos);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/videos")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { videos?: Partial<VideoItem>[] }) => {
        if (data.videos?.length) setVideos(data.videos.map(normalizeVideo));
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  const visible = useMemo(
    () => videos.filter((video) => filter === "all" || video.category === filter),
    [videos, filter],
  );
  const featured = videos.find((video) => video.featured) || videos[0];

  return <main>
    <header className="public-nav">
      <a href="#inicio" className="public-brand"><span>xC</span><b>xCatarina</b></a>
      <nav aria-label="Navegação principal">
        <a href="#videos">Vídeos</a>
        <a href="https://www.twitch.tv/xcatarina" target="_blank" rel="noreferrer">Twitch</a>
        <a href="https://www.instagram.com/xcatarina" target="_blank" rel="noreferrer">Instagram</a>
        <a href="https://tipme.to/xcatarina/" target="_blank" rel="noreferrer">TipMe</a>
        <a href="https://www.tiktok.com/@xcataarina" target="_blank" rel="noreferrer">TikTok</a>
        <a href="https://www.tiktok.com/@clipsdaxcatarina" target="_blank" rel="noreferrer">Clips</a>
      </nav>
    </header>

    <section className="public-hero" id="inicio">
      <div className="hero-copy">
        <span className="live-kicker">ARTE, LEGO & BOAS VIBES</span>
        <h1>As criações<br />ganham <em>vida.</em></h1>
        <p>Timelapses das lives da xCatarina — da primeira peça ao último detalhe.</p>
        <a className="watch-button" href="#videos">Ver todos os vídeos <span>↓</span></a>
      </div>
      <div className="hero-art" aria-label="Composição abstrata inspirada em arte e LEGO">
        <div className="sun" />
        <div className="blue-card"><span>✦</span><b>CRIAR</b></div>
        <div className="pink-card"><i /><i /><i /><i /><i /><i /></div>
        <div className="scribble">feito<br />com amor</div>
      </div>
    </section>

    <section className="featured-strip">
      <span className="label">EM DESTAQUE</span>
      <div><b>{featured?.title || "Novo timelapse"}</b><small>{featured?.description}</small></div>
      <a href={featured?.videoUrl || "#videos"}>{featured?.videoUrl ? "Reproduzir" : "Em breve"} <span>▶</span></a>
    </section>

    <section className="video-section" id="videos">
      <div className="section-title">
        <div><span>ARQUIVO CRIATIVO</span><h2>Todos os vídeos</h2></div>
        <p>{visible.length.toString().padStart(2, "0")} histórias em movimento</p>
      </div>
      <div className="filter-bar" role="group" aria-label="Filtrar vídeos">
        {filters.map((item) => <button key={item.value} className={filter === item.value ? "active" : ""} type="button" onClick={() => setFilter(item.value)}>{item.label}</button>)}
      </div>
      <div className="video-grid" aria-live="polite">
        {visible.map((video) => <article className="video-card" id={`video-${video.id}`} key={video.id}>
          <div className={`video-frame ${video.category} ${video.primaryFormat === "vertical" ? "vertical-only" : ""}`}>
            {video.videoUrl
              ? <video src={video.videoUrl} controls preload="metadata" playsInline />
              : <div className="placeholder-art"><span>{video.category === "lego" ? "▦" : "✎"}</span><b>{video.category === "lego" ? "LEGO" : "ARTE"}</b></div>}
          </div>
          <div className="card-copy">
            <div className="card-meta">
              <span>{new Date(video.createdAt).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })}</span>
              {video.duration && <span>{video.duration}</span>}
            </div>
            <h3>{video.title}</h3>
            <p>{video.description}</p>
            {(video.horizontalUrl || video.verticalUrl) && <VideoDownloads video={video} />}
          </div>
        </article>)}
      </div>
      {loaded && !visible.length && <div className="empty-state"><b>Ainda não há vídeos nesta categoria.</b><span>Volta em breve — vem aí mais criatividade.</span></div>}
    </section>

    <section className="twitch-cta">
      <div><span className="spark">✦</span><p>Vê as criações<br /><em>em direto.</em></p></div>
      <a href="https://www.twitch.tv/xcatarina" target="_blank" rel="noreferrer">Seguir na Twitch <span>↗</span></a>
    </section>
    <footer className="public-footer"><a className="public-brand" href="#inicio"><span>xC</span><b>xCatarina</b></a><p>Arte, LEGO e um bocadinho de caos criativo.</p></footer>
  </main>;
}
