import React, { useState, useEffect, useRef } from 'react';
import { FeedItem } from '../types';
import { ChevronRight, ChevronLeft, Play, Loader2, BookOpen, Clock } from 'lucide-react';
import { useEditorialAI } from '../hooks/useEditorialAI';

interface NewsFeedProps {
  items: FeedItem[];
  onArticleClick: (item: FeedItem) => void;
}

const getEraPrompt = (pub: string): string => {
  const p = pub.toLowerCase();
  if (p.includes('18') || p.includes('intelligencer') || p.includes('recorder') || p.includes('jersey')) return "1890s engraving style, monochrome, woodcut";
  if (p.includes('daily') || p.includes('review')) return "1950s offset print, sepia toned, grainy";
  if (p.includes('texas') || p.includes('american') || p.includes('national')) return "1980s color newsprint, halftone dots, vibrant but faded";
  return "Modern high-contrast editorial photography";
};

const NewsFeed: React.FC<NewsFeedProps> = ({ items, onArticleClick }) => {
  const [page, setPage] = useState(0);
  const [animClass, setAnimClass] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Increased to 12 for a dense, text-heavy newspaper feel
  // Front Page: 1 Hero + 1 Secondary + 10 Briefs
  // Inner Pages: 6 Left + 6 Right
  const ITEMS_PER_PAGE = 12;
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const currentItems = items.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
  const isFrontPage = page === 0;

  // AI Hook
  const { assets, generateEditorialIllustration, animateEditorial } = useEditorialAI();

  // Reset page when items change
  useEffect(() => {
    setPage(0);
    setAnimClass('turn-page-enter');
  }, [items]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 0 || newPage >= totalPages) return;
    setAnimClass('turn-page-exit');
    
    // Scroll to top smoothly before flipping
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    setTimeout(() => {
      setPage(newPage);
      setAnimClass('turn-page-enter');
    }, 300);
  };

  // --- Generation Logic ---
  useEffect(() => {
    currentItems.forEach((item, index) => {
        // Only generate for Hero (index 0 on page 0) and Secondary (index 1 on page 0)
        if (page === 0 && index <= 1) {
             const timer = setTimeout(() => {
                generateEditorialIllustration(item, getEraPrompt(item.publication));
             }, index * 1500); 
             return () => clearTimeout(timer);
        }
    });
  }, [currentItems, page, generateEditorialIllustration]);

  if (items.length === 0) {
    return (
        <div className="text-center py-32 px-4 border-2 border-stone-200 border-dashed rounded bg-sepia/10">
            <h3 className="text-xl font-display font-bold text-ink mb-2">No News Found</h3>
            <p className="font-serif italic text-stone-500">Adjust your indices to view records.</p>
        </div>
    );
  }

  // Assets for front page specific layout
  const heroItem = isFrontPage ? currentItems[0] : null;
  const secondaryItem = isFrontPage ? currentItems[1] : null;
  
  const heroAsset = heroItem ? assets[heroItem.id] : null;
  const secondaryAsset = secondaryItem ? assets[secondaryItem.id] : null;
  
  const secondaryHasMedia = !!(secondaryAsset?.imageUrl || secondaryAsset?.videoUrl);

  return (
    <div ref={containerRef} className="perspective-[2000px] py-4 flex justify-center w-full">
      
      <div 
        className={`
            bg-[#f4f1ea] shadow-2xl relative origin-top paper-distortion transition-all duration-700 ease-in-out
            ${animClass}
            ${isFrontPage ? 'max-w-[1000px] border-x border-stone-300' : 'max-w-[1400px] border-none'}
            w-full min-h-[90vh] pb-24
        `}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Paper Texture Overlay */}
        <div className="absolute inset-0 bg-[#f4f1ea] opacity-40 mix-blend-multiply pointer-events-none z-0" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.05\'/%3E%3C/svg%3E")' }}></div>

        {/* --- FRONT PAGE LAYOUT --- */}
        {isFrontPage && (
            <div className="p-8 md:p-12 relative z-10">
                {/* Page Header */}
                <div className="flex justify-between items-center border-b border-ink/40 mb-8 pb-1">
                    <span className="text-[10px] font-branding font-bold uppercase tracking-widest text-stone-400">Page 1 • Headlines</span>
                    <span className="text-[10px] font-mono text-stone-300">Section A</span>
                </div>

                {/* Hero Article */}
                {heroItem && (
                    <div className="mb-10 cursor-pointer group" onClick={() => onArticleClick(heroItem)}>
                         {/* Dynamic Image Container: Height 0 if no image, expands when ready */}
                         <div className={`relative w-full transition-all duration-1000 ease-in-out ${heroAsset?.imageUrl ? 'h-[400px] mb-6' : 'h-0'}`}>
                             {heroAsset?.imageUrl && (
                                 <div className="w-full h-full overflow-hidden relative border border-stone-200">
                                     <img src={heroAsset.imageUrl} className="w-full h-full object-cover img-style-modern animate-in fade-in duration-1000" />
                                     <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />
                                     <div className="absolute bottom-4 left-4 right-4 text-paper">
                                         <div className="text-[10px] font-bold uppercase tracking-widest mb-1 text-accent">{heroItem.publication}</div>
                                         <h2 className="text-3xl md:text-5xl font-display font-bold leading-none drop-shadow-sm">{heroItem.title}</h2>
                                     </div>
                                 </div>
                             )}
                         </div>

                         {/* Text Fallback if no image yet */}
                         {!heroAsset?.imageUrl && (
                             <div className="mb-4">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-accent mb-1 block">{heroItem.publication}</span>
                                <h2 className="text-4xl md:text-6xl font-display font-black text-ink leading-[0.9] mb-4 group-hover:text-stone-700 transition-colors">
                                    {heroItem.title}
                                </h2>
                             </div>
                         )}

                         <div className="columns-1 md:columns-2 gap-8 text-stone-800 font-serif text-sm leading-relaxed text-justify">
                            <p className="first-letter:text-5xl first-letter:font-display first-letter:font-bold first-letter:float-left first-letter:mr-3 first-letter:leading-none">
                                {heroItem.summary}
                            </p>
                         </div>
                    </div>
                )}

                {/* The Fold Gradient */}
                <div className="h-12 w-[calc(100%+6rem)] -mx-12 bg-gradient-to-b from-stone-900/5 to-transparent my-8 pointer-events-none relative flex items-center justify-center">
                    <div className="absolute top-0 left-12 right-12 border-t border-stone-300 border-dashed opacity-50"></div>
                </div>

                {/* Secondary Story & Briefs */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    {/* Secondary Story - Dynamic Width */}
                    {secondaryItem && (
                        <div className={`${secondaryHasMedia ? 'md:col-span-7' : 'md:col-span-12'} flex flex-col justify-start transition-all duration-700`}>
                            <div className="mb-6 cursor-pointer group" onClick={() => onArticleClick(secondaryItem)}>
                                <span className="text-[10px] font-bold uppercase text-stone-400 mb-1 block">{secondaryItem.publication}</span>
                                <h3 className="text-3xl font-display font-bold text-ink leading-tight mb-3 group-hover:underline decoration-1 underline-offset-4">
                                    {secondaryItem.title}
                                </h3>
                                <p className="font-serif text-sm text-stone-600 leading-relaxed text-justify">
                                    {secondaryItem.summary}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Media Column (Video/Image) - Only renders if media is READY */}
                    {secondaryHasMedia && (
                        <div className="md:col-span-5 relative animate-in slide-in-from-right duration-700">
                             <div className="aspect-[4/3] w-full bg-stone-100 relative overflow-hidden group border border-stone-200 shadow-sm">
                                {secondaryAsset?.videoUrl ? (
                                    <video src={secondaryAsset.videoUrl} autoPlay loop muted className="w-full h-full object-cover" />
                                ) : (
                                    <>
                                        <img src={secondaryAsset?.imageUrl || ''} className="w-full h-full object-cover img-style-retro grayscale hover:grayscale-0 transition-all duration-500" />
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); secondaryItem && animateEditorial(secondaryItem.id, secondaryItem.title); }}
                                                className="bg-accent text-paper p-3 rounded-full shadow-lg hover:scale-110 transition-transform"
                                            >
                                                {secondaryAsset?.status === 'filming' ? <Loader2 className="animate-spin" size={20}/> : <Play size={20} fill="currentColor"/>}
                                            </button>
                                        </div>
                                    </>
                                )}
                             </div>
                             <div className="mt-2 text-[9px] font-mono text-stone-400 text-right">
                                Fig 1. Automated Illustration
                             </div>
                        </div>
                    )}
                    
                    {/* Dense Briefs Grid - Renders all remaining items in a tight masonry layout */}
                    {currentItems.slice(2).length > 0 && (
                        <div className="md:col-span-12 border-t-2 border-ink pt-6 mt-4">
                             <div className="mb-4 text-[10px] font-branding font-bold uppercase tracking-widest text-stone-500">In Brief</div>
                             <div className="columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6">
                                {currentItems.slice(2).map(item => (
                                    <div key={item.id} onClick={() => onArticleClick(item)} className="break-inside-avoid cursor-pointer group mb-6">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[9px] font-bold uppercase text-accent">{item.primaryCategory?.name || 'Wire'}</span>
                                            <span className="text-[9px] text-stone-300">•</span>
                                            <span className="text-[9px] font-mono text-stone-400">{item.publication}</span>
                                        </div>
                                        <h4 className="font-display font-bold text-sm leading-snug group-hover:text-stone-600 transition-colors mb-2">
                                            {item.title}
                                        </h4>
                                        <p className="text-[11px] font-serif text-stone-500 line-clamp-3 leading-relaxed">
                                            {item.summary}
                                        </p>
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* --- INNER SPREAD LAYOUT (Pages 2+) --- */}
        {!isFrontPage && (
            <div className="flex flex-col md:flex-row h-full relative z-10">
                {/* Spine */}
                <div className="hidden md:block absolute left-1/2 inset-y-0 w-px bg-gradient-to-r from-stone-300 via-stone-400 to-stone-300 z-20 shadow-[0_0_15px_rgba(0,0,0,0.1)]"></div>
                
                {/* Left Page (Items 0-5) */}
                <div className="flex-1 p-8 md:p-12 md:pr-16 border-b md:border-b-0 md:border-r border-stone-200 bg-[#f8f5ee]">
                    <div className="flex justify-between items-center mb-8 pb-1 border-b border-stone-300">
                        <span className="text-[10px] font-bold uppercase text-stone-400">Page {page * 2}</span>
                        <span className="text-[10px] font-mono text-stone-300">{new Date().toLocaleDateString()}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-8">
                        {currentItems.slice(0, 6).map((item, idx) => (
                             <div key={item.id} onClick={() => onArticleClick(item)} className="cursor-pointer group border-b border-stone-200 pb-6 last:border-0">
                                {idx === 0 && <div className="h-1 w-8 bg-accent mb-3"></div>}
                                <div className="flex justify-between items-start gap-4 mb-2">
                                    <h3 className="text-lg font-display font-bold text-ink leading-tight group-hover:text-accent transition-colors">
                                        {item.title}
                                    </h3>
                                    {idx < 2 && <span className="text-[9px] font-bold uppercase border border-ink px-1 pt-0.5">{item.primaryCategory?.name?.slice(0,3)}</span>}
                                </div>
                                <p className="font-serif text-xs text-stone-600 line-clamp-2 mb-2">{item.summary}</p>
                                <div className="flex items-center gap-2 text-[10px] font-mono text-stone-400 uppercase tracking-wider">
                                    <span>{item.publication}</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1"><Clock size={10}/> {item.readtime}m</span>
                                </div>
                             </div>
                        ))}
                    </div>
                </div>

                {/* Right Page (Items 6-11) */}
                <div className="flex-1 p-8 md:p-12 md:pl-16 bg-[#f4f1ea]">
                    <div className="flex justify-between items-center mb-8 pb-1 border-b border-stone-300">
                        <span className="text-[10px] font-mono text-stone-300">Analysis & Briefs</span>
                        <span className="text-[10px] font-bold uppercase text-stone-400">Page {page * 2 + 1}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                        {currentItems.slice(6, 12).map((item, idx) => (
                             <div key={item.id} onClick={() => onArticleClick(item)} className="cursor-pointer group flex flex-col h-full">
                                <div className="mb-auto">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[9px] font-bold uppercase bg-stone-200 px-1 py-0.5 text-stone-600">{item.primaryCategory?.name || 'News'}</span>
                                    </div>
                                    <h3 className="text-base font-display font-bold text-ink mb-2 leading-tight group-hover:underline decoration-1 underline-offset-2">
                                        {item.title}
                                    </h3>
                                    <p className="font-serif text-[11px] text-stone-500 line-clamp-3">{item.summary}</p>
                                </div>
                                <div className="mt-3 pt-3 border-t border-stone-200 text-[9px] font-mono text-stone-400 italic">
                                    {item.publication}
                                </div>
                             </div>
                        ))}
                        {currentItems.slice(6, 12).length === 0 && (
                            <div className="col-span-2 h-full flex items-center justify-center opacity-20">
                                <BookOpen size={48} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* --- PAGINATION (Fixed Visibility) --- */}
        <div className="absolute bottom-6 left-0 right-0 px-8 md:px-12 flex justify-between items-center z-50">
             <button 
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 0}
                className={`
                    flex items-center gap-2 px-4 py-2 bg-paper/90 border border-stone-300 shadow-sm
                    text-[10px] font-bold uppercase tracking-widest transition-all
                    ${page === 0 ? 'opacity-0 pointer-events-none' : 'text-stone-500 hover:text-ink hover:border-ink cursor-pointer'}
                `}
             >
                <ChevronLeft size={12} /> Prev Page
             </button>

             <span className="text-[10px] font-mono text-stone-400 hidden md:block">
                 Vol. {page + 1} of {totalPages}
             </span>

             <button 
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages - 1}
                className={`
                    flex items-center gap-2 px-4 py-2 bg-paper/90 border border-stone-300 shadow-sm
                    text-[10px] font-bold uppercase tracking-widest transition-all
                    ${page >= totalPages - 1 ? 'opacity-0 pointer-events-none' : 'text-stone-500 hover:text-ink hover:border-ink cursor-pointer'}
                `}
             >
                Next Page <ChevronRight size={12} />
             </button>
        </div>

      </div>
    </div>
  );
};

export default NewsFeed;