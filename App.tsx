import React, { useState, useMemo, useEffect } from 'react';
import { LayoutGrid, Table as TableIcon, Download, RefreshCw, BarChart3, Newspaper, FileText, ChevronDown, ChevronUp, ScrollText, Trash2, Calendar, Database } from 'lucide-react';
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
    }, 4500); // Rotate every 4.5 seconds
    return () => clearInterval(timer);
  }, []);

  const current = PUBLICATIONS[index];

  return (
    <div className="flex-1 min-w-[200px] overflow-hidden flex items-center">
       <div key={index} className="inline-flex items-baseline gap-3">
          <span className="animate-press-rotate font-black text-ink font-branding tracking-tight text-lg leading-none transform-style-3d">
            {current.name}
          </span>
          <div className="inline-flex items-baseline gap-2">
            <span className="animate-burn-in text-[10px] font-bold tracking-widest uppercase text-accent border-b border-accent/20 pb-0.5">
                {current.date}
            </span>
            <span className="hidden sm:inline animate-burn-in-text text-[10px] text-stone-500 font-serif italic">
                — {current.loc}
            </span>
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
  const [showSources, setShowSources] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<FeedItem | null>(null);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPub, setSelectedPub] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedSource, setSelectedSource] = useState('');

  const handleDataLoaded = (files: { data: FeedData, filename: string }[]) => {
    const newFeeds: LoadedFeed[] = files.map((file, index) => {
      // Calculate date range for this specific feed
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
      setShowSources(true); // Auto-show sources on first load so user sees what happened
    }
  };

  const handleRemoveFeed = (id: string) => {
    setLoadedFeeds(prev => prev.filter(f => f.id !== id));
  };
  
  // Effect to handle full reset if feeds are empty
  useEffect(() => {
      if (loadedFeeds.length === 0 && viewMode !== 'feed') {
          handleReset();
      }
  }, [loadedFeeds]);

  const handleReset = () => {
    setLoadedFeeds([]);
    setViewMode('feed');
    setShowSources(false);
    clearFilters();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedPub('');
    setSelectedCat('');
    setSelectedSource('');
  };

  // Flatten items
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

  // Calculate Global Date Range for Header
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

  // Compute Faceted Counts
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
    <div className="min-h-screen bg-paper font-serif text-ink">
      {/* Newspaper Masthead */}
      <header className="border-b-4 border-double border-ink bg-paper pt-6 pb-2 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-4">
                 <h1 className="text-4xl md:text-6xl font-branding font-black uppercase tracking-tight text-ink border-b-2 border-ink pb-4 mb-2">
                    The Legal Chronicle
                 </h1>
                 <div className="flex flex-col md:flex-row justify-between items-center text-xs md:text-sm font-branding uppercase border-b border-ink pb-1 px-2 gap-2 md:gap-0">
                    <VintageTicker />
                    <div className="flex items-center gap-4 md:gap-8 flex-shrink-0">
                        {globalDateRange ? (
                             <span className="font-bold">c. {globalDateRange.startYear}–{globalDateRange.endYear}</span>
                        ) : (
                             <span>Volume {loadedFeeds.length > 0 ? loadedFeeds.length : 'I'}</span>
                        )}
                        <span className="hidden sm:inline">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        <span>Client Privilege</span>
                    </div>
                 </div>
            </div>

            {/* Navigation / Toolbar */}
            {loadedFeeds.length > 0 && (
              <div className="flex flex-col md:flex-row justify-between items-center py-2 gap-4">
                <nav className="flex items-center gap-6 font-branding text-sm font-bold tracking-widest">
                  <button
                    onClick={() => setViewMode('feed')}
                    className={`flex items-center gap-2 pb-1 border-b-2 transition-all duration-200 ${
                      viewMode === 'feed' 
                        ? 'border-accent text-accent' 
                        : 'border-transparent text-stone-600 hover:text-ink hover:border-stone-300'
                    }`}
                  >
                    <Newspaper size={16} />
                    Front Page
                  </button>
                  <button
                    onClick={() => setViewMode('analytics')}
                    className={`flex items-center gap-2 pb-1 border-b-2 transition-all duration-200 ${
                      viewMode === 'analytics' 
                        ? 'border-accent text-accent' 
                        : 'border-transparent text-stone-600 hover:text-ink hover:border-stone-300'
                    }`}
                  >
                    <BarChart3 size={16} />
                    Market Data
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`flex items-center gap-2 pb-1 border-b-2 transition-all duration-200 ${
                      viewMode === 'table' 
                        ? 'border-accent text-accent' 
                        : 'border-transparent text-stone-600 hover:text-ink hover:border-stone-300'
                    }`}
                  >
                    <TableIcon size={16} />
                    The Ledger
                  </button>
                </nav>

                <div className="flex items-center gap-3">
                    <button
                    onClick={() => setIsExportModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-1.5 border-2 border-ink text-ink font-branding text-xs font-bold uppercase hover:bg-ink hover:text-paper transition-all active:translate-y-0.5"
                    >
                    <Download size={14} />
                    Export
                    </button>
                    
                    <button
                        onClick={handleReset}
                        className="p-1.5 text-stone-500 hover:text-accent transition-colors"
                        title="Start Over"
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>
              </div>
            )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loadedFeeds.length === 0 ? (
          <FileUpload onDataLoaded={handleDataLoaded} />
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-ink pb-6">
                <div className="w-full">
                  <div className="flex items-baseline justify-between mb-2">
                     <h2 className="text-3xl font-display font-bold text-ink italic">
                        {viewMode === 'analytics' && 'Market Analysis'}
                        {viewMode === 'table' && 'Detailed Manifest'}
                        {viewMode === 'feed' && 'Latest Headlines'}
                     </h2>
                     <FileUpload onDataLoaded={handleDataLoaded} isCompact={true} />
                  </div>
                  
                  {/* Collapsible Source List (Wire Services) */}
                  <div className="mt-1">
                    <button 
                      onClick={() => setShowSources(!showSources)}
                      className="flex items-center gap-2 text-sm font-serif italic text-stone-600 hover:text-accent transition-colors group"
                    >
                      <span>
                        Reporting on <span className="font-bold text-ink not-italic">{allItems.length}</span> stories 
                        from <span className="font-bold text-ink not-italic">{loadedFeeds.length}</span> wires
                      </span>
                      {showSources ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    
                    {showSources && (
                      <div className="mt-4 animate-in slide-in-from-top-2 duration-300">
                        <div className="bg-sepia/50 border border-ink p-4 shadow-inner">
                            <div className="text-xs font-branding font-bold text-stone-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Database size={12} /> Active Wire Connections
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {loadedFeeds.map(feed => (
                                    <div key={feed.id} className="relative group bg-paper border border-stone-300 p-3 shadow-sm hover:shadow-md transition-shadow flex items-start gap-3">
                                        <div className="p-2 bg-stone-100 border border-stone-200">
                                            <FileText size={20} className="text-stone-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-sm text-ink truncate" title={feed.filename}>
                                                {feed.filename}
                                            </div>
                                            <div className="text-[10px] font-mono text-stone-500 mt-0.5 flex flex-col">
                                                <span>{feed.data.items.length} records</span>
                                                {feed.dateRange.start !== -Infinity ? (
                                                    <span className="text-stone-400">
                                                        {new Date(feed.dateRange.start).getFullYear()} - {new Date(feed.dateRange.end).getFullYear()}
                                                    </span>
                                                ) : (
                                                    <span className="text-stone-300">Date unknown</span>
                                                )}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleRemoveFeed(feed.id)}
                                            className="absolute top-2 right-2 p-1 text-stone-300 hover:text-accent hover:bg-accent/10 rounded transition-colors"
                                            title="Disconnect Wire"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Global Filter Bar */}
              {viewMode !== 'table' && (
                <div className="sticky top-[180px] z-30 animate-in fade-in slide-in-from-top-4 duration-300">
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
                  />
                </div>
              )}
            </div>

            <div className="min-h-[500px] border-t-2 border-ink pt-6">
                {viewMode === 'analytics' && <MetricsDashboard items={filteredItems} />}
                {viewMode === 'table' && <DataTable data={allItems} />}
                {viewMode === 'feed' && <NewsFeed items={filteredItems} onArticleClick={setSelectedArticle} />}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t-4 border-double border-ink mt-12 py-8 bg-sepia text-center">
        <p className="font-branding text-xs text-stone-600 uppercase tracking-widest">
            The Legal Chronicle &copy; {new Date().getFullYear()} • Printed in Digital Ink
        </p>
      </footer>

      <ExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExport}
      />
      
      {/* Article Sidebar */}
      <ArticleSidebar 
        article={selectedArticle} 
        onClose={() => setSelectedArticle(null)} 
      />
    </div>
  );
};

export default App;