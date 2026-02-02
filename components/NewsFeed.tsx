import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FeedItem } from '../types';
import { 
  Loader2, ToggleLeft, ToggleRight, 
  ArrowLeft, ArrowRight
} from 'lucide-react';
import { useEditorialAI } from '../hooks/useEditorialAI';

interface NewsFeedProps {
  items: FeedItem[];
  onArticleClick: (item: FeedItem) => void;
  initialCategory?: string | null;
  onCategoryLoaded?: () => void;
}

// --- Visual Helpers ---

const getEraStyle = (pub: string) => {
  const p = pub.toLowerCase();
  if (p.includes('18') || p.includes('intelligencer') || p.includes('recorder') || p.includes('jersey')) {
    return {
      container: "border-4 double border-sepia-600 bg-[#fdfbf7]",
      image: "sepia-[.8] contrast-125 brightness-90 hue-rotate-15 grayscale-[0.3]",
      tag: "bg-stone-800 text-[#fdfbf7] font-serif tracking-widest",
      font: "font-serif",
      textMode: "font-serif"
    };
  }
  if (p.includes('daily') || p.includes('review')) {
    return {
      container: "border-2 border-stone-900 bg-white",
      image: "grayscale contrast-125 brightness-110",
      tag: "bg-stone-900 text-white font-branding uppercase tracking-tighter",
      font: "font-branding",
      textMode: "font-branding"
    };
  }
  if (p.includes('texas') || p.includes('american')) {
    return {
      container: "border-2 border-stone-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
      image: "saturate-150 contrast-110 hue-rotate-[-10deg]",
      tag: "bg-blue-800 text-white font-sans font-bold uppercase",
      font: "font-sans",
      textMode: "font-sans"
    };
  }
  return {
    container: "border border-stone-200 shadow-sm",
    image: "contrast-105",
    tag: "bg-accent text-white font-bold uppercase tracking-wide",
    font: "font-display",
    textMode: "font-display"
  };
};

const getEraPrompt = (pub: string): string => {
  const p = pub.toLowerCase();
  // RETURN ART STYLES ONLY - The hook combines this with article details.
  if (p.includes('18') || p.includes('intelligencer') || p.includes('recorder') || p.includes('jersey')) 
    return "1890s Victorian Engraving, woodcut, intricate hatching, monochrome";
  
  if (p.includes('daily') || p.includes('review')) 
    return "1950s Mid-Century Offset Print, halftone dots, bauhaus layout, grainy newsprint";
  
  if (p.includes('texas') || p.includes('american')) 
    return "1980s Corporate Memphis, airbrush, retro grid, low poly, high saturation";
  
  return "Modern Editorial Photography, high contrast, depth of field, minimalist";
};

const getLayoutClass = (index: number) => {
  const pattern = index % 10;
  // A magazine style pattern for grid
  switch (pattern) {
    case 0: return "col-span-1 md:col-span-2 md:row-span-2"; // Hero (Image)
    case 5: return "col-span-1 md:col-span-2 md:row-span-1"; // Wide (Image)
    case 9: return "col-span-1 md:col-span-3 md:row-span-1"; // Full width Banner (Image)
    default: return "col-span-1";
  }
};

const shouldHaveImage = (index: number) => {
    const pattern = index % 10;
    // Only generate images for Hero (0), Wide (5), and Banner (9) slots
    return [0, 5, 9].includes(pattern);
};

// --- Smooth Progress Hook ---
const useSmoothProgress = (target: number) => {
  const [display, setDisplay] = useState(0);
  
  useEffect(() => {
    let animationId: number;
    const animate = () => {
      setDisplay(prev => {
        if (prev < target) {
          const diff = target - prev;
          const step = Math.max(0.5, diff * 0.1); 
          return Math.min(target, prev + step);
        }
        return prev;
      });
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [target]);

  return Math.floor(display);
};

type SectionType = 'front' | 'category';

interface FeedSection {
  id: string;
  title: string;
  items: FeedItem[];
  type: SectionType;
  letter?: string;
  summary?: string;
}

const NewsFeed: React.FC<NewsFeedProps> = ({ items, onArticleClick, initialCategory, onCategoryLoaded }) => {
  const [sectionIndex, setSectionIndex] = useState(0); 
  const [innerPage, setInnerPage] = useState(0); 
  
  const [activeMode, setActiveMode] = useState<'standard' | 'illustrated'>('standard');
  const [targetMode, setTargetMode] = useState<'standard' | 'illustrated'>('standard');
  
  const isPreparing = targetMode === 'illustrated' && activeMode === 'standard';
  const progressRef = useRef<{total: number, current: number}>({ total: 0, current: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const { assets, generateEditorialIllustration } = useEditorialAI();

  // Organize Sections
  const sections = useMemo<FeedSection[]>(() => {
    if (!items || items.length === 0) return [];
    const frontItems = items.slice(0, 40); 
    const result: FeedSection[] = [{ id: 'front', title: 'Front Page', items: frontItems, type: 'front', summary: 'Top Stories' }];
    
    const remaining = items.slice(40);
    if (remaining.length > 0) {
        const groups: Record<string, FeedItem[]> = {};
        remaining.forEach(item => {
            const cat = item.primaryCategory?.name || (item.categories.length > 0 ? item.categories[0].name : 'General');
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(item);
        });
        const sortedCats = Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
        let charCode = 66; 
        sortedCats.forEach(([catName, catItems]) => {
            if (catItems.length > 0) {
                 result.push({
                     id: `cat-${catName}`,
                     title: catName,
                     items: catItems,
                     type: 'category',
                     letter: String.fromCharCode(charCode++),
                     summary: `${catItems.length} articles filed`
                 });
            }
        });
    }
    return result;
  }, [items]);

  // Handle Initial Category Jump
  useEffect(() => {
    if (initialCategory && sections.length > 0) {
      const idx = sections.findIndex(s => s.title === initialCategory);
      if (idx !== -1) {
        setSectionIndex(idx);
        setInnerPage(0);
        if (onCategoryLoaded) onCategoryLoaded();
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [initialCategory, sections, onCategoryLoaded]);

  const currentSection = sections[sectionIndex] || sections[0];
  const ITEMS_PER_PAGE = activeMode === 'front' ? 12 : (activeMode === 'illustrated' ? 10 : 15); // Higher density for Standard
  const maxPages = Math.ceil((currentSection?.items.length || 0) / ITEMS_PER_PAGE);

  // --- SMART TRANSITION LOGIC ---
  useEffect(() => {
    if (isPreparing) {
      const startIndex = innerPage * ITEMS_PER_PAGE;
      const visibleItems = currentSection.items.slice(startIndex, startIndex + ITEMS_PER_PAGE);
      
      const itemsNeedingImages = visibleItems.filter((_, idx) => shouldHaveImage(idx));
      
      let readyCount = 0;
      
      if (itemsNeedingImages.length === 0) {
          progressRef.current = { total: 1, current: 1 };
          setActiveMode('illustrated');
          return;
      }

      itemsNeedingImages.forEach(item => {
        const status = assets[item.id]?.status;
        if (status === 'ready' || status === 'error') {
          readyCount++;
        } else {
          generateEditorialIllustration(item, getEraPrompt(item.publication));
        }
      });

      progressRef.current = { total: itemsNeedingImages.length, current: readyCount };

      if (readyCount >= itemsNeedingImages.length) {
        setActiveMode('illustrated');
      }
    } else if (targetMode === 'standard' && activeMode === 'illustrated') {
        setActiveMode('standard');
    }
  }, [isPreparing, targetMode, activeMode, innerPage, currentSection, assets, generateEditorialIllustration, ITEMS_PER_PAGE]);

  // Handle pagination in Illustrated Mode (Trigger generation for next pages eagerly)
  useEffect(() => {
      if (activeMode === 'illustrated') {
          const startIndex = innerPage * ITEMS_PER_PAGE;
          const visibleItems = currentSection.items.slice(startIndex, startIndex + ITEMS_PER_PAGE);
          visibleItems.forEach((item, i) => {
               if (shouldHaveImage(i) && !assets[item.id]) {
                   setTimeout(() => generateEditorialIllustration(item, getEraPrompt(item.publication)), i * 150);
               }
          });
      }
  }, [innerPage, activeMode, currentSection, assets, generateEditorialIllustration, ITEMS_PER_PAGE]);


  const toggleMode = () => {
      if (targetMode === 'standard') setTargetMode('illustrated');
      else setTargetMode('standard');
  };

  const handlePageChange = (delta: number) => {
      const newPage = innerPage + delta;
      if (newPage >= 0 && newPage < maxPages) {
          setInnerPage(newPage);
          document.getElementById('feed-header')?.scrollIntoView({ behavior: 'smooth' });
      }
  };

  const percent = progressRef.current.total > 0 
    ? (progressRef.current.current / progressRef.current.total) * 100 
    : 0;
  
  const displayPercent = useSmoothProgress(percent);

  const renderPagination = () => (
      <div className="flex items-center justify-between border-t border-stone-300 pt-6 mt-8 select-none">
          <button 
              onClick={() => handlePageChange(-1)}
              disabled={innerPage === 0}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest hover:text-accent disabled:opacity-20 disabled:hover:text-ink transition-colors group"
          >
              <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Previous
          </button>
          
          <div className="font-mono text-[10px] text-stone-400">
              Page {innerPage + 1} / {maxPages}
          </div>

          <button 
              onClick={() => handlePageChange(1)}
              disabled={innerPage >= maxPages - 1}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest hover:text-accent disabled:opacity-20 disabled:hover:text-ink transition-colors group"
          >
              Next <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
      </div>
  );

  if (!items || items.length === 0) return <div className="p-12 text-center font-serif italic text-stone-400">Ledger Empty</div>;

  const visibleItems = currentSection.items.slice(innerPage * ITEMS_PER_PAGE, (innerPage + 1) * ITEMS_PER_PAGE);

  return (
    <div ref={containerRef} className="py-6 flex justify-center w-full min-h-screen">
       <div className="w-full max-w-[1400px] bg-paper shadow-2xl relative border-x border-stone-200 min-h-[90vh]">
          
          {/* Header Controls */}
          <div id="feed-header" className="sticky top-0 z-40 bg-paper/95 backdrop-blur-sm border-b-2 border-ink px-6 py-3 flex justify-between items-center shadow-sm">
             <div className="flex items-baseline gap-4">
                 <h2 className="text-xl md:text-2xl font-branding font-black uppercase tracking-tight text-ink">{currentSection.title}</h2>
                 <span className="hidden md:inline text-[10px] font-mono font-bold text-accent uppercase tracking-widest">{currentSection.summary}</span>
             </div>
             
             <div className="flex items-center gap-4">
                 {isPreparing && (
                     <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-accent animate-pulse">
                         <Loader2 size={12} className="animate-spin" />
                         <span>Inking Plates... ({displayPercent}%)</span>
                     </div>
                 )}
                 <button 
                    onClick={toggleMode}
                    className={`flex items-center gap-2 px-3 py-1.5 border transition-all ${activeMode === 'illustrated' ? 'border-accent bg-accent/5 text-accent' : 'border-stone-300 hover:border-ink'}`}
                 >
                    <span className="text-[9px] font-bold uppercase tracking-wider">{activeMode === 'illustrated' ? 'Illustrated' : 'Standard Wire'}</span>
                    {targetMode === 'illustrated' && activeMode === 'standard' ? (
                        <Loader2 size={16} className="animate-spin text-stone-400" />
                    ) : (
                        activeMode === 'illustrated' ? <ToggleRight size={16} /> : <ToggleLeft size={16} className="text-stone-400" />
                    )}
                 </button>
             </div>
          </div>

          <div className="p-6 md:p-12">
            
            {/* ILLUSTRATED LAYOUT (MAGAZINE STYLE) */}
            {activeMode === 'illustrated' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 auto-rows-[minmax(150px,auto)] animate-in fade-in zoom-in-95 duration-700">
                    {visibleItems.map((item, idx) => {
                        const asset = assets[item.id];
                        const layoutClass = getLayoutClass(idx);
                        const styles = getEraStyle(item.publication);
                        const hasImage = shouldHaveImage(idx);
                        
                        return (
                            <div key={item.id} onClick={() => onArticleClick(item)} className={`${layoutClass} group cursor-pointer flex flex-col h-full`}>
                                {hasImage ? (
                                    // --- IMAGE CARD ---
                                    <div className={`flex-1 relative overflow-hidden transition-all h-full min-h-[300px] ${styles.container} group-hover:shadow-[8px_8px_0px_0px_rgba(28,25,23,0.5)]`}>
                                        <div className="w-full h-full relative overflow-hidden">
                                            {asset?.imageUrl ? (
                                                <img 
                                                    src={asset.imageUrl} 
                                                    className={`w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 ${styles.image}`} 
                                                    alt="" 
                                                />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center bg-stone-100">
                                                    <Loader2 className="text-stone-300 animate-spin" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                                        </div>

                                        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                                            <div className={`inline-block px-2 py-0.5 mb-2 text-[9px] ${styles.tag}`}>
                                                {item.publication}
                                            </div>
                                            <h3 className={`text-lg md:text-xl leading-tight mb-1 group-hover:text-stone-200 transition-colors ${styles.font} font-bold shadow-black drop-shadow-md`}>
                                                {item.title}
                                            </h3>
                                        </div>
                                    </div>
                                ) : (
                                    // --- TEXT CARD ---
                                    <div className={`flex flex-col h-full justify-between hover:bg-sepia/30 transition-colors p-4 ${styles.textMode || 'border-l border-stone-300 pl-4'}`}>
                                       <div>
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-[9px] font-branding font-bold uppercase tracking-wider text-stone-400">
                                                    {item.publication}
                                                </span>
                                            </div>
                                            <h3 className={`text-lg leading-snug mb-3 text-ink group-hover:text-accent transition-colors ${styles.font} font-bold`}>
                                                {item.title}
                                            </h3>
                                            <p className="text-sm font-serif text-stone-600 line-clamp-3 leading-relaxed">
                                                {item.summary}
                                            </p>
                                       </div>
                                       <div className="mt-4 pt-4 border-t border-stone-200/50 flex items-center gap-2">
                                            <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400 group-hover:text-accent transition-colors flex items-center gap-1">
                                                Read More <ArrowRight size={10} />
                                            </span>
                                       </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* STANDARD WIRE LAYOUT (NEWSPAPER COLUMNS) */}
            {activeMode === 'standard' && (
                <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8 animate-in fade-in duration-500">
                    {visibleItems.map((item, idx) => {
                        const styles = getEraStyle(item.publication);
                        // Determine layout weight
                        const isLead = idx === 0 || idx === 5;
                        const isBrief = idx > 8;

                        return (
                             <div 
                                key={item.id} 
                                onClick={() => onArticleClick(item)} 
                                className={`
                                    break-inside-avoid mb-8 cursor-pointer group 
                                    ${isLead ? 'border-b-4 border-double border-ink pb-6' : 'border-b border-stone-200 pb-4'}
                                `}
                             >
                                <div className="flex justify-between items-baseline mb-2">
                                    <span className="text-[9px] font-branding font-bold uppercase tracking-wider text-stone-500">
                                        {item.publication}
                                    </span>
                                    <span className="text-[9px] font-mono text-stone-400">
                                        {new Date(item.publishedAt).toLocaleDateString()}
                                    </span>
                                </div>

                                <h3 className={`
                                    leading-tight text-ink group-hover:text-accent transition-colors
                                    ${isLead ? 'text-2xl md:text-3xl font-display font-black mb-3' : 'text-lg font-bold font-serif mb-2'}
                                    ${styles.font}
                                `}>
                                    {item.title}
                                </h3>

                                {!isBrief && (
                                    <p className={`
                                        font-serif text-stone-600 leading-relaxed
                                        ${isLead ? 'text-base line-clamp-4' : 'text-sm line-clamp-3'}
                                    `}>
                                        {item.summary}
                                    </p>
                                )}

                                <div className="mt-3 flex items-center justify-between">
                                    <div className="flex gap-2 text-[9px] font-bold uppercase text-stone-400">
                                        <span>{item.primaryCategory?.name}</span>
                                        {item.authors.length > 0 && <span className="italic normal-case font-serif text-stone-500">by {item.authors[0].name}</span>}
                                    </div>
                                    <ArrowRight size={10} className="text-stone-300 group-hover:text-accent opacity-0 group-hover:opacity-100 transition-all" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {renderPagination()}

          </div>
       </div>
    </div>
  );
};

export default NewsFeed;