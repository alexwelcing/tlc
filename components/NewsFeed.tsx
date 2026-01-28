import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FeedItem } from '../types';
import { 
  ChevronRight, ChevronLeft, Loader2, ToggleLeft, ToggleRight, 
  ArrowLeft, ArrowRight, Bookmark, RefreshCw, Zap
} from 'lucide-react';
import { useEditorialAI } from '../hooks/useEditorialAI';

interface NewsFeedProps {
  items: FeedItem[];
  onArticleClick: (item: FeedItem) => void;
  initialCategory?: string | null;
  onCategoryLoaded?: () => void;
}

// --- Helper Components & Logic ---

const getEraPrompt = (pub: string): string => {
  const p = pub.toLowerCase();
  if (p.includes('18') || p.includes('intelligencer') || p.includes('recorder') || p.includes('jersey')) return "1890s Victorian Engraving, monochrome";
  if (p.includes('daily') || p.includes('review')) return "1950s Mid-Century Offset Print, halftone";
  if (p.includes('texas') || p.includes('american')) return "1980s Retro Color Newsprint, grainy";
  return "Modern Editorial Photography, high contrast";
};

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";

const ScrambleText: React.FC<{ text: string, className?: string, delay?: number, speed?: number }> = ({ text, className, delay = 0, speed = 1 }) => {
  const [display, setDisplay] = useState(text);
  
  useEffect(() => {
    let frame = 0;
    const duration = 30 / speed; // frames
    let animationId: number;
    let timeoutId: ReturnType<typeof setTimeout>;

    const animate = () => {
      frame++;
      if (frame < duration) {
        const progress = frame / duration;
        const scrambled = text.split('').map((char, index) => {
          if (char === ' ') return ' ';
          if (index < Math.floor(progress * text.length)) return char;
          return CHARS[Math.floor(Math.random() * CHARS.length)];
        }).join('');
        
        setDisplay(scrambled);
        animationId = requestAnimationFrame(animate);
      } else {
        setDisplay(text);
      }
    };

    // Initial scramble state
    setDisplay(text.split('').map(c => c === ' ' ? ' ' : CHARS[Math.floor(Math.random() * CHARS.length)]).join(''));

    timeoutId = setTimeout(() => {
        animationId = requestAnimationFrame(animate);
    }, delay);

    return () => {
        clearTimeout(timeoutId);
        cancelAnimationFrame(animationId);
    };
  }, [text, delay, speed]);

  return <span className={className}>{display}</span>;
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
  // Navigation State
  const [sectionIndex, setSectionIndex] = useState(0); 
  const [innerPage, setInnerPage] = useState(0); 
  
  // Mode State
  const [activeMode, setActiveMode] = useState<'standard' | 'illustrated'>('standard');
  const [targetMode, setTargetMode] = useState<'standard' | 'illustrated'>('standard');
  
  // Transition Logic
  const isPreparing = targetMode === 'illustrated' && activeMode === 'standard';
  const progressRef = useRef<{total: number, current: number}>({ total: 0, current: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const { assets, generateEditorialIllustration } = useEditorialAI();
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkTablet = () => setIsTablet(window.innerWidth < 1024);
    checkTablet();
    window.addEventListener('resize', checkTablet);
    return () => window.removeEventListener('resize', checkTablet);
  }, []);

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
  const ITEMS_PER_PAGE = activeMode === 'front' ? 12 : (activeMode === 'illustrated' ? 9 : 12);
  const maxPages = Math.ceil((currentSection?.items.length || 0) / ITEMS_PER_PAGE);

  // --- SMART TRANSITION LOGIC ---
  useEffect(() => {
    if (isPreparing) {
      const startIndex = innerPage * ITEMS_PER_PAGE;
      const visibleItems = currentSection.items.slice(startIndex, startIndex + ITEMS_PER_PAGE);
      
      let readyCount = 0;
      visibleItems.forEach(item => {
        const status = assets[item.id]?.status;
        if (status === 'ready' || status === 'error') {
          readyCount++;
        } else {
          // Trigger generation if not already present
          generateEditorialIllustration(item, getEraPrompt(item.publication));
        }
      });

      progressRef.current = { total: visibleItems.length, current: readyCount };

      if (readyCount >= visibleItems.length && visibleItems.length > 0) {
        // All visible items are ready, switch mode
        setActiveMode('illustrated');
      }
    } else if (targetMode === 'standard' && activeMode === 'illustrated') {
        // Downgrade is instant
        setActiveMode('standard');
    }
  }, [isPreparing, targetMode, activeMode, innerPage, currentSection, assets, generateEditorialIllustration, ITEMS_PER_PAGE]);

  // Handle pagination in Illustrated Mode (Trigger generation for next pages eagerly)
  useEffect(() => {
      if (activeMode === 'illustrated') {
          const startIndex = innerPage * ITEMS_PER_PAGE;
          const visibleItems = currentSection.items.slice(startIndex, startIndex + ITEMS_PER_PAGE);
          visibleItems.forEach((item, i) => {
               if (!assets[item.id]) {
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
                         <span>Inking Plates... ({Math.round((progressRef.current.current / progressRef.current.total) * 100)}%)</span>
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
            
            {/* ILLUSTRATED LAYOUT */}
            {activeMode === 'illustrated' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in zoom-in-95 duration-700">
                    {visibleItems.map((item, idx) => {
                        const asset = assets[item.id];
                        return (
                            <div key={item.id} onClick={() => onArticleClick(item)} className="group cursor-pointer flex flex-col gap-3">
                                <div className="aspect-[4/3] bg-sepia border-2 border-ink relative overflow-hidden shadow-[4px_4px_0px_0px_rgba(28,25,23,0.2)] group-hover:shadow-[6px_6px_0px_0px_rgba(139,0,0,1)] transition-all">
                                    {asset?.imageUrl ? (
                                        <img src={asset.imageUrl} className="w-full h-full object-cover img-style-modern group-hover:scale-105 transition-transform duration-700" alt="" />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center bg-stone-100">
                                            <Loader2 className="text-stone-300 animate-spin" />
                                        </div>
                                    )}
                                    <div className="absolute top-2 left-2 bg-paper/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest border border-ink">
                                        {item.publication}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-display font-bold text-lg leading-tight group-hover:text-accent transition-colors line-clamp-3">
                                        {item.title}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-2 text-[10px] font-mono text-stone-500">
                                        <span>{new Date(item.publishedAt).toLocaleDateString()}</span>
                                        <span className="w-px h-3 bg-stone-300"></span>
                                        <span>{item.readtime} min</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* STANDARD LAYOUT (Text with Scramble) */}
            {activeMode === 'standard' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8 animate-in fade-in duration-300">
                    {visibleItems.map((item, idx) => (
                        <div key={`${item.id}-${innerPage}`} onClick={() => onArticleClick(item)} className="group cursor-pointer border-b border-stone-200 pb-6 hover:border-accent/50 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-bold uppercase bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded-sm">
                                        {item.source || 'WIRE'}
                                    </span>
                                    <span className="text-[9px] font-mono text-stone-400 uppercase">
                                        {item.publication}
                                    </span>
                                </div>
                                <span className="text-[9px] font-mono text-stone-400">
                                    {new Date(item.publishedAt).toLocaleDateString()}
                                </span>
                            </div>
                            
                            <h3 className="text-xl md:text-2xl font-display font-bold text-ink leading-tight mb-3 group-hover:text-accent transition-colors">
                                <ScrambleText text={item.title} delay={idx * 50} />
                            </h3>
                            
                            <div className="text-sm font-serif text-stone-600 leading-relaxed line-clamp-3 opacity-90">
                                <ScrambleText text={item.summary} delay={idx * 50 + 200} speed={2} className="opacity-80" />
                            </div>

                            <div className="mt-3 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-accent flex items-center gap-1">
                                    Read Full Filing <ArrowRight size={10} />
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {renderPagination()}

          </div>
       </div>
    </div>
  );
};

export default NewsFeed;