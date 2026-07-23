"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
  { id: "demo-1", title: "Flores de LEGO", description: "Uma construÃ§Ã£o cheia de cor, pÃ©tala a pÃ©tala.", category: "lego", createdAt: "2026-07-18", duration: "00:22", featured: 1, videoUrl: "", horizontalUrl: "", verticalUrl: "", horizontalDownloadUrl: "", verticalDownloadUrl: "", primaryFormat: "horizontal", variants: [] },
  { id: "demo-2", title: "Retrato em tons pastel", description: "Do primeiro traÃ§o aos Ãºltimos detalhes.", category: "art", createdAt: "2026-07-11", duration: "00:18", featured: 0, videoUrl: "", horizontalUrl: "", verticalUrl: "", horizontalDownloadUrl: "", verticalDownloadUrl: "", primaryFormat: "horizontal", variants: [] },
  { id: "demo-3", title: "Pequeno jardim botÃ¢nico", description: "A mesa transforma-se num jardim de peÃ§as.", category: "lego", createdAt: "2026-07-03", duration: "00:15", featured: 0, videoUrl: "", horizontalUrl: "", verticalUrl: "", horizontalDownloadUrl: "", verticalDownloadUrl: "", primaryFormat: "horizontal", variants: [] },
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
    {video.horizontalUrl && <a className="download-horizontal" href={video.horizontalDownloadUrl} download={safeFilename(video.title, 30, "horizontal", video.horizontalUrl)}>{downloadLabel(video.horizontalUrl, "Horizontal")} <span aria-hidden="true">â†“</span></a>}
    {video.verticalUrl && <a className="download-vertical" href={video.verticalDownloadUrl} download={safeFilename(video.title, 30, "vertical", video.verticalUrl)}>{downloadLabel(video.verticalUrl, "Vertical")} <span aria-hidden="true">â†“</span></a>}
  </div>;
  return <div className="variant-downloads">
    <label><span>DuraÃ§Ã£o</span><select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>
      {video.variants.map((variant) => <option value={variant.durationSeconds} key={variant.durationSeconds}>{variant.durationSeconds === 60 ? "1 minuto" : variant.durationSeconds === 90 ? "1 minuto e 30" : `${variant.durationSeconds} segundos`}{variant.durationSeconds === 30 ? " Â· principal" : ""}</option>)}
    </select></label>
    {selected && <div className="video-actions" aria-label={`Downloads de ${video.title} com ${duration} segundos`}>
      {selected.horizontalUrl && <a className="download-horizontal" href={selected.horizontalDownloadUrl} download={safeFilename(video.title, duration, "horizontal", selected.horizontalUrl)}>{downloadLabel(selected.horizontalUrl, "Horizontal")} <span aria-hidden="true">â†“</span></a>}
      {selected.verticalUrl && <a className="download-vertical" href={selected.verticalDownloadUrl} download={safeFilename(video.title, duration, "vertical", selected.verticalUrl)}>{downloadLabel(selected.verticalUrl, "Vertical")} <span aria-hidden="true">â†“</span></a>}
    </div>}
  </div>;
}

function downloadLabel(url: string, ratio: "Horizontal" | "Vertical") {
  return /\.webm(?:$|\?)/i.test(url) ? `Descarregar ${ratio}` : `Descarregar MP4 ${ratio}`;
}function StyledPlayer({ video, title }: { video: VideoItem; title: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const durations = video.variants.length ? video.variants.map((variant) => variant.durationSeconds) : [30];
  const [duration, setDuration] = useState(durations.includes(30) ? 30 : durations[0]);
  const [format, setFormat] = useState<VideoFormat>(video.primaryFormat);
  const selected = video.variants.find((variant) => variant.durationSeconds === duration);
  const src = selected ? (format === "vertical" ? selected.verticalUrl : selected.horizontalUrl) : (format === "vertical" ? video.verticalUrl : video.horizontalUrl);
  const togglePlay = () => { const element = videoRef.current; if (!element) return; if (element.paused) void element.play(); else element.pause(); };
  const toggleMute = () => { const element = videoRef.current; if (!element) return; element.muted = !element.muted; setMuted(element.muted); };
  const seek = (value: number) => { const element = videoRef.current; if (element?.duration) element.currentTime = (value / 100) * element.duration; setProgress(value); };
  const fullscreen = () => { if (document.fullscreenElement) void document.exitFullscreen(); else if (shellRef.current) void shellRef.current.requestFullscreen(); };
  return <div className="styled-player" ref={shellRef}>
    <video key={src} ref={videoRef} src={src} preload="metadata" playsInline aria-label={title} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setProgress(100); }} onTimeUpdate={(event) => { const element = event.currentTarget; setProgress(element.duration ? (element.currentTime / element.duration) * 100 : 0); }} onClick={togglePlay} />
    <div className="player-switchers"><label><span>Duração</span><select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>{durations.map((value) => <option value={value} key={value}>{value === 60 ? "1 minuto" : value === 90 ? "1 minuto e 30" : `${value} segundos`}{value === 30 ? " · principal" : ""}</option>)}</select></label><label><span>Formato</span><select value={format} onChange={(event) => setFormat(event.target.value as VideoFormat)}><option value="horizontal">Horizontal</option><option value="vertical" disabled={!selected?.verticalUrl && !video.verticalUrl}>Vertical</option></select></label></div>
    <div className="player-controls"><button type="button" onClick={togglePlay} aria-label={playing ? "Pausar vídeo" : "Reproduzir vídeo"}>{playing ? "Ⅱ" : "▶"}</button><input aria-label="Progresso do vídeo" type="range" min="0" max="100" step="0.1" value={progress} onChange={(event) => seek(Number(event.target.value))} /><button type="button" onClick={toggleMute} aria-label={muted ? "Ativar som" : "Silenciar vídeo"}>{muted ? "⌁" : "◖"}</button><button type="button" onClick={fullscreen} aria-label="Ecrã inteiro">↗</button></div>
  </div>;
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
      <nav aria-label="NavegaÃ§Ã£o principal">
        <a href="#videos">VÃ­deos</a>
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
        <h1>As criaÃ§Ãµes<br />ganham <em>vida.</em></h1>
        <p>Timelapses das lives da xCatarina â€” da primeira peÃ§a ao Ãºltimo detalhe.</p>
        <a className="watch-button" href="#videos">Ver todos os vÃ­deos <span>â†“</span></a>
      </div>
      <div className="hero-art" aria-label="ComposiÃ§Ã£o abstrata inspirada em arte e LEGO">
        <div className="sun" />
        <div className="blue-card"><span>âœ¦</span><b>CRIAR</b></div>
        <div className="pink-card"><i /><i /><i /><i /><i /><i /></div>
        <div className="scribble">feito<br />com amor</div>
      </div>
    </section>

    <section className="featured-strip">
      <span className="label">EM DESTAQUE</span>
      <div><b>{featured?.title || "Novo timelapse"}</b><small>{featured?.description}</small></div>
      <a href={featured?.videoUrl || "#videos"}>{featured?.videoUrl ? "Reproduzir" : "Em breve"} <span>â–¶</span></a>
    </section>

    <section className="video-section" id="videos">
      <div className="section-title">
        <div><span>ARQUIVO CRIATIVO</span><h2>Todos os vÃ­deos</h2></div>
        <p>{visible.length.toString().padStart(2, "0")} histÃ³rias em movimento</p>
      </div>
      <div className="filter-bar" role="group" aria-label="Filtrar vÃ­deos">
        {filters.map((item) => <button key={item.value} className={filter === item.value ? "active" : ""} type="button" onClick={() => setFilter(item.value)}>{item.label}</button>)}
      </div>
      <div className="video-grid" aria-live="polite">
        {visible.map((video) => <article className="video-card" id={`video-${video.id}`} key={video.id}>
          <div className={`video-frame ${video.category} ${video.primaryFormat === "vertical" ? "vertical-only" : ""}`}>
            {video.videoUrl
              ? <StyledPlayer video={video} title={video.title} />
              : <div className="placeholder-art"><span>{video.category === "lego" ? "â–¦" : "âœŽ"}</span><b>{video.category === "lego" ? "LEGO" : "ARTE"}</b></div>}
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
      {loaded && !visible.length && <div className="empty-state"><b>Ainda nÃ£o hÃ¡ vÃ­deos nesta categoria.</b><span>Volta em breve â€” vem aÃ­ mais criatividade.</span></div>}
    </section>

    <section className="twitch-cta">
      <div><span className="spark">âœ¦</span><p>VÃª as criaÃ§Ãµes<br /><em>em direto.</em></p></div>
      <a href="https://www.twitch.tv/xcatarina" target="_blank" rel="noreferrer">Seguir na Twitch <span>â†—</span></a>
    </section>
    <footer className="public-footer"><a className="public-brand" href="#inicio"><span>xC</span><b>xCatarina</b></a><p>Arte, LEGO e um bocadinho de caos criativo.</p></footer>
  </main>;
}



