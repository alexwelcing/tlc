import React, { useState, useMemo, useEffect } from 'react';
import { Table as TableIcon, Download, RefreshCw, BarChart3, Newspaper } from 'lucide-react';
import FileUpload from './components/FileUpload';
import MetricsDashboard from './components/MetricsDashboard';
import DataTable from './components/DataTable';
import NewsFeed from './components/NewsFeed';
import FilterBar from './components/FilterBar';
import ExportModal from './components/ExportModal';
import ArticleSidebar from './components/ArticleSidebar';
import { FeedData, ViewMode, FeedItem } from './types';
import { exportToCSV } from './utils';

interface LoadedFeed {
  id: string; // generated unique id
  filename: string;
  data: FeedData;
  dateRange: { start: number, end: number };
}

const PUBLICATIONS = [
  { name: "The American Lawyer", date: "Est. 1979", loc: "New York, NY" },
  { name: "Corporate Counsel", date: "Est. 1994", loc: "New York, NY" },
  { name: "National Law Journal", date: "Est. 1978", loc: "United States" },
  { name: "New Jersey Law Journal", date: "Est. 1878", loc: "Somerville, NJ" },
  { name: "The Legal Intelligencer", date: "Est. 1843", loc: "Philadelphia, PA" },
  { name: "The Recorder", date: "Est. 1877", loc: "San Francisco, CA" },
  { name: "Connecticut Law Tribune", date: "Est. 1974", loc: "Connecticut" },
  { name: "Daily Business Review", date: "Est. 1926", loc: "South Florida" },
  { name: "New York Law Journal", date: "Est. 1888", loc: "New York, NY" },
  { name: "Daily Report", date: "Est. 1890", loc: "Atlanta, GA" },
  { name: "Delaware Business Court Insider", date: "Est. 2013", loc: "Delaware" },
  { name: "Legaltech News", date: "Est. 1993", loc: "New York, NY" },
  { name: "Texas Lawyer", date: "Est. 1985", loc: "Texas" },
  { name: "Supreme Court Brief", date: "Est. 2013", loc: "Washington, D.C." },
  { name: "Litigation Daily", date: "Est. 2013", loc: "United States" },
];

const VintageTicker: React.FC = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % PUBLICATIONS.length);
    }, 4500); 
    return () => clearInterval(timer);
  }, []);

  const current = PUBLICATIONS[index];

  return (
    <div className="flex-1 min-w-[200px] overflow-hidden flex items-center justify-start md:justify-center">
       <div key={index} className="inline-flex items-baseline gap-3">
          <span className="animate-press-rotate font-black text-ink font-branding tracking-tight text-lg leading-none transform-style-3d">
            {current.name}
          </span>
          <div className="hidden sm:inline-flex items-baseline gap-2 opacity-60">
             <span className="text-[10px] font-serif italic">— {current.loc}</span>
          </div>
       </div>
    </div>
  );
};

// Helper for filtering items
const getFilteredItems = (
  items: FeedItem[], 
  criteria: { search: string; pub: string; cat: string; src: string },
  ignore?: 'pub' | 'cat' | 'src'
) => {
  return items.filter(item => {
    const matchesSearch = 
      !criteria.search || 
      item.title.toLowerCase().includes(criteria.search.toLowerCase()) || 
      (item.summary && item.summary.toLowerCase().includes(criteria.search.toLowerCase()));
    
    const matchesPub = ignore === 'pub' || !criteria.pub || item.publication === criteria.pub;
    
    const matchesCat = ignore === 'cat' || !criteria.cat || 
      item.categories.some(c => c.name === criteria.cat) || 
      item.primaryCategory?.name === criteria.cat;

    const matchesSource = ignore === 'src' || !criteria.src || item.source === criteria.src;
    
    return matchesSearch && matchesPub && matchesCat && matchesSource;
  });
};

const App: React.FC = () => {
  const [loadedFeeds, setLoadedFeeds] = useState<LoadedFeed[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('feed'); 
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<FeedItem | null>(null);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPub, setSelectedPub] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedSource, setSelectedSource] = useState('');

  const handleDataLoaded = (files: { data: FeedData, filename: string }[]) => {
    const newFeeds: LoadedFeed[] = files.map((file, index) => {
      const dates = file.data.items.map(i => new Date(i.publishedAt).getTime()).filter(t => !isNaN(t));
      const range = dates.length > 0 ? {
          start: Math.min(...dates),
          end: Math.max(...dates)
      } : { start: Date.now(), end: Date.now() };

      return {
        id: `${Date.now()}-${index}`,
        filename: file.filename,
        data: file.data,
        dateRange: range
      };
    });
    setLoadedFeeds(prev => [...prev, ...newFeeds]);
    if (loadedFeeds.length === 0) {
      setViewMode('feed');
    }
  };

  const handleRemoveFeed = (id: string) => {
    setLoadedFeeds(prev => prev.filter(f => f.id !== id));
  };
  
  useEffect(() => {
      if (loadedFeeds.length === 0 && viewMode !== 'feed') {
          handleReset();
      }
  }, [loadedFeeds]);

  const handleReset = () => {
    setLoadedFeeds([]);
    setViewMode('feed');
    clearFilters();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedPub('');
    setSelectedCat('');
    setSelectedSource('');
  };

  const allItems = useMemo<FeedItem[]>(() => {
    return loadedFeeds.flatMap((feed) => 
      feed.data.items.map(item => ({
        ...item,
        id: `${feed.id}-${item.id}`,
        originalId: item.id,
        source: feed.filename
      }))
    );
  }, [loadedFeeds]);

  const globalDateRange = useMemo(() => {
    if (allItems.length === 0) return null;
    const timestamps = allItems.map(i => new Date(i.publishedAt).getTime()).filter(t => !isNaN(t));
    if (timestamps.length === 0) return null;
    const min = new Date(Math.min(...timestamps));
    const max = new Date(Math.max(...timestamps));
    return {
        startYear: min.getFullYear(),
        endYear: max.getFullYear()
    };
  }, [allItems]);

  const facets = useMemo(() => {
     const currentFilters = { search: searchTerm, pub: selectedPub, cat: selectedCat, src: selectedSource };
     
     const pubItems = getFilteredItems(allItems, currentFilters, 'pub');
     const pubCounts: Record<string, number> = {};
     pubItems.forEach(i => { if(i.publication) pubCounts[i.publication] = (pubCounts[i.publication] || 0) + 1; });
     const publications = Object.entries(pubCounts).map(([value, count]) => ({value, count})).sort((a,b) => a.value.localeCompare(b.value));

     const catItems = getFilteredItems(allItems, currentFilters, 'cat');
     const catCounts: Record<string, number> = {};
     catItems.forEach(i => {
         const cats = new Set<string>();
         if (i.categories) i.categories.forEach(c => cats.add(c.name));
         if (i.primaryCategory) cats.add(i.primaryCategory.name);
         cats.forEach(c => { if(c) catCounts[c] = (catCounts[c] || 0) + 1; });
     });
     const categories = Object.entries(catCounts).map(([value, count]) => ({value, count})).sort((a,b) => a.value.localeCompare(b.value));

     const srcItems = getFilteredItems(allItems, currentFilters, 'src');
     const srcCounts: Record<string, number> = {};
     srcItems.forEach(i => { if(i.source) srcCounts[i.source] = (srcCounts[i.source] || 0) + 1; });
     const sources = Object.entries(srcCounts).map(([value, count]) => ({value, count})).sort((a,b) => a.value.localeCompare(b.value));

     return { publications, categories, sources };
  }, [allItems, searchTerm, selectedPub, selectedCat, selectedSource]);

  const filteredItems = useMemo(() => {
     return getFilteredItems(allItems, {
         search: searchTerm,
         pub: selectedPub,
         cat: selectedCat,
         src: selectedSource
     });
  }, [allItems, searchTerm, selectedPub, selectedCat, selectedSource]);

  const handleExport = (selectedColumnIds: string[]) => {
    if (filteredItems.length > 0) {
      exportToCSV(filteredItems, selectedColumnIds);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f1ea] font-serif text-ink selection:bg-stone-300 selection:text-black pb-20">
      
      {/* Newspaper Masthead */}
      <header className="pt-8 pb-4 bg-[#f4f1ea]">
        <div className="max-w-7xl mx-auto px-4 text-center">
            {/* Title */}
             <h1 className="text-5xl md:text-8xl font-branding font-black uppercase tracking-tighter text-ink mb-3 leading-none scale-y-90">
                The Legal Chronicle
             </h1>
             
             {/* Simple Divider Line with Meta Info */}
             <div className="border-y-2 border-ink py-1.5 mb-8 flex flex-col md:flex-row justify-between items-center text-[10px] md:text-xs font-branding uppercase tracking-[0.15em] gap-2">
                <div className="flex-1 text-left hidden md:block"><VintageTicker /></div>
                <div className="flex-1 text-center font-bold px-4">
                    {globalDateRange ? `c. ${globalDateRange.startYear}–${globalDateRange.endYear}` : `Vol. ${Math.max(1, loadedFeeds.length)}`} 
                    <span className="mx-2">•</span> 
                    Printed in Digital Ink
                </div>
                <div className="flex-1 text-right hidden md:block">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
             </div>

             {/* Minimalist Navigation */}
             {loadedFeeds.length > 0 && (
                <div className="flex justify-center flex-wrap gap-x-8 gap-y-2 text-[11px] font-branding font-bold uppercase tracking-[0.2em] text-stone-500">
                    <button 
                        onClick={() => setViewMode('feed')} 
                        className={`hover:text-ink transition-colors pb-1 border-b-2 ${viewMode === 'feed' ? 'text-accent border-accent' : 'border-transparent'}`}
                    >
                        Front Page
                    </button>
                    <button 
                        onClick={() => setViewMode('analytics')} 
                        className={`hover:text-ink transition-colors pb-1 border-b-2 ${viewMode === 'analytics' ? 'text-accent border-accent' : 'border-transparent'}`}
                    >
                        Market Data
                    </button>
                    <button 
                        onClick={() => setViewMode('table')} 
                        className={`hover:text-ink transition-colors pb-1 border-b-2 ${viewMode === 'table' ? 'text-accent border-accent' : 'border-transparent'}`}
                    >
                        The Ledger
                    </button>
                    <span className="text-stone-300">|</span>
                    <button onClick={() => setIsExportModalOpen(true)} className="hover:text-ink transition-colors pb-1 border-b-2 border-transparent">
                        Export
                    </button>
                    <button onClick={handleReset} className="hover:text-accent transition-colors pb-1 border-b-2 border-transparent" title="Reset">
                        Reset
                    </button>
                </div>
             )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {loadedFeeds.length === 0 ? (
          <FileUpload onDataLoaded={handleDataLoaded} />
        ) : (
          <div>
            {/* Filters - Collapsible & Tucked */}
            {viewMode !== 'table' && (
               <div className="mb-10 flex justify-center">
                  <FilterBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    selectedSource={selectedSource}
                    onSourceChange={setSelectedSource}
                    selectedPub={selectedPub}
                    onPubChange={setSelectedPub}
                    selectedCat={selectedCat}
                    onCatChange={setSelectedCat}
                    sources={facets.sources}
                    publications={facets.publications}
                    categories={facets.categories}
                    resultCount={filteredItems.length}
                    totalCount={allItems.length}
                    onClear={clearFilters}
                    loadedFeeds={loadedFeeds}
                    onAddFeed={(files) => handleDataLoaded(files)}
                    onRemoveFeed={handleRemoveFeed}
                  />
               </div>
            )}

            {/* Content Area - Min Height Ensures Paper Feel */}
            <div className="min-h-[85vh]">
                {viewMode === 'analytics' && <MetricsDashboard items={filteredItems} />}
                {viewMode === 'table' && <DataTable data={allItems} />}
                {viewMode === 'feed' && <NewsFeed items={filteredItems} onArticleClick={setSelectedArticle} />}
            </div>
          </div>
        )}
      </main>

      <ExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExport}
      />
      
      <ArticleSidebar 
        article={selectedArticle} 
        onClose={() => setSelectedArticle(null)} 
      />
    </div>
  );
};

export default App;