"use client";

import { useEffect, useMemo, useState } from "react";

type Category = "art" | "lego";
type VideoItem = { id:string; title:string; description:string; category:Category; createdAt:string; duration:string; featured:number; videoUrl:string };
const filters = [{ value:"all", label:"Todos" },{ value:"art", label:"Arte" },{ value:"lego", label:"LEGO" }] as const;
const demos: VideoItem[] = [
  { id:"demo-1", title:"Flores de LEGO", description:"Uma construção cheia de cor, pétala a pétala.", category:"lego", createdAt:"2026-07-18", duration:"00:22", featured:1, videoUrl:"" },
  { id:"demo-2", title:"Retrato em tons pastel", description:"Do primeiro traço aos últimos detalhes.", category:"art", createdAt:"2026-07-11", duration:"00:18", featured:0, videoUrl:"" },
  { id:"demo-3", title:"Pequeno jardim botânico", description:"A mesa transforma-se num jardim de peças.", category:"lego", createdAt:"2026-07-03", duration:"00:15", featured:0, videoUrl:"" },
];

export function VideoGallery() {
  const [filter,setFilter] = useState<"all"|Category>("all");
  const [videos,setVideos] = useState<VideoItem[]>(demos);
  const [loaded,setLoaded] = useState(false);
  useEffect(()=>{ fetch("/api/videos").then(r=>r.ok?r.json():Promise.reject()).then((d:{videos?:VideoItem[]})=>{if(d.videos?.length)setVideos(d.videos)}).catch(()=>undefined).finally(()=>setLoaded(true)); },[]);
  const visible=useMemo(()=>videos.filter(v=>filter==="all"||v.category===filter),[videos,filter]);
  const featured=videos.find(v=>v.featured)||videos[0];
  return <main>
    <header className="public-nav"><a href="#inicio" className="public-brand"><span>xC</span><b>xCatarina</b></a><nav aria-label="Navegação principal"><a href="#videos">Vídeos</a><a href="https://www.twitch.tv/xcatarina" target="_blank" rel="noreferrer">Twitch ↗</a></nav></header>
    <section className="public-hero" id="inicio"><div className="hero-copy"><span className="live-kicker"><i/> ARTE, LEGO & BOAS VIBES</span><h1>As criações<br/>ganham <em>vida.</em></h1><p>Timelapses das lives da xCatarina — da primeira peça ao último detalhe.</p><a className="watch-button" href="#videos">Ver todos os vídeos <span>↓</span></a></div><div className="hero-art" aria-label="Composição abstrata inspirada em arte e LEGO"><div className="sun"/><div className="blue-card"><span>✦</span><b>CRIAR</b></div><div className="pink-card"><i/><i/><i/><i/><i/><i/></div><div className="scribble">feito<br/>com amor</div></div></section>
    <section className="featured-strip"><span className="label">EM DESTAQUE</span><div><b>{featured?.title||"Novo timelapse"}</b><small>{featured?.description}</small></div><a href={featured?.videoUrl||"#videos"}>{featured?.videoUrl?"Reproduzir":"Em breve"} <span>▶</span></a></section>
    <section className="video-section" id="videos"><div className="section-title"><div><span>ARQUIVO CRIATIVO</span><h2>Todos os vídeos</h2></div><p>{visible.length.toString().padStart(2,"0")} histórias em movimento</p></div><div className="filter-bar" role="group" aria-label="Filtrar vídeos">{filters.map(item=><button key={item.value} className={filter===item.value?"active":""} type="button" onClick={()=>setFilter(item.value)}>{item.label}</button>)}</div><div className="video-grid" aria-live="polite">{visible.map(video=><article className="video-card" key={video.id}><div className={`video-frame ${video.category}`}>{video.videoUrl?<video src={video.videoUrl} controls preload="metadata" playsInline/>:<div className="placeholder-art"><span>{video.category==="lego"?"▦":"✎"}</span><b>{video.category==="lego"?"LEGO":"ARTE"}</b></div>}<span className="category">{video.category==="lego"?"LEGO":"ARTE"}</span><time>{video.duration||"TIMELAPSE"}</time></div><div className="card-copy"><span>{new Date(video.createdAt).toLocaleDateString("pt-PT",{day:"2-digit",month:"short",year:"numeric"})}</span><h3>{video.title}</h3><p>{video.description}</p></div></article>)}</div>{loaded&&!visible.length&&<div className="empty-state"><b>Ainda não há vídeos nesta categoria.</b><span>Volta em breve — vem aí mais criatividade.</span></div>}</section>
    <section className="twitch-cta"><div><span className="spark">✦</span><p>Vê as criações<br/><em>em direto.</em></p></div><a href="https://www.twitch.tv/xcatarina" target="_blank" rel="noreferrer">Seguir na Twitch <span>↗</span></a></section>
    <footer className="public-footer"><a className="public-brand" href="#inicio"><span>xC</span><b>xCatarina</b></a><p>Arte, LEGO e um bocadinho de caos criativo.</p></footer>
  </main>;
}
