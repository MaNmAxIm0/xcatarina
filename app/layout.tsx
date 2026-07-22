import type { Metadata } from "next";
import { headers } from "next/headers";
import { DM_Sans,Fraunces } from "next/font/google";
import "./globals.css";
const sans=DM_Sans({variable:"--font-sans",subsets:["latin"]});
const display=Fraunces({variable:"--font-display",subsets:["latin"]});
export async function generateMetadata():Promise<Metadata>{const h=await headers();const host=h.get("x-forwarded-host")||h.get("host")||"xcatarina.pt";const protocol=h.get("x-forwarded-proto")||(host.includes("localhost")?"http":"https");const base=new URL(`${protocol}://${host}`);const title="xCatarina — Timelapses de Arte & LEGO";const description="Vê as criações das lives da xCatarina ganharem vida, da primeira peça ao último detalhe.";return{metadataBase:base,title,description,icons:{icon:"/favicon.png",shortcut:"/favicon.png",apple:"/favicon.png"},openGraph:{title,description,type:"website",locale:"pt_PT",siteName:"xCatarina",url:base,images:[{url:new URL("/og.png",base),width:1200,height:630,alt:"xCatarina — Timelapses de Arte e LEGO"}]},twitter:{card:"summary_large_image",title,description,images:[new URL("/og.png",base)]}}}
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="pt"><body className={`${sans.variable} ${display.variable}`}>{children}</body></html>}
