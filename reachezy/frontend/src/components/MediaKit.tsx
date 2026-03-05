'use client';

import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { formatINR, getFollowerBucket } from '@/lib/constants';
import BenchmarkDisplay from './BenchmarkDisplay';
import StyleDNA from './StyleDNA';
import TopicCloud from './TopicCloud';

interface Creator {
  username: string;
  full_name: string;
  biography: string;
  profile_picture_url: string;
  followers_count: number;
  media_count: number;
  niche: string;
  city: string;
}

interface Rates {
  reel_rate: number;
  story_rate: number;
  post_rate: number;
  accepts_barter: boolean;
}

interface Benchmarks {
  niche_percentile: { reel: number; story: number; post: number };
  overall_percentile: { reel: number; story: number; post: number };
  source: string;
  sample_size?: number;
}

interface StyleProfile {
  dominant_energy: string;
  energy_score: number;
  dominant_aesthetic: string;
  primary_content_type: string;
  style_summary: string;
  consistency_score: number;
  topics: string[];
  face_visible_pct: number;
  text_overlay_pct: number;
  settings: { name: string; pct: number }[];
}

interface Video {
  id: string;
  thumbnail_url: string;
  title: string;
}

export interface MediaKitProps {
  creator: Creator;
  videos: Video[];
  benchmarks: Benchmarks | null;
  thumbnailUrls: string[];
  rates?: Rates;
  styleProfile?: StyleProfile | null;
}

export default function MediaKit({
  creator,
  videos,
  benchmarks,
  thumbnailUrls,
  rates,
  styleProfile,
}: MediaKitProps) {
  const followerBucket = getFollowerBucket(creator.followers_count);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [includeAnalysis, setIncludeAnalysis] = useState(true);
  const kitRef = useRef<HTMLDivElement>(null);

  const handleCopyLink = () => {
    let url = typeof window !== 'undefined' ? window.location.href : '';
    if (url) {
      if (url.includes('/dashboard')) {
        url = `${window.location.origin}/${creator.username}`;
      }
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handleDownloadPDF = async () => {
    if (!kitRef.current) { window.print(); return; }
    setDownloading(true);
    try {
      // 1. Create a hidden printing clone of the DOM
      const printContainer = document.createElement('div');
      printContainer.style.position = 'absolute';
      printContainer.style.left = '-9999px';
      printContainer.style.top = '0';
      // Force a fixed width so we control the aspect ratio perfectly (A4 width ish)
      printContainer.style.width = '800px';
      printContainer.style.backgroundColor = '#ffffff';
      
      const clone = kitRef.current.cloneNode(true) as HTMLElement;
      
      // Hide interactive-only UI in clone
      clone.querySelectorAll<HTMLElement>('.pdf-hide').forEach(el => {
        el.style.display = 'none';
      });

      // Remove max-width/margins from the clone itself so it fills the 800px printContainer
      clone.style.margin = '0';
      clone.style.width = '100%';
      clone.style.maxWidth = '100%';
      clone.style.background = '#ffffff';
      clone.style.padding = '24px 16px';
      // Tighten the gap between top-level cards to fit 2 pages
      clone.style.display = 'flex';
      clone.style.flexDirection = 'column';
      clone.style.gap = '16px';

      // Compact all inner padding to save vertical space
      clone.querySelectorAll<HTMLElement>('.px-8').forEach(el => {
        el.style.paddingLeft = '24px';
        el.style.paddingRight = '24px';
      });
      clone.querySelectorAll<HTMLElement>('.py-6').forEach(el => {
        el.style.paddingTop = '16px';
        el.style.paddingBottom = '16px';
      });
      clone.querySelectorAll<HTMLElement>('.pt-8').forEach(el => {
        el.style.paddingTop = '20px';
      });
      clone.querySelectorAll<HTMLElement>('.pb-5').forEach(el => {
        el.style.paddingBottom = '12px';
      });

      // Limit thumbnails to 3 in PDF to save space
      const thumbGrids = clone.querySelectorAll<HTMLElement>('.grid.grid-cols-3');
      thumbGrids.forEach(grid => {
        const items = Array.from(grid.children) as HTMLElement[];
        // Keep only first 3 thumbnails
        items.forEach((item, i) => {
          if (i >= 3) item.style.display = 'none';
        });
      });

      // Compact the "Content Style" section specifically to make room for full-size thumbnails
      const styleSections = Array.from(clone.querySelectorAll('h2')).filter(h => h.textContent?.includes('Content Style'));
      styleSections.forEach(header => {
        const styleSection = header.closest('.rounded-\\[1\\.75rem\\]') as HTMLElement;
        if (styleSection) {
          // Shrink the main padding of the section body
          const body = styleSection.querySelector('.px-8.py-6') as HTMLElement;
          if (body) {
            body.style.paddingTop = '12px';
            body.style.paddingBottom = '12px';
          }
          // Tighten the StyleDNA internal spacing (space-y-6 -> tighter gaps)
          styleSection.querySelectorAll('.space-y-6, .space-y-5').forEach(el => {
            (el as HTMLElement).style.gap = '8px';
            (el as HTMLElement).classList.remove('space-y-6', 'space-y-5');
            // Flex column items need direct margin resets if space-y is removed
            Array.from(el.children).forEach(child => {
              (child as HTMLElement).style.marginTop = '0';
              (child as HTMLElement).style.marginBottom = '8px';
            });
          });
          // Make the summary text box smaller
          const summaryBox = styleSection.querySelector('.p-4') as HTMLElement;
          if (summaryBox) {
            summaryBox.style.padding = '8px 12px';
            const p = summaryBox.querySelector('p');
            if (p) p.style.fontSize = '12px';
          }
          // Tighten the consistency score
          const scoreCircle = styleSection.querySelector('.flex.h-12.w-12') as HTMLElement;
          if (scoreCircle) {
            scoreCircle.style.height = '32px';
            scoreCircle.style.width = '32px';
            const span = scoreCircle.querySelector('span');
            if (span) span.style.fontSize = '14px';
          }
          // Tighten topics area
          const topicsHeader = Array.from(styleSection.querySelectorAll('h3')).find(h => h.textContent?.includes('Dominant Topics'));
          if (topicsHeader) {
            const wrapper = topicsHeader.parentElement as HTMLElement;
            if (wrapper) {
              wrapper.style.paddingTop = '8px';
              wrapper.style.marginTop = '4px';
            }
            topicsHeader.style.marginBottom = '8px';
          }
        }
      });

      printContainer.appendChild(clone);
      document.body.appendChild(printContainer);

      // 2. Proxy external images through our server-side proxy to bypass CORS
      const images = Array.from(clone.querySelectorAll<HTMLImageElement>('img'));

      const imageLoads = images.map((img) => {
        if (!img.src || img.src.startsWith('data:') || img.src.startsWith('blob:')) {
          return Promise.resolve();
        }
        const originalSrc = img.src;

        // Skip video files — they can't render as images and would stall the proxy
        const srcPath = originalSrc.split('?')[0].toLowerCase();
        if (['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v'].some(ext => srcPath.endsWith(ext))) {
          img.removeAttribute('src');
          return Promise.resolve();
        }

        // Only proxy external URLs (S3, CDN, etc.)
        if (!originalSrc.startsWith(window.location.origin) || originalSrc.includes('amazonaws.com')) {
          img.src = `/api/proxy-image?url=${encodeURIComponent(originalSrc)}`;
        }
        // Wait for the image to load
        return new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) { resolve(); return; }
          const timeout = setTimeout(() => resolve(), 8000);
          img.onload = () => { clearTimeout(timeout); resolve(); };
          img.onerror = () => { clearTimeout(timeout); resolve(); };
        });
      });
      await Promise.all(imageLoads);

      // Small delay to let the browser paint
      await new Promise(r => setTimeout(r, 300));

      // 3. Smart pagination — prevent cards from being sliced across page boundaries
      // Use the same page height that the PDF slicer will use
      // A4: 297/210 = 1.4143 ratio. For 800px width: pageH = 800 * 1.4143 ≈ 1131px
      const PAGE_HEIGHT_PX = 1131;
      const visibleCards = Array.from(clone.children).filter(
        (c): c is HTMLElement => c instanceof HTMLElement && !c.classList.contains('pdf-hide') && c.tagName !== 'STYLE'
      );

      let currentY = 0;
      visibleCards.forEach((card) => {
        const cardHeight = card.getBoundingClientRect().height;
        const spaceRemaining = PAGE_HEIGHT_PX - (currentY % PAGE_HEIGHT_PX);

        // Only push to next page if card doesn't fit AND has a reasonable size
        // (don't push cards taller than a full page)
        if (cardHeight > spaceRemaining && cardHeight < PAGE_HEIGHT_PX) {
          card.style.marginTop = `${spaceRemaining}px`;
          currentY += spaceRemaining;
        }

        currentY += cardHeight;
      });

      // 4. Capture the DOM at 2x resolution
      const canvas = await html2canvas(printContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 1200,
        scrollY: 0,
      });

      // Remove clone from DOM
      document.body.removeChild(printContainer);

      // 5. Generate PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageW = pdf.internal.pageSize.getWidth();   // 210mm
      const pageH = pdf.internal.pageSize.getHeight();  // 297mm

      // Each PAGE_HEIGHT_PX in the DOM maps to one A4 page
      // At 2x scale, that's PAGE_HEIGHT_PX * 2 canvas pixels per page
      const sliceHeightCanvasPx = PAGE_HEIGHT_PX * 2;
      const canvasW = canvas.width;
      const canvasH = canvas.height;

      const totalPages = Math.ceil(canvasH / sliceHeightCanvasPx);
      let pageNum = 0;

      while (pageNum < totalPages) {
        if (pageNum > 0) pdf.addPage();

        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvasW;
        sliceCanvas.height = sliceHeightCanvasPx;
        const ctx = sliceCanvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);

        const srcY = pageNum * sliceHeightCanvasPx;
        const drawH = Math.min(sliceHeightCanvasPx, canvasH - srcY);

        ctx.drawImage(
          canvas,
          0, srcY, canvasW, drawH,
          0, 0, canvasW, drawH
        );

        // Scale slice to fill the full A4 page
        const sliceAspect = sliceCanvas.width / sliceCanvas.height;
        const pageAspect = pageW / pageH;
        let imgW = pageW;
        let imgH = pageW / sliceAspect;
        if (imgH > pageH) { imgH = pageH; imgW = pageH * sliceAspect; }

        pdf.addImage(
          sliceCanvas.toDataURL('image/jpeg', 0.95),
          'JPEG',
          0, 0, imgW, imgH
        );

        pageNum++;
      }

      // Add "Generated by ReachEzy" footer on last page
      const lastPage = pdf.getNumberOfPages();
      pdf.setPage(lastPage);
      pdf.setFontSize(9);
      pdf.setTextColor(160, 160, 170);
      const footerText = 'Generated by ReachEzy · India\'s Creator Intelligence Platform';
      const footerWidth = pdf.getTextWidth(footerText);
      pdf.text(footerText, (pageW - footerWidth) / 2, pageH - 8);

      pdf.save(`${creator.username}-media-kit.pdf`);
    } catch (err) {
      console.error('PDF generation failed, falling back to print:', err);
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  const formatFollowers = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div
      ref={kitRef}
      className="mx-auto max-w-3xl px-4 py-10 sm:px-6 space-y-6 font-display"
      style={{ background: 'linear-gradient(160deg, #f0f4ff 0%, #f8fafc 60%, #f5f0ff 100%)' }}
    >
      {/* ── Hero Header Card ── */}
      <div className="relative overflow-hidden rounded-[2rem] bg-white border border-slate-100 shadow-xl shadow-slate-200/60">
        {/* Gradient accent top strip */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-violet-500 via-primary to-indigo-500" />

        {/* Background geometric accent */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-gradient-to-br from-primary/8 to-violet-400/8 pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-gradient-to-tr from-indigo-400/6 to-sky-400/6 pointer-events-none" />

        <div className="relative z-10 p-10 text-center">
          {/* Avatar */}
          <div className="mx-auto mb-5 relative inline-block">
            <div className="h-28 w-28 overflow-hidden rounded-[1.5rem] bg-slate-50 border-4 border-white shadow-lg ring-2 ring-primary/20">
              {creator.profile_picture_url ? (
                <img src={creator.profile_picture_url} alt={creator.username} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-violet-400/20 text-5xl font-black text-primary">
                  {creator.full_name?.[0] || creator.username[0]}
                </div>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary shadow-md shadow-primary/40 border-2 border-white">
              <span className="material-symbols-outlined text-white text-sm">verified</span>
            </div>
          </div>

          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            {creator.full_name || `@${creator.username}`}
          </h1>
          <p className="mt-1 text-base text-slate-400 font-medium">@{creator.username}</p>

          {creator.biography && (
            <p className="mx-auto mt-5 max-w-lg text-[15px] text-slate-600 leading-relaxed">
              {creator.biography}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1.5 text-sm font-bold text-primary tracking-wide">
              {creator.niche}
            </span>
            {creator.city && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-4 py-1.5 text-sm font-semibold text-slate-600 border border-slate-200">
                <span className="material-symbols-outlined text-base" aria-hidden>location_on</span>
                {creator.city}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-bold text-emerald-700 border border-emerald-100">
              <span className="material-symbols-outlined text-base">bar_chart</span>
              {followerBucket}
            </span>
          </div>

          {/* Stats */}
          <div className="mt-8 flex items-stretch justify-center gap-6">
            {[
              { label: 'Followers', value: formatFollowers(creator.followers_count), icon: 'people' },
              { label: 'Posts', value: String(creator.media_count), icon: 'grid_view' },
            ].map(({ label, value, icon }) => (
              <div key={label} className="flex flex-col items-center gap-1 min-w-[80px]">
                <span className="material-symbols-outlined text-slate-300 text-lg">{icon}</span>
                <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons — hidden in PDF */}
        <div className="pdf-hide flex flex-col sm:flex-row items-stretch gap-3 border-t border-slate-100 p-5">
          {styleProfile && (
            <label className="flex flex-1 items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 cursor-pointer hover:bg-slate-50 transition-all font-semibold text-sm">
              <input
                type="checkbox"
                checked={includeAnalysis}
                onChange={(e) => setIncludeAnalysis(e.target.checked)}
                className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
              />
              Include AI Analysis in PDF
            </label>
          )}
          <button
            onClick={handleCopyLink}
            className="flex flex-1 items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all font-semibold text-sm"
          >
            {copied ? (
              <><span className="material-symbols-outlined text-emerald-500">check_circle</span><span className="text-emerald-600">Link Copied!</span></>
            ) : (
              <><span className="material-symbols-outlined">ios_share</span> Share Kit</>
            )}
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="flex flex-1 items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-white hover:bg-primary/90 transition-all font-bold text-sm shadow-md shadow-primary/30 disabled:opacity-60"
          >
            {downloading ? (
              <><span className="material-symbols-outlined animate-spin">progress_activity</span> Generating…</>
            ) : (
              <><span className="material-symbols-outlined">picture_as_pdf</span> Download PDF</>
            )}
          </button>
        </div>
      </div>

      {/* ── Rate Card ── */}
      {rates && (
        <div className="rounded-[1.75rem] bg-white border border-slate-100 shadow-lg shadow-slate-200/50 overflow-hidden">
          <div className="flex items-center justify-between px-8 pt-8 pb-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 border border-amber-100">
                <span className="material-symbols-outlined text-amber-500 text-lg">monetization_on</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">Rate Card</h2>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Benchmark Tier</p>
              <p className="text-sm font-bold text-primary">{followerBucket}</p>
            </div>
          </div>

          <div className="px-8 py-6 space-y-6">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Reel / Short', value: rates.reel_rate, light: 'bg-violet-50 border-violet-100' },
                { label: 'Story (24h)', value: rates.story_rate, light: 'bg-pink-50 border-pink-100' },
                { label: 'Static Post', value: rates.post_rate, light: 'bg-sky-50 border-sky-100' },
              ].map(r => (
                <div key={r.label} className={`rounded-2xl border p-5 text-center ${r.light}`}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{r.label}</p>
                  <p className="text-2xl font-black text-slate-900">{formatINR(r.value)}</p>
                </div>
              ))}
            </div>

            {rates.accepts_barter && (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
                <span className="material-symbols-outlined text-emerald-600 text-lg">handshake</span>
                <span className="text-sm font-bold text-emerald-800">Open to barter &amp; product exchange collaborations</span>
              </div>
            )}

            {benchmarks && (
              <BenchmarkDisplay
                benchmarks={benchmarks}
                niche={creator.niche}
                followerBucket={followerBucket}
                rates={{ reel: rates.reel_rate, story: rates.story_rate, post: rates.post_rate }}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Content Style / AI DNA ── */}
      {styleProfile && includeAnalysis && (
        <div className="rounded-[1.75rem] bg-white border border-slate-100 shadow-lg shadow-slate-200/50 overflow-hidden">
          <div className="flex items-center gap-3 px-8 pt-8 pb-5 border-b border-slate-100">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 border border-violet-100">
              <span className="material-symbols-outlined text-violet-500 text-lg">psychology</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">Content Style <span className="text-xs font-normal text-slate-400 italic">(AI Analysis)</span></h2>
          </div>
          <div className="px-8 py-6 space-y-6">
            <StyleDNA styleProfile={styleProfile} />
            {styleProfile.topics && styleProfile.topics.length > 0 && (
              <div className="border-t border-slate-100 pt-6">
                <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Dominant Topics</h3>
                <TopicCloud topics={styleProfile.topics} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Top Content Portfolio ── */}
      <div className="rounded-[1.75rem] bg-white border border-slate-100 shadow-lg shadow-slate-200/50 overflow-hidden">
        <div className="flex items-center gap-3 px-8 pt-8 pb-5 border-b border-slate-100">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 border border-rose-100">
            <span className="material-symbols-outlined text-rose-500 text-lg">play_circle</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">Top Content</h2>
        </div>
        <div className="px-8 py-6">
          {thumbnailUrls.length > 0 || videos.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {(thumbnailUrls.length > 0 ? thumbnailUrls.slice(0, 6) : videos.slice(0, 6)).map((item, idx) => (
                <div key={idx} className="aspect-[9/16] overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200 shadow-sm group relative">
                  {typeof item === 'string' ? (
                    <img src={item} alt={`Content ${idx + 1}`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <span className="material-symbols-outlined text-4xl text-slate-300">movie</span>
                    </div>
                  )}
                  {/* Hover overlay — interactive only, hidden in PDF */}
                  <div className="pdf-hide absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <span className="material-symbols-outlined text-white text-2xl">play_arrow</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex aspect-[9/16] items-center justify-center rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                  <span className="material-symbols-outlined text-3xl text-slate-200">video_camera_back</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer watermark — hidden from canvas capture; rendered by jsPDF on the last page */}
      <p className="pdf-hide text-center text-xs text-slate-400 pb-4">
        Generated by <span className="font-bold text-primary">ReachEzy</span> · India&apos;s Creator Intelligence Platform
      </p>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .mx-auto.max-w-3xl, .mx-auto.max-w-3xl * { visibility: visible; }
          .mx-auto.max-w-3xl { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
          .pdf-hide { display: none !important; }
          @page { size: A4; margin: 12mm; }
        }
      `}</style>
    </div>
  );
}
