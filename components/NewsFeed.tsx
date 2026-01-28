import React, { useState, useEffect, useRef } from 'react';
import { FeedItem } from '../types';
import { ChevronRight, ChevronLeft, Play, Loader2, BookOpen, Clock, Layout, Scroll } from 'lucide-react';
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
  const [isTabletMode, setIsTabletMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Responsive Detection
  useEffect(() => {
    const checkTablet = () => {
      // < 1024px is considered Tablet/Mobile for this view mode
      setIsTabletMode(window.innerWidth < 1024);
    };
    
    checkTablet();
    window.addEventListener('resize', checkTablet);
    return () => window.removeEventListener('resize', checkTablet);
  }, []);

  // Items Per Page
  // Front Page: 1 Hero + 1 Secondary + 10 Briefs = 12
  // Inner Spread: 1 Spanning Feature + 4 Left + 4 Right = 9
  const ITEMS_PER_PAGE = page === 0 ? 12 : 9;

  // We need to calculate slices dynamically because page size changes
  // But for simplicity in this pivot app, let's keep it fixed at 12 and hide extras on inner pages or just flow them.
  // Actually, to make pagination stable, we should use a fixed number or complex logic.
  // Let's stick to 10 for consistency across all pages to keep math simple, 
  // or just accept that page 0 has more density.
  // Let's use 10.
  const FIXED_PAGE_SIZE = 10;
  
  const totalPages = Math.ceil(items.length / FIXED_PAGE_SIZE);
  const currentItems = items.slice(page * FIXED_PAGE_SIZE, (page + 1) * FIXED_PAGE_SIZE);
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
    
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    setTimeout(() => {
      setPage(newPage);
      setAnimClass('turn-page-enter');
    }, 500); // Wait for exit animation
  };

  // --- Generation Logic ---
  useEffect(() => {
    // Generate logic differs by mode
    if (isTabletMode) {
        // Endless scroll: Generate for visible items loosely (first 5)
        items.slice(0, 5).forEach((item, index) => {
             const timer = setTimeout(() => {
                generateEditorialIllustration(item, getEraPrompt(item.publication));
             }, index * 2000);
             return () => clearTimeout(timer);
        });
    } else {
        // Pagination mode
        currentItems.forEach((item, index) => {
            // Front Page: Hero (0) & Secondary (1)
            // Inner Page: Feature (0)
            const shouldGenerate = (isFrontPage && index <= 1) || (!isFrontPage && index === 0);
            
            if (shouldGenerate) {
                 const timer = setTimeout(() => {
                    generateEditorialIllustration(item, getEraPrompt(item.publication));
                 }, index * 1500); 
                 return () => clearTimeout(timer);
            }
        });
    }
  }, [currentItems, page, isTabletMode, isFrontPage, items]);

  if (items.length === 0) {
    return (
        <div className="text-center py-32 px-4 border-2 border-stone-200 border-dashed rounded bg-sepia/10">
            <h3 className="text-xl font-display font-bold text-ink mb-2">No News Found</h3>
            <p className="font-serif italic text-stone-500">Adjust your indices to view records.</p>
        </div>
    );
  }

  // --- TABLET / MOBILE ENDLESS SCROLL MODE ---
  if (isTabletMode) {
      return (
          <div className="max-w-2xl mx-auto py-8 px-4 animate-in fade-in duration-500">
              <div className="flex items-center justify-center gap-2 mb-8 text-stone-400">
                  <Scroll size={16} />
                  <span className="text-xs font-branding font-bold uppercase tracking-widest">Endless Scroll</span>
              </div>
              <div className="space-y-12">
                  {items.map((item, index) => {
                      const asset = assets[item.id];
                      return (
                          <div key={item.id} onClick={() => onArticleClick(item)} className="bg-paper border-b border-stone-300 pb-8 last:border-0 cursor-pointer group">
                              <div className="flex justify-between items-baseline mb-2">
                                  <span className="text-[10px] font-bold uppercase text-accent">{item.publication}</span>
                                  <span className="text-[10px] font-mono text-stone-400">{new Date(item.publishedAt).toLocaleDateString()}</span>
                              </div>
                              <h3 className="text-2xl font-display font-bold text-ink mb-3 leading-tight group-hover:text-accent transition-colors">
                                  {item.title}
                              </h3>
                              
                              {/* Occasional Image in Stream */}
                              {asset?.imageUrl && (
                                  <div className="mb-4 rounded overflow-hidden border border-stone-200 aspect-video">
                                      <img src={asset.imageUrl} className="w-full h-full object-cover img-style-modern" />
                                  </div>
                              )}

                              <p className="font-serif text-sm text-stone-600 leading-relaxed line-clamp-4">
                                  {item.summary}
                              </p>
                              <div className="mt-4 flex gap-2">
                                  {item.categories.slice(0, 3).map(c => (
                                      <span key={c.name} className="px-2 py-0.5 bg-stone-200 text-[9px] font-bold uppercase text-stone-600">{c.name}</span>
                                  ))}
                              </div>
                          </div>
                      );
                  })}
              </div>
              <div className="py-12 text-center text-stone-400 text-sm font-serif italic">
                  End of Wire
              </div>
          </div>
      );
  }

  // --- DESKTOP PAGINATED SPREAD MODE ---

  // Assets for specific items on current page
  const item0 = currentItems[0];
  const item1 = currentItems[1];
  const asset0 = item0 ? assets[item0.id] : null;
  const asset1 = item1 ? assets[item1.id] : null;
  const item1HasMedia = !!(asset1?.imageUrl || asset1?.videoUrl);

  return (
    <div ref={containerRef} className="perspective-container py-4 flex justify-center w-full overflow-visible">
      
      <div 
        className={`
            bg-[#f4f1ea] shadow-2xl relative origin-left transition-all duration-800 ease-in-out
            ${animClass}
            ${isFrontPage ? 'max-w-[1000px] border-x border-stone-300' : 'max-w-[1400px] border-none'}
            w-full min-h-[90vh] pb-24
            paper-distortion
        `}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Paper Texture Overlay */}
        <div className="absolute inset-0 bg-[#f4f1ea] opacity-40 mix-blend-multiply pointer-events-none z-0" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.05\'/%3E%3C/svg%3E")' }}></div>

        {/* --- FRONT PAGE LAYOUT --- */}
        {isFrontPage && (
            <div className="p-12 relative z-10">
                {/* Header */}
                <div className="flex justify-between items-center border-b border-ink/40 mb-8 pb-1">
                    <span className="text-[10px] font-branding font-bold uppercase tracking-widest text-stone-400">Page 1 • Headlines</span>
                    <span className="text-[10px] font-mono text-stone-300">Section A</span>
                </div>

                {/* Main Headline Story (Item 0) */}
                {item0 && (
                    <div className="mb-10 cursor-pointer group" onClick={() => onArticleClick(item0)}>
                         <div className={`relative w-full transition-all duration-1000 ease-in-out ${asset0?.imageUrl ? 'h-[450px] mb-6' : 'h-0'}`}>
                             {asset0?.imageUrl && (
                                 <div className="w-full h-full overflow-hidden relative border border-stone-200 shadow-sm">
                                     <img src={asset0.imageUrl} className="w-full h-full object-cover img-style-modern animate-in fade-in duration-1000" />
                                     <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-90" />
                                     <div className="absolute bottom-6 left-6 right-6 text-paper">
                                         <div className="text-[11px] font-bold uppercase tracking-widest mb-2 text-accent border-b border-accent inline-block pb-0.5">{item0.publication}</div>
                                         <h2 className="text-4xl md:text-6xl font-display font-bold leading-none drop-shadow-md max-w-4xl">{item0.title}</h2>
                                     </div>
                                 </div>
                             )}
                         </div>

                         {!asset0?.imageUrl && (
                             <div className="mb-6 text-center">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-accent mb-2 block">{item0.publication}</span>
                                <h2 className="text-5xl md:text-7xl font-display font-black text-ink leading-[0.9] mb-4 group-hover:text-stone-700 transition-colors">
                                    {item0.title}
                                </h2>
                                <div className="h-1 w-24 bg-ink mx-auto my-6"></div>
                             </div>
                         )}

                         <div className="columns-2 gap-8 text-stone-800 font-serif text-sm leading-relaxed text-justify border-b border-stone-200 pb-8">
                            <p className="first-letter:text-5xl first-letter:font-display first-letter:font-bold first-letter:float-left first-letter:mr-3 first-letter:leading-none">
                                {item0.summary}
                            </p>
                         </div>
                    </div>
                )}

                {/* Secondary Story & Briefs */}
                <div className="grid grid-cols-12 gap-8">
                    {/* Secondary (Item 1) */}
                    {item1 && (
                        <div className={`${item1HasMedia ? 'col-span-7' : 'col-span-12'} flex flex-col justify-start`}>
                            <div className="mb-6 cursor-pointer group" onClick={() => onArticleClick(item1)}>
                                <span className="text-[10px] font-bold uppercase text-stone-400 mb-1 block">{item1.publication}</span>
                                <h3 className="text-3xl font-display font-bold text-ink leading-tight mb-3 group-hover:underline decoration-1 underline-offset-4">
                                    {item1.title}
                                </h3>
                                <p className="font-serif text-sm text-stone-600 leading-relaxed text-justify">
                                    {item1.summary}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Secondary Media */}
                    {item1HasMedia && (
                        <div className="col-span-5 relative animate-in slide-in-from-right duration-700 pt-2">
                             <div className="aspect-[4/3] w-full bg-stone-100 relative overflow-hidden group border border-stone-200 shadow-sm">
                                {asset1?.videoUrl ? (
                                    <video src={asset1.videoUrl} autoPlay loop muted className="w-full h-full object-cover" />
                                ) : (
                                    <>
                                        <img src={asset1?.imageUrl || ''} className="w-full h-full object-cover img-style-retro grayscale hover:grayscale-0 transition-all duration-500" />
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); item1 && animateEditorial(item1.id, item1.title); }}
                                                className="bg-accent text-paper p-3 rounded-full shadow-lg hover:scale-110 transition-transform"
                                            >
                                                {asset1?.status === 'filming' ? <Loader2 className="animate-spin" size={20}/> : <Play size={20} fill="currentColor"/>}
                                            </button>
                                        </div>
                                    </>
                                )}
                             </div>
                        </div>
                    )}
                    
                    {/* Masonry Briefs (Remaining Items) */}
                    {currentItems.slice(2).length > 0 && (
                        <div className="col-span-12 border-t-4 border-double border-stone-300 pt-6 mt-2">
                             <div className="columns-4 gap-6 space-y-6">
                                {currentItems.slice(2).map(item => (
                                    <div key={item.id} onClick={() => onArticleClick(item)} className="break-inside-avoid cursor-pointer group mb-6 bg-white/40 p-3 border border-stone-100 hover:border-stone-300 transition-colors shadow-sm">
                                        <div className="text-[9px] font-bold uppercase text-stone-400 mb-1">{item.publication}</div>
                                        <h4 className="font-display font-bold text-sm leading-snug group-hover:text-accent transition-colors mb-2">
                                            {item.title}
                                        </h4>
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
            <div className="relative z-10 h-full flex flex-col">
                
                {/* Spine Overlay */}
                <div className="absolute left-1/2 inset-y-0 w-px bg-gradient-to-r from-stone-400/30 to-transparent z-0"></div>

                {/* --- SPREAD HEADER: Item 0 Spans the Page --- */}
                {item0 && (
                    <div className="w-full px-12 pt-10 pb-8 border-b border-stone-300 mb-0 relative z-10 bg-[#f4f1ea]/80 backdrop-blur-[1px]">
                         <div className="text-center max-w-4xl mx-auto cursor-pointer group" onClick={() => onArticleClick(item0)}>
                            <div className="flex items-center justify-center gap-3 mb-3">
                                <span className="h-px w-8 bg-accent"></span>
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">{item0.publication}</span>
                                <span className="h-px w-8 bg-accent"></span>
                            </div>
                            <h2 className="text-4xl md:text-5xl font-display font-black text-ink mb-4 leading-none group-hover:text-stone-700 transition-colors">
                                {item0.title}
                            </h2>
                            {/* Summary split across center? No, kept in one block for readability, but styled as a lead */}
                            <p className="font-serif text-lg text-stone-600 italic max-w-2xl mx-auto leading-relaxed">
                                {item0.summary}
                            </p>
                            
                            {/* If Item 0 has an image, render it wide */}
                            {asset0?.imageUrl && (
                                <div className="mt-8 h-[250px] w-full overflow-hidden border-y-4 border-double border-stone-300 relative">
                                    <img src={asset0.imageUrl} className="w-full h-full object-cover object-center opacity-90 grayscale-[20%]" />
                                    <div className="absolute inset-0 bg-stone-900/10 mix-blend-multiply"></div>
                                </div>
                            )}
                         </div>
                    </div>
                )}

                {/* --- 2-PAGE COLUMNS --- */}
                <div className="flex-1 flex flex-row relative">
                    {/* LEFT PAGE (Items 1, 2, 3, 4) */}
                    <div className="flex-1 p-8 md:p-12 md:pr-16 border-r border-stone-200/50 bg-[#f8f5ee]">
                         <div className="space-y-8">
                            {currentItems.slice(1, 5).map((item, i) => (
                                <div key={item.id} onClick={() => onArticleClick(item)} className="cursor-pointer group flex gap-4">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-display font-bold text-ink mb-1 group-hover:underline decoration-1 underline-offset-2 leading-tight">
                                            {item.title}
                                        </h3>
                                        <div className="text-[9px] font-mono text-stone-400 mb-1">{item.publication}</div>
                                        <p className="text-xs font-serif text-stone-500 line-clamp-2">{item.summary}</p>
                                    </div>
                                    {i === 0 && (
                                        <div className="w-24 h-24 bg-stone-200 shrink-0 border border-stone-300">
                                            {/* Placeholder for small article thumb if we generated one, else abstract pattern */}
                                            <div className="w-full h-full opacity-10 bg-[radial-gradient(circle,_#000_1px,_transparent_1px)] bg-[length:4px_4px]"></div>
                                        </div>
                                    )}
                                </div>
                            ))}
                         </div>
                         <div className="mt-auto pt-8 flex justify-between items-end border-t border-stone-300 mt-8">
                             <span className="text-[9px] font-bold uppercase text-stone-400">Page {page * 2}</span>
                         </div>
                    </div>

                    {/* RIGHT PAGE (Items 5, 6, 7, 8, 9) */}
                    <div className="flex-1 p-8 md:p-12 md:pl-16 bg-[#f4f1ea]">
                         <div className="columns-1 gap-8 space-y-8">
                            {currentItems.slice(5).map((item) => (
                                <div key={item.id} onClick={() => onArticleClick(item)} className="cursor-pointer group break-inside-avoid">
                                    <span className="text-[9px] font-bold uppercase bg-stone-200 px-1 text-stone-600 inline-block mb-1">{item.primaryCategory?.name || 'Wire'}</span>
                                    <h3 className="text-base font-display font-bold text-ink mb-1 group-hover:text-accent transition-colors leading-snug">
                                        {item.title}
                                    </h3>
                                    <p className="text-[11px] font-serif text-stone-500 line-clamp-3 leading-relaxed border-l-2 border-stone-200 pl-2">
                                        {item.summary}
                                    </p>
                                </div>
                            ))}
                         </div>
                         <div className="mt-auto pt-8 flex justify-between items-end border-t border-stone-300 mt-8">
                             <span className="text-[9px] font-mono text-stone-300 italic">Legal Proceedings & Analysis</span>
                             <span className="text-[9px] font-bold uppercase text-stone-400">Page {page * 2 + 1}</span>
                         </div>
                    </div>
                </div>
            </div>
        )}

        {/* --- PAGINATION CONTROLS (Only visible on Desktop) --- */}
        <div className="absolute bottom-8 -left-8 -right-8 px-12 flex justify-between items-center z-50 pointer-events-none">
             <button 
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 0}
                className={`
                    pointer-events-auto flex items-center gap-2 px-5 py-3 bg-paper border-2 border-ink shadow-[4px_4px_0px_0px_rgba(28,25,23,1)]
                    text-[11px] font-bold uppercase tracking-widest transition-transform hover:-translate-y-1 active:translate-y-0
                    ${page === 0 ? 'opacity-0 scale-90' : 'text-ink cursor-pointer'}
                `}
             >
                <ChevronLeft size={14} /> Previous
             </button>

             <button 
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages - 1}
                className={`
                    pointer-events-auto flex items-center gap-2 px-5 py-3 bg-paper border-2 border-ink shadow-[4px_4px_0px_0px_rgba(28,25,23,1)]
                    text-[11px] font-bold uppercase tracking-widest transition-transform hover:-translate-y-1 active:translate-y-0
                    ${page >= totalPages - 1 ? 'opacity-0 scale-90' : 'text-ink cursor-pointer'}
                `}
             >
                Next Spread <ChevronRight size={14} />
             </button>
        </div>

      </div>
    </div>
  );
};

export default NewsFeed;