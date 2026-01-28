import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FeedItem } from '../types';
import { ChevronRight, ChevronLeft, Play, Loader2, BookOpen, Star, Newspaper, Bookmark, ListStart } from 'lucide-react';
import { useEditorialAI } from '../hooks/useEditorialAI';

interface NewsFeedProps {
  items: FeedItem[];
  onArticleClick: (item: FeedItem) => void;
  initialCategory?: string | null;
  onCategoryLoaded?: () => void;
}

// Helper to determine the visual style prompt based on publication name
const getEraPrompt = (pub: string): string => {
  const p = pub.toLowerCase();
  if (p.includes('18') || p.includes('intelligencer') || p.includes('recorder') || p.includes('jersey')) return "1890s Victorian Engraving, monochrome";
  if (p.includes('daily') || p.includes('review')) return "1950s Mid-Century Offset Print, halftone";
  if (p.includes('texas') || p.includes('american') || p.includes('national')) return "1980s Retro Color Newsprint, grainy";
  return "Modern Editorial Photography, high contrast";
};

type SectionType = 'front' | 'category' | 'wire';

interface FeedSection {
  id: string;
  title: string;
  items: FeedItem[];
  type: SectionType;
  letter?: string;
  summary?: string;
}

const NewsFeed: React.FC<NewsFeedProps> = ({ items, onArticleClick, initialCategory, onCategoryLoaded }) => {
  const [page, setPage] = useState(0);
  const [animClass, setAnimClass] = useState('');
  const [isTabletMode, setIsTabletMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { assets, generateEditorialIllustration, animateEditorial } = useEditorialAI();

  // --- Responsive Check ---
  useEffect(() => {
    const checkTablet = () => setIsTabletMode(window.innerWidth < 1024);
    checkTablet();
    window.addEventListener('resize', checkTablet);
    return () => window.removeEventListener('resize', checkTablet);
  }, []);

  // --- Section Organization Logic ---
  const sections = useMemo<FeedSection[]>(() => {
    if (!items || items.length === 0) return [];

    // 1. Front Page: Top 6 Items
    const frontItems = items.slice(0, 6);
    const result: FeedSection[] = [{ 
        id: 'front', 
        title: 'Front Page', 
        items: frontItems, 
        type: 'front',
        summary: 'Top Stories & Breaking News'
    }];

    // 2. Category Sections (from remaining items)
    const remaining = items.slice(6);
    if (remaining.length > 0) {
        const groups: Record<string, FeedItem[]> = {};
        
        remaining.forEach(item => {
            // Prioritize primary category, fallback to first category, then "General"
            const cat = item.primaryCategory?.name || (item.categories.length > 0 ? item.categories[0].name : 'General');
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(item);
        });

        // Sort categories by volume (biggest first)
        const sortedCats = Object.entries(groups).sort((a, b) => b[1].length - a[1].length);

        let charCode = 65; // 'A' (Section A is usually Front Page, so start B) 
        charCode = 66; // Start at 'B'

        sortedCats.forEach(([catName, catItems]) => {
            // Create a spread for this category (up to 9 items)
            if (catItems.length > 0) {
                 result.push({
                     id: `cat-${catName}`,
                     title: catName,
                     items: catItems.slice(0, 9), 
                     type: 'category',
                     letter: String.fromCharCode(charCode++),
                     summary: `${catItems.length} articles filed`
                 });
            }
        });
    }

    return result;
  }, [items]);

  // Handle external navigation (from MetricsDashboard)
  useEffect(() => {
    if (initialCategory && sections.length > 0) {
      const idx = sections.findIndex(s => s.title === initialCategory);
      if (idx !== -1) {
        setPage(idx);
        if (onCategoryLoaded) onCategoryLoaded();
        // Scroll to top
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [initialCategory, sections, onCategoryLoaded]);

  // Safe access to current section
  const currentSection = sections[page] || sections[0];
  const isFrontPage = currentSection?.type === 'front';

  // --- Page Navigation ---
  const handlePageChange = (newPage: number) => {
    if (newPage < 0 || newPage >= sections.length) return;
    setAnimClass('turn-page-exit');
    
    // Scroll up if needed
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    setTimeout(() => {
      setPage(newPage);
      setAnimClass('turn-page-enter');
    }, 600); 
  };

  const jumpToSection = (index: number) => {
    handlePageChange(index);
  };

  // --- Reset when items change ---
  useEffect(() => {
    if (!initialCategory) {
        setPage(0);
        setAnimClass('turn-page-enter');
    }
  }, [items, initialCategory]);

  // --- Smart AI Generation (Quota Optimized) ---
  useEffect(() => {
    if (!currentSection || !currentSection.items || currentSection.items.length === 0) return;

    // Only generate for the HERO item of the CURRENT section
    const timer = setTimeout(() => {
        const hero = currentSection.items[0];
        if (hero) {
             generateEditorialIllustration(hero, getEraPrompt(hero.publication));
        }

        // For front page, maybe do the second one too if it's visible
        if (isFrontPage && currentSection.items[1]) {
             setTimeout(() => {
                generateEditorialIllustration(currentSection.items[1], getEraPrompt(currentSection.items[1].publication));
             }, 1200); // Stagger
        }
    }, 500); // Debounce page turn

    return () => clearTimeout(timer);
  }, [page, currentSection, isFrontPage, items]);

  // --- RENDER: Empty State ---
  if (!items || items.length === 0 || !currentSection) {
    return (
        <div className="text-center py-32 px-4 border-4 border-stone-200 border-double rounded bg-sepia/10 m-8 animate-in fade-in">
            <Newspaper size={48} className="mx-auto text-stone-300 mb-4" />
            <h3 className="text-xl font-display font-bold text-ink mb-2">No News Found</h3>
            <p className="font-serif italic text-stone-500">Adjust your indices to view records.</p>
        </div>
    );
  }

  // --- RENDER: Tablet / Mobile List (Simplified) ---
  if (isTabletMode) {
      return (
          <div className="max-w-2xl mx-auto py-8 px-4 animate-in fade-in duration-500">
              <div className="flex items-center justify-between border-b-2 border-ink pb-2 mb-8">
                  <h2 className="text-xl font-branding font-bold uppercase text-ink">The Digital Feed</h2>
                  <span className="text-[10px] font-mono text-stone-500">VOL. {items.length}</span>
              </div>
              <div className="space-y-8">
                  {items.slice(0, 20).map((item) => {
                      const asset = assets[item.id];
                      return (
                          <div key={item.id} onClick={() => onArticleClick(item)} className="bg-paper border border-stone-200 shadow-sm p-4 cursor-pointer active:scale-[0.99] transition-transform">
                              <div className="flex justify-between items-baseline mb-2">
                                  <span className="text-[10px] font-bold uppercase text-accent bg-accent/5 px-2 py-0.5 rounded">{item.publication}</span>
                                  <span className="text-[10px] font-mono text-stone-400">{new Date(item.publishedAt).toLocaleDateString()}</span>
                              </div>
                              <h3 className="text-lg font-display font-bold text-ink mb-2 leading-tight">{item.title}</h3>
                              {asset?.imageUrl && (
                                  <div className="mb-3 rounded overflow-hidden aspect-video relative">
                                      <img src={asset.imageUrl} className="w-full h-full object-cover" alt="" />
                                  </div>
                              )}
                              <p className="font-serif text-sm text-stone-600 line-clamp-3">{item.summary}</p>
                          </div>
                      );
                  })}
              </div>
              {items.length > 20 && (
                  <div className="text-center py-8 text-xs font-mono text-stone-400">
                      + {items.length - 20} more articles available in Table View
                  </div>
              )}
          </div>
      );
  }

  // --- RENDER: Desktop Premium Spread ---
  const heroItem = currentSection.items[0];
  const heroAsset = heroItem ? assets[heroItem.id] : null;

  return (
    <div ref={containerRef} className="perspective-container py-6 flex justify-center w-full overflow-visible">
      
      <div 
        className={`
            bg-[#f4f1ea] shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative origin-left transition-all duration-800 ease-in-out
            ${animClass}
            max-w-[1400px] w-full min-h-[85vh] pb-24
            paper-distortion border border-stone-300
        `}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Background Texture */}
        <div className="absolute inset-0 bg-[#f4f1ea] opacity-40 mix-blend-multiply pointer-events-none z-0" 
             style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.05\'/%3E%3C/svg%3E")' }}>
        </div>

        {/* --- FRONT PAGE LAYOUT --- */}
        {isFrontPage && (
            <div className="relative z-10 p-8 md:p-12">
                {/* Header */}
                <div className="flex justify-between items-end border-b-4 border-double border-ink mb-8 pb-2">
                    <div>
                        <span className="block text-[10px] font-mono text-stone-400 mb-1">SECTION A</span>
                        <h2 className="text-3xl font-branding font-black uppercase tracking-tighter text-ink leading-none">Headlines</h2>
                    </div>
                    <div className="text-right hidden md:block">
                        <span className="block text-[10px] font-branding font-bold uppercase text-accent">Latest Dispatches</span>
                        <span className="text-[10px] font-mono text-stone-400">{new Date().toLocaleDateString()}</span>
                    </div>
                </div>

                {/* Main Spread */}
                <div className="grid grid-cols-12 gap-8">
                    
                    {/* Left Col: Hero */}
                    <div className="col-span-8 border-r border-stone-200 pr-8">
                        {heroItem && (
                             <div className="group cursor-pointer" onClick={() => onArticleClick(heroItem)}>
                                 <div className="mb-4 relative">
                                     <div className={`w-full bg-stone-200 border border-stone-300 overflow-hidden transition-all duration-1000 ${heroAsset?.imageUrl ? 'aspect-[21/9]' : 'h-12'}`}>
                                         {heroAsset?.imageUrl && (
                                             <img src={heroAsset.imageUrl} className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-700" alt="" />
                                         )}
                                     </div>
                                 </div>
                                 <div className="text-center mb-6">
                                     <span className="inline-block px-3 py-1 border border-ink text-[10px] font-bold uppercase tracking-widest mb-3 bg-paper relative -top-3 shadow-sm">
                                         {heroItem.publication}
                                     </span>
                                     <h1 className="text-5xl md:text-6xl font-display font-bold text-ink leading-[0.9] mb-4 group-hover:text-stone-700 transition-colors">
                                         {heroItem.title}
                                     </h1>
                                 </div>
                                 <div className="columns-2 gap-6 text-sm font-serif text-justify text-stone-800 leading-relaxed border-b border-stone-200 pb-6 mb-6">
                                     <p className="first-letter:text-5xl first-letter:font-bold first-letter:float-left first-letter:mr-2 first-letter:font-branding first-letter:text-ink">
                                         {heroItem.summary}
                                     </p>
                                 </div>
                             </div>
                        )}
                        
                        {/* Secondary Hero */}
                        {currentSection.items[1] && (
                            <div className="grid grid-cols-2 gap-6 mt-8" onClick={() => onArticleClick(currentSection.items[1])}>
                                <div className="cursor-pointer group">
                                     <h3 className="text-xl font-display font-bold mb-2 group-hover:underline decoration-1 underline-offset-4">{currentSection.items[1].title}</h3>
                                     <p className="text-xs font-serif text-stone-600 line-clamp-3 leading-relaxed">{currentSection.items[1].summary}</p>
                                </div>
                                <div className="aspect-video bg-stone-100 border border-stone-200 overflow-hidden shadow-sm">
                                     {assets[currentSection.items[1].id]?.imageUrl ? (
                                        <img src={assets[currentSection.items[1].id].imageUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" alt="" />
                                     ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-sepia/20">
                                            <span className="text-[9px] font-mono text-stone-300">FIG B.</span>
                                        </div>
                                     )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Col: Sidebar List & Index */}
                    <div className="col-span-4 pl-4 flex flex-col h-full">
                        
                        {/* Departmental Index */}
                        <div className="mb-8 border-b-2 border-ink pb-6">
                            <div className="flex items-center gap-2 mb-3">
                                <BookOpen size={14} className="text-accent"/>
                                <h5 className="text-[11px] font-branding font-bold uppercase tracking-widest text-ink">Departmental Index</h5>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {sections.slice(1).map((sec, idx) => (
                                    <button 
                                        key={sec.id} 
                                        onClick={() => jumpToSection(idx + 1)} 
                                        className="flex items-center justify-between group w-full text-left"
                                    >
                                        <div className="flex items-baseline gap-2 overflow-hidden">
                                            <span className="text-[10px] font-bold text-ink bg-sepia px-1 border border-stone-300 group-hover:bg-accent group-hover:text-paper transition-colors w-5 text-center">{sec.letter}</span>
                                            <span className="text-xs font-serif text-stone-700 truncate group-hover:text-accent group-hover:underline decoration-1 underline-offset-2 transition-colors">{sec.title}</span>
                                        </div>
                                        <span className="text-[9px] font-mono text-stone-400 shrink-0 ml-2">Pg. {idx + 2}</span>
                                    </button>
                                ))}
                                {sections.length <= 1 && (
                                    <div className="text-[10px] font-serif italic text-stone-400">No additional sections filed.</div>
                                )}
                            </div>
                        </div>

                        <div className="bg-ink text-paper py-1 px-2 text-[10px] font-bold uppercase tracking-widest mb-4 inline-block self-start shadow-md">
                            In Other News
                        </div>
                        <div className="flex-1 space-y-6">
                            {currentSection.items.slice(2, 6).map((item) => (
                                <div key={item.id} onClick={() => onArticleClick(item)} className="cursor-pointer group border-b border-stone-200 pb-4 last:border-0 hover:bg-stone-50/50 transition-colors p-1">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-[9px] font-bold uppercase text-stone-400">{item.publication}</span>
                                    </div>
                                    <h4 className="text-lg font-display font-bold leading-tight mb-2 group-hover:text-accent transition-colors">
                                        {item.title}
                                    </h4>
                                    <p className="text-xs font-serif text-stone-500 line-clamp-2">
                                        {item.summary}
                                    </p>
                                </div>
                            ))}
                        </div>
                        
                        {/* Interactive Element */}
                        <div className="mt-auto pt-8 border-t-2 border-stone-300">
                             <div className="bg-sepia p-4 border border-stone-300 text-center outline outline-1 outline-offset-2 outline-stone-300">
                                 <span className="block text-[10px] font-mono text-stone-500 mb-2">ADVERTISEMENT</span>
                                 <div className="text-xl font-branding font-bold text-ink">The Legal Chronicle</div>
                                 <div className="text-xs font-serif italic text-stone-600 mt-1">Premium Analytics for the Modern Firm</div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* --- CATEGORY SECTION LAYOUT (New Premium Layout) --- */}
        {!isFrontPage && currentSection?.type === 'category' && (
            <div className="relative z-10 h-full flex flex-col p-8 md:p-12 bg-[#f4f1ea]">
                
                {/* Watermark Section Letter */}
                <div className="absolute top-10 right-10 text-[12rem] font-branding font-black text-ink/5 pointer-events-none select-none z-0">
                    {currentSection.letter}
                </div>

                {/* Category Header */}
                <div className="flex items-end gap-6 border-b-2 border-ink pb-4 mb-8 relative z-10">
                    <div className="text-6xl font-branding font-black text-ink leading-none">
                        {currentSection.letter}<span className="text-2xl align-top text-accent">.</span>
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-baseline border-b border-stone-300 mb-1 pb-1">
                             <span className="text-xs font-mono font-bold text-accent uppercase tracking-widest">Department of {currentSection.title}</span>
                             <span className="text-xs font-serif italic text-stone-500">{currentSection.summary}</span>
                        </div>
                        <h2 className="text-5xl font-display font-bold uppercase text-ink tracking-tight">{currentSection.title}</h2>
                    </div>
                </div>

                <div className="flex-1 grid grid-cols-12 gap-8 min-h-0 relative z-10">
                    
                    {/* Left Page: Hero Focus */}
                    <div className="col-span-5 flex flex-col border-r border-stone-200 pr-8">
                         {heroItem && (
                             <div className="flex-1 flex flex-col group cursor-pointer" onClick={() => onArticleClick(heroItem)}>
                                 <div className="relative aspect-[3/4] w-full border-4 border-double border-stone-300 bg-stone-100 mb-6 overflow-hidden shadow-sm">
                                     {heroAsset?.imageUrl ? (
                                         <>
                                            <img src={heroAsset.imageUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="" />
                                         </>
                                     ) : (
                                         <div className="w-full h-full flex flex-col items-center justify-center bg-sepia/20 gap-2">
                                             <Loader2 className="animate-spin text-stone-400" />
                                             <span className="text-[10px] font-mono text-stone-400 uppercase">Generating Plate...</span>
                                         </div>
                                     )}
                                     
                                     {/* Video Overlay Button */}
                                     {heroAsset?.imageUrl && !heroAsset.videoUrl && (
                                         <button 
                                            onClick={(e) => { e.stopPropagation(); animateEditorial(heroItem.id, heroItem.title); }}
                                            className="absolute bottom-4 right-4 bg-paper/90 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent hover:text-white"
                                            title="Animate Illustration"
                                         >
                                            <Play size={16} fill="currentColor" />
                                         </button>
                                     )}
                                 </div>

                                 <div className="bg-white/40 p-4 border border-stone-100">
                                     <div className="flex items-center gap-2 mb-2">
                                         <Bookmark size={12} className="text-accent fill-accent" />
                                         <span className="text-[10px] font-bold uppercase text-stone-500">{heroItem.publication}</span>
                                     </div>
                                     <h3 className="text-3xl font-display font-bold text-ink leading-tight mb-3 group-hover:text-accent transition-colors">
                                         {heroItem.title}
                                     </h3>
                                     <p className="text-sm font-serif text-stone-600 leading-relaxed text-justify line-clamp-6 first-letter:text-2xl first-letter:font-bold first-letter:mr-1">
                                         {heroItem.summary}
                                     </p>
                                 </div>
                             </div>
                         )}
                    </div>

                    {/* Right Page: Grid of Articles */}
                    <div className="col-span-7 pl-4">
                         <div className="grid grid-cols-2 gap-x-8 gap-y-10">
                             {currentSection.items.slice(1).map((item, idx) => (
                                 <div key={item.id} onClick={() => onArticleClick(item)} className="cursor-pointer group flex flex-col h-full">
                                     <div className="flex items-center gap-2 mb-2 border-b border-stone-200 pb-1">
                                        <span className="text-lg font-branding font-bold text-stone-300">{idx + 2}</span>
                                        <span className="text-[9px] font-bold uppercase text-stone-400 block truncate">{item.publication}</span>
                                     </div>
                                     <h4 className="text-lg font-display font-bold leading-snug mb-2 group-hover:underline decoration-1 underline-offset-4 flex-1">
                                         {item.title}
                                     </h4>
                                     <p className="text-xs font-serif text-stone-500 line-clamp-3 leading-relaxed">
                                         {item.summary}
                                     </p>
                                 </div>
                             ))}
                         </div>

                         {/* Bottom Filler / Quote */}
                         {currentSection.items.length < 5 && (
                             <div className="mt-12 p-6 border-y-2 border-stone-200 bg-sepia/20 text-center mx-auto max-w-sm">
                                 <p className="font-display italic text-lg text-stone-500">
                                     "The life of the law has not been logic: it has been experience."
                                 </p>
                                 <span className="block mt-2 text-[10px] font-bold uppercase text-stone-400">— Oliver Wendell Holmes Jr.</span>
                             </div>
                         )}
                    </div>
                </div>
            </div>
        )}

        {/* --- NAVIGATION FOOTER --- */}
        <div className="absolute bottom-8 -left-8 -right-8 px-12 flex justify-between items-center z-50 pointer-events-none">
             <button 
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 0}
                className={`
                    pointer-events-auto flex items-center gap-2 px-6 py-4 bg-paper border-2 border-ink shadow-[4px_4px_0px_0px_rgba(28,25,23,1)]
                    text-[11px] font-bold uppercase tracking-widest transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(139,0,0,1)] active:translate-y-0
                    ${page === 0 ? 'opacity-0 scale-90' : 'text-ink cursor-pointer'}
                `}
             >
                <ChevronLeft size={14} /> 
                <div className="text-left">
                    <span className="block text-[9px] text-stone-400 font-normal normal-case">Previous</span>
                    {page > 0 ? sections[page-1].title : 'Back'}
                </div>
             </button>

             <div className="pointer-events-auto bg-paper px-4 py-2 border border-stone-300 shadow-sm text-[10px] font-mono text-stone-400">
                 Page {page + 1} of {sections.length}
             </div>

             <button 
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= sections.length - 1}
                className={`
                    pointer-events-auto flex items-center gap-2 px-6 py-4 bg-paper border-2 border-ink shadow-[4px_4px_0px_0px_rgba(28,25,23,1)]
                    text-[11px] font-bold uppercase tracking-widest transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(139,0,0,1)] active:translate-y-0
                    ${page >= sections.length - 1 ? 'opacity-0 scale-90' : 'text-ink cursor-pointer'}
                `}
             >
                <div className="text-right">
                    <span className="block text-[9px] text-stone-400 font-normal normal-case">Next Section</span>
                    {page < sections.length - 1 ? sections[page+1].title : 'End'}
                </div>
                <ChevronRight size={14} />
             </button>
        </div>
      </div>
    </div>
  );
};

export default NewsFeed;