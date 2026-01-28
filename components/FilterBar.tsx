import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Filter, X, Plus, Database, Trash2, FileText } from 'lucide-react';
import { FeedData } from '../types';
import FileUpload from './FileUpload';

interface FacetOption {
  value: string;
  count: number;
}

interface FilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedSource: string;
  onSourceChange: (value: string) => void;
  selectedPub: string;
  onPubChange: (value: string) => void;
  selectedCat: string;
  onCatChange: (value: string) => void;
  sources: FacetOption[];
  publications: FacetOption[];
  categories: FacetOption[];
  resultCount: number;
  totalCount: number;
  onClear: () => void;
  // Added for integrated source management
  loadedFeeds: any[];
  onAddFeed: (files: { data: FeedData, filename: string }[]) => void;
  onRemoveFeed: (id: string) => void;
}

const CustomSelect = ({ 
  label, 
  value, 
  onChange, 
  options 
}: { 
  label: string, 
  value: string, 
  onChange: (val: string) => void, 
  options: FacetOption[] 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLabel = options.find(o => o.value === value)?.value || value || `All ${label}`;

  return (
    <div className="relative" ref={containerRef}>
       <button 
         onClick={() => setIsOpen(!isOpen)} 
         className="flex items-center justify-between gap-2 appearance-none pl-0 pr-4 py-1 bg-transparent border-b border-stone-300 text-sm font-branding font-bold text-ink focus:outline-none hover:border-accent cursor-pointer min-w-[140px] uppercase whitespace-nowrap transition-colors"
       >
          <span className="truncate max-w-[140px]">{selectedLabel}</span>
          <ChevronDown className={`text-stone-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} size={10} />
       </button>
       
       {isOpen && (
         <div className="absolute top-full left-0 mt-1 w-[280px] bg-paper border border-ink shadow-xl z-50 max-h-[300px] overflow-y-auto animate-in fade-in zoom-in-95 duration-100 origin-top-left">
             <div 
                onClick={() => {onChange(''); setIsOpen(false)}} 
                className={`
                  px-3 py-2 cursor-pointer hover:bg-sepia transition-colors border-b border-stone-200 text-xs font-branding font-bold uppercase
                  ${!value ? 'bg-sepia text-accent' : 'text-stone-600'}
                `}
             >
               All {label}
             </div>
             {options.map(opt => (
                <div 
                  key={opt.value}
                  onClick={() => {onChange(opt.value); setIsOpen(false)}} 
                  className="group cursor-pointer border-b border-stone-100 last:border-0 hover:bg-sepia/50 transition-colors flex items-center justify-between px-3 py-2"
                >
                    <span className={`text-xs font-serif truncate pr-2 ${value === opt.value ? 'font-bold text-ink' : 'text-stone-600'}`}>
                      {opt.value}
                    </span>
                    <span className="text-[9px] font-mono text-stone-400">
                       {opt.count}
                    </span>
                </div>
             ))}
         </div>
       )}
    </div>
  );
};

const FilterBar: React.FC<FilterBarProps> = ({
  searchTerm,
  onSearchChange,
  selectedSource,
  onSourceChange,
  selectedPub,
  onPubChange,
  selectedCat,
  onCatChange,
  sources,
  publications,
  categories,
  resultCount,
  totalCount,
  onClear,
  loadedFeeds,
  onAddFeed,
  onRemoveFeed
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSources, setShowSources] = useState(false);

  // Folded State
  if (!isExpanded) {
    return (
      <div 
        onClick={() => setIsExpanded(true)} 
        className="cursor-pointer group flex items-center gap-3 px-8 py-2 border-b border-stone-300 hover:border-accent hover:bg-white/40 transition-all bg-transparent w-auto"
      >
         <Search size={14} className="text-stone-400 group-hover:text-accent transition-colors" />
         <span className="text-xs font-branding font-bold uppercase tracking-[0.15em] text-stone-500 group-hover:text-ink transition-colors">
            Search Indices & Sources
         </span>
         <ChevronDown size={14} className="text-stone-300 group-hover:text-accent transition-colors" />
      </div>
    );
  }

  // Expanded State
  return (
    <div className="w-full max-w-4xl bg-white/60 backdrop-blur-sm border border-stone-200 p-6 shadow-sm relative animate-in slide-in-from-top-2 duration-300">
      <button 
        onClick={() => setIsExpanded(false)} 
        className="absolute top-2 right-2 p-1 text-stone-300 hover:text-ink transition-colors"
      >
        <X size={16}/>
      </button>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Search & Selects */}
        <div className="md:col-span-8 space-y-6 border-r border-transparent md:border-stone-200 md:pr-6">
            <div className="relative group">
                <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                <input
                    type="text"
                    placeholder="Search keywords..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full pl-6 pr-4 py-1 bg-transparent border-b border-stone-300 text-ink placeholder:text-stone-400 font-serif focus:outline-none focus:border-accent transition-colors"
                />
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-4">
                <CustomSelect label="Publications" value={selectedPub} onChange={onPubChange} options={publications} />
                <CustomSelect label="Topics" value={selectedCat} onChange={onCatChange} options={categories} />
                {sources.length > 1 && (
                    <CustomSelect label="Wires" value={selectedSource} onChange={onSourceChange} options={sources} />
                )}
            </div>
            
            <div className="flex justify-between items-end pt-2">
                <div className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">
                    Showing {resultCount} of {totalCount} records
                </div>
                {(searchTerm || selectedPub || selectedCat || selectedSource) && (
                    <button onClick={onClear} className="text-[10px] font-bold uppercase text-accent hover:underline">
                        Clear All Filters
                    </button>
                )}
            </div>
        </div>

        {/* Source Management Panel */}
        <div className="md:col-span-4 pl-0 md:pl-2">
            <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-branding font-bold uppercase text-stone-500 tracking-wider flex items-center gap-1">
                    <Database size={10} /> Active Wires
                </span>
                <FileUpload onDataLoaded={onAddFeed} isCompact />
            </div>
            
            <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                {loadedFeeds.map(feed => (
                    <div key={feed.id} className="flex justify-between items-start p-2 bg-paper border border-stone-200 group">
                         <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-1.5 mb-0.5">
                                <FileText size={10} className="text-stone-400" />
                                <div className="text-[10px] font-bold text-ink truncate max-w-[120px]" title={feed.filename}>{feed.filename}</div>
                             </div>
                             <div className="text-[9px] text-stone-400 pl-4">{feed.data.items.length} items</div>
                         </div>
                         <button onClick={() => onRemoveFeed(feed.id)} className="text-stone-300 hover:text-accent opacity-0 group-hover:opacity-100 transition-all">
                             <Trash2 size={12} />
                         </button>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;