import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Filter, X, Check } from 'lucide-react';

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
  
  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const maxCount = Math.max(...options.map(o => o.count), 1);
  const selectedLabel = options.find(o => o.value === value)?.value || value || `All ${label}`;

  return (
    <div className="relative" ref={containerRef}>
       <button 
         onClick={() => setIsOpen(!isOpen)} 
         className="flex items-center justify-between gap-2 appearance-none pl-0 pr-4 py-2 bg-transparent border-b border-stone-400 text-sm font-branding font-bold text-ink focus:outline-none focus:border-accent cursor-pointer min-w-[160px] uppercase whitespace-nowrap"
       >
          <span className="truncate max-w-[160px]">{selectedLabel}</span>
          <ChevronDown className={`text-stone-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} size={12} />
       </button>
       
       {isOpen && (
         <div className="absolute top-full left-0 mt-1 w-[300px] bg-paper border-2 border-ink shadow-[4px_4px_0px_0px_rgba(28,25,23,1)] z-50 max-h-[400px] overflow-y-auto animate-in fade-in zoom-in-95 duration-100 origin-top-left">
             <div 
                onClick={() => {onChange(''); setIsOpen(false)}} 
                className={`
                  px-3 py-2 cursor-pointer hover:bg-sepia transition-colors border-b border-stone-200 text-xs font-branding font-bold uppercase
                  ${!value ? 'bg-sepia text-accent' : 'text-stone-600'}
                `}
             >
               All {label}
             </div>
             {options.map(opt => {
                const percent = (opt.count / maxCount) * 100;
                const isSelected = value === opt.value;
                return (
                  <div 
                    key={opt.value}
                    onClick={() => {onChange(opt.value); setIsOpen(false)}} 
                    className="relative group cursor-pointer border-b border-stone-100 last:border-0"
                  >
                      {/* Volume Indicator Bar */}
                      <div 
                        className="absolute left-0 top-0 bottom-0 bg-stone-300/30 group-hover:bg-accent/10 transition-all duration-300 z-0" 
                        style={{ width: `${percent}%` }} 
                      />
                      
                      <div className="relative z-10 flex items-center justify-between px-3 py-2.5">
                          <span className={`text-sm font-serif truncate pr-2 ${isSelected ? 'font-bold text-ink' : 'text-stone-700'}`}>
                            {opt.value}
                          </span>
                          <span className="flex-shrink-0 text-[10px] font-mono font-bold text-stone-500 bg-paper/50 px-1 rounded border border-stone-200">
                             {opt.count}
                          </span>
                      </div>
                      
                      {isSelected && (
                        <div className="absolute inset-y-0 left-0 w-0.5 bg-accent z-20"></div>
                      )}
                  </div>
                );
             })}
             {options.length === 0 && (
               <div className="px-3 py-4 text-center text-xs font-serif italic text-stone-400">
                 No options available
               </div>
             )}
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
  onClear
}) => {
  const hasActiveFilters = searchTerm || selectedPub || selectedCat || selectedSource;

  return (
    <div className="bg-paper p-4 border-y-2 border-ink border-double">
      <div className="flex flex-col md:flex-row gap-6 items-end md:items-center justify-between">
        <div className="relative w-full md:max-w-md group">
          <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-ink transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search the archives..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-4 py-2 bg-transparent border-b border-stone-400 text-ink placeholder:text-stone-400 placeholder:italic font-serif focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <div className="flex flex-wrap items-center gap-4">
            {sources.length > 1 && (
              <CustomSelect
                label="Wires"
                value={selectedSource}
                onChange={onSourceChange}
                options={sources}
              />
            )}

            <CustomSelect
                label="Publications"
                value={selectedPub}
                onChange={onPubChange}
                options={publications}
            />

            <CustomSelect
                label="Topics"
                value={selectedCat}
                onChange={onCatChange}
                options={categories}
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={onClear}
              className="p-1 text-stone-400 hover:text-accent transition-colors ml-auto md:ml-0"
              title="Clear Filters"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-stone-500 uppercase tracking-wider">
        <div className="flex items-center gap-2">
          <Filter size={10} />
          Found {resultCount} {resultCount !== 1 ? 'Records' : 'Record'}
        </div>
        {totalCount !== resultCount && (
          <span className="text-stone-400">
            Selected from {totalCount} Total
          </span>
        )}
      </div>
    </div>
  );
};

export default FilterBar;