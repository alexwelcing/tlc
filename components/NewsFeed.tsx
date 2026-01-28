import React, { useState, useEffect, useRef } from 'react';
import { FeedItem } from '../types';
import { ExternalLink, ChevronRight, ChevronLeft, Search, Bookmark, Play, Loader2, Sparkles } from 'lucide-react';
import { useEditorialAI } from '../hooks/useEditorialAI';

interface NewsFeedProps {
  items: FeedItem[];
  onArticleClick: (item: FeedItem) => void;
}

type Era = 'antique' | 'midcentury' | 'retro' | 'modern';

const getEra = (pub: string): Era => {
  const p = pub.toLowerCase();
  if (p.includes('18') || p.includes('intelligencer') || p.includes('recorder') || p.includes('jersey')) return 'antique';
  if (p.includes('daily') || p.includes('review')) return 'midcentury';
  if (p.includes('texas') || p.includes('american') || p.includes('national')) return 'retro';
  return 'modern';
};

const getEraPrompt = (era: Era): string => {
    switch(era) {
        case 'antique': return "1890s engraving style, monochrome, woodcut";
        case 'midcentury': return "1950s offset print, sepia toned, grainy";
        case 'retro': return "1980s color newsprint, halftone dots, vibrant but faded";
        default: return "Modern high-contrast editorial photography";
    }
}

const NewsFeed: React.FC<NewsFeedProps> = ({ items, onArticleClick }) => {
  const [page, setPage] = useState(0);
  const [animClass, setAnimClass] = useState('');
  const ITEMS_PER_PAGE = 6; // Reduced for vertical layout
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // GenAI Hook
  const { assets, generateEditorialIllustration, animateEditorial } = useEditorialAI();

  const currentItems = items.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
  const heroItem = currentItems[0];
  const belowFoldItem = currentItems[1]; // The item getting the video treatment

  // Reset page when items change
  useEffect(() => {
    setPage(0);
    setAnimClass('turn-page-enter');
  }, [items]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 0 || newPage >= totalPages) return;
    setAnimClass('turn-page-exit');
    setTimeout(() => {
      setPage(newPage);
      setAnimClass('turn-page-enter');
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 500);
  };

  // --- TRIFECTA: Hero Image Generation ---
  useEffect(() => {
    if (heroItem) {
        const era = getEra(heroItem.publication);
        generateEditorialIllustration(heroItem, getEraPrompt(era));
    }
  }, [heroItem, generateEditorialIllustration]);

  // --- TRIFECTA: Below Fold Generation (Delayed 5s) ---
  useEffect(() => {
    if (belowFoldItem) {
        const timer = setTimeout(() => {
            const era = getEra(belowFoldItem.publication);
            generateEditorialIllustration(belowFoldItem, getEraPrompt(era));
        }, 5000);
        return () => clearTimeout(timer);
    }
  }, [belowFoldItem, generateEditorialIllustration]);


  if (items.length === 0) {
    return (
        <div className="text-center py-24 px-4 border-2 border-ink border-dashed bg-sepia/30">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-2 border-stone-300 mb-4 text-stone-400">
                <Search size={24} />
            </div>
            <h3 className="text-xl font-display font-bold text-ink mb-2">Extra! Extra! No News Found!</h3>
            <p className="font-serif italic text-stone-600 max-w-sm mx-auto">We couldn't locate any stories matching your inquiry. Please adjust your criteria.</p>
        </div>
    );
  }

  const heroAsset = assets[heroItem?.id];
  const belowFoldAsset = assets[belowFoldItem?.id];

  return (
    <div ref={containerRef} className="perspective-[2000px] overflow-hidden py-4 flex justify-center">
      
      {/* Tablet / Vertical Paper Container */}
      <div 
        className={`bg-paper border-x-2 md:border-2 border-stone-300 shadow-2xl p-6 md:p-8 min-h-[1100px] w-full max-w-[800px] relative origin-top paper-distortion transition-transform duration-500 ${animClass}`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Paper texture */}
        <div className="absolute inset-0 bg-[#f4f1ea] opacity-50 mix-blend-multiply pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.1\'/%3E%3C/svg%3E")' }}></div>

        {/* Header */}
        <div className="flex justify-between items-center border-b-4 border-double border-ink mb-8 pb-2 relative z-10">
           <div className="text-xs font-branding font-bold uppercase tracking-widest text-stone-500">
              Page {page + 1}
           </div>
           <div className="text-xs font-mono text-stone-400">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
           </div>
        </div>

        {/* --- HERO ARTICLE (Adaptive Layout) --- */}
        {heroItem && (
            <div className="mb-10 relative z-10 group cursor-pointer" onClick={() => onArticleClick(heroItem)}>
                
                {/* Image Container with Strategic Overlay */}
                <div className={`relative w-full transition-all duration-1000 ease-in-out border-ink ${heroAsset?.imageUrl ? 'h-[400px] border-b-2 mb-4' : 'h-0 border-none'}`}>
                     {heroAsset?.imageUrl && (
                         <div className="w-full h-full relative overflow-hidden">
                             <img 
                                src={heroAsset.imageUrl} 
                                className="w-full h-full object-cover animate-in fade-in duration-1000 img-style-modern"
                             />
                             {/* Intelligent Gradient Overlay for Text Readability */}
                             <div className="absolute inset-0 video-gradient flex flex-col justify-end p-6">
                                <span className="text-paper/90 font-branding font-bold text-xs uppercase tracking-widest mb-2 border-l-2 border-accent pl-2">
                                    Lead Story • {heroItem.publication}
                                </span>
                                <h2 className="text-3xl md:text-5xl font-display font-bold text-paper leading-[0.95] drop-shadow-md">
                                    {heroItem.title}
                                </h2>
                             </div>
                         </div>
                     )}
                </div>

                {/* If Image hasn't loaded yet, show title normally */}
                {!heroAsset?.imageUrl && (
                    <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-ink text-paper text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-wide">
                                Lead Story
                            </span>
                            <span className="text-xs font-branding font-bold uppercase text-accent">
                                {heroItem.publication}
                            </span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-display font-bold text-ink leading-[0.95]">
                             {heroItem.title}
                        </h2>
                    </div>
                )}

                <div className="columns-1 md:columns-2 gap-6 text-stone-800 font-serif text-sm leading-relaxed text-justify border-b border-ink/20 pb-6">
                    <p className="first-letter:text-4xl first-letter:font-display first-letter:font-bold first-letter:float-left first-letter:mr-2 first-letter:leading-none">
                        {heroItem.summary}
                    </p>
                    <p className="mt-4 text-xs font-sans text-stone-500 italic">
                        Click to read full analysis...
                    </p>
                </div>
            </div>
        )}

        {/* --- BELOW FOLD (Video Potential) --- */}
        {belowFoldItem && (
            <div className="mb-10 relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 border-b border-ink/20 pb-6">
                <div className="md:col-span-7 flex flex-col justify-center">
                    <span className="text-[10px] font-branding font-bold uppercase text-stone-400 mb-1">{belowFoldItem.publication}</span>
                    <h3 className="text-2xl font-display font-bold text-ink leading-tight mb-2 hover:text-accent cursor-pointer" onClick={() => onArticleClick(belowFoldItem)}>
                        {belowFoldItem.title}
                    </h3>
                    <p className="font-serif text-xs text-stone-600 line-clamp-3 leading-relaxed mb-2">
                        {belowFoldItem.summary}
                    </p>
                    {/* Video Status Indicator */}
                    {belowFoldAsset?.status === 'filming' && (
                         <div className="flex items-center gap-2 text-[10px] font-mono text-accent animate-pulse">
                            <Loader2 size={10} className="animate-spin" /> Producing News Clip...
                         </div>
                    )}
                </div>

                {/* The Video/Image Box */}
                <div className="md:col-span-5 h-[200px] bg-stone-200 border border-ink relative overflow-hidden group">
                    {belowFoldAsset?.videoUrl ? (
                         <video 
                            src={belowFoldAsset.videoUrl} 
                            autoPlay 
                            loop 
                            muted 
                            className="w-full h-full object-cover"
                         />
                    ) : belowFoldAsset?.imageUrl ? (
                        <>
                            <img 
                                src={belowFoldAsset.imageUrl} 
                                className="w-full h-full object-cover img-style-retro"
                            />
                            {/* Play Button Overlay */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); animateEditorial(belowFoldItem.id, belowFoldItem.title); }}
                                className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors group-hover:scale-110 duration-300"
                            >
                                <div className="w-12 h-12 rounded-full border-2 border-paper flex items-center justify-center bg-accent text-paper shadow-lg">
                                    {belowFoldAsset.status === 'filming' ? (
                                        <Loader2 size={20} className="animate-spin" />
                                    ) : (
                                        <Play size={20} fill="currentColor" />
                                    )}
                                </div>
                            </button>
                            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] font-bold px-1.5 rounded">
                                WATCH CLIP
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full text-stone-400">
                             <span className="text-[10px] font-branding uppercase opacity-50">Wire Photo Incoming...</span>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* --- REMAINING SHORTS --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 relative z-10">
            {currentItems.slice(2).map((item) => (
                <div key={item.id} className="cursor-pointer group" onClick={() => onArticleClick(item)}>
                     <div className="flex items-center gap-1 mb-1">
                        <Bookmark size={10} className="text-stone-400 group-hover:text-accent" />
                        <span className="text-[9px] font-branding font-bold uppercase text-stone-500 truncate max-w-full">
                            {item.primaryCategory?.name || 'General'}
                        </span>
                    </div>
                    <h4 className="text-sm font-display font-bold text-ink mb-1 leading-snug group-hover:underline decoration-1 underline-offset-2">
                        {item.title}
                    </h4>
                    <div className="text-[10px] font-mono text-stone-400">
                        {item.readtime} min • {item.source}
                    </div>
                </div>
            ))}
        </div>
        
        {/* Pagination Controls */}
        <div className="mt-12 pt-6 border-t-2 border-stone-300 flex justify-between items-center z-20">
             <button 
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 0}
                className="group flex items-center gap-2 px-4 py-2 hover:bg-sepia disabled:opacity-30 transition-all font-branding font-bold text-xs uppercase"
             >
                <ChevronLeft size={14} /> Previous
             </button>

             <span className="text-[10px] font-mono text-stone-400">
                {page + 1} / {totalPages}
             </span>

             <button 
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages - 1}
                className="group flex items-center gap-2 px-4 py-2 hover:bg-sepia disabled:opacity-30 transition-all font-branding font-bold text-xs uppercase"
             >
                Next <ChevronRight size={14} />
             </button>
        </div>

      </div>
    </div>
  );
};

export default NewsFeed;