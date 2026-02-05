import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { FileJson, Loader2, Printer, Search, Zap, BarChart3, PieChart, Users, FileText } from 'lucide-react';
import FileUpload from './components/FileUpload';
import MetricsDashboard from './components/MetricsDashboard';
import DataTable from './components/DataTable';
import NewsFeed from './components/NewsFeed';
import FilterBar from './components/FilterBar';
import ExportModal from './components/ExportModal';
import ArticleSidebar from './components/ArticleSidebar';
import { FeedData, ViewMode, FeedItem, FeedPayload } from './types';
import { exportToCSV } from './utils';
import { normalizeFeedPayload } from './feedNormalizer';
import { useEditorialAI } from './hooks/useEditorialAI';

interface LoadedFeed {
  id: string;
  filename: string;
  data: FeedData;
  dateRange: { start: number, end: number };
}

const PUBLICATIONS = [
  { name: "The American Lawyer", date: "Est. 1979" },
  { name: "National Law Journal", date: "Est. 1978" },
  { name: "The Legal Intelligencer", date: "Est. 1843" },
  { name: "The Recorder", date: "Est. 1877" },
  { name: "Daily Business Review", date: "Est. 1926" },
  { name: "New York Law Journal", date: "Est. 1888" },
];

const ApiKeySelector: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const handleSelect = async () => {
    if (typeof window.aistudio !== 'undefined') {
      await window.aistudio.openSelectKey();
      onComplete();
    } else {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-paper flex flex-col items-center justify-center p-8">
      <div className="max-w-md text-center space-y-6 border-4 border-double border-ink p-8 bg-sepia shadow-2xl">
        <Zap size={48} className="mx-auto text-ink" />
        <h2 className="text-2xl font-branding font-bold uppercase tracking-tight">API Configuration Required</h2>
        <p className="font-serif italic text-sm text-stone-600">
          The Legal Chronicle uses advanced generative AI which requires a paid Gemini API key. 
          Please select an API key from a paid GCP project to enable all features.
        </p>
        <button 
          onClick={handleSelect}
          className="w-full py-3 bg-ink text-paper font-branding font-bold uppercase tracking-widest hover:bg-accent transition-colors"
        >
          Select API Key
        </button>
        <p className="text-[10px] font-mono text-stone-400">
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-ink">
            Learn about billing & quotas
          </a>
        </p>
      </div>
    </div>
  );
};

const PrintingPressLoading: React.FC<{ items: FeedItem[], onComplete: () => void }> = ({ items, onComplete }) => {
  const [step, setStep] = useState(0);
  const [headlineIndex, setHeadlineIndex] = useState(0);
  const steps = ["Inking Plates", "Typesetting Headlines", "Calibrating Grain", "Folding Folios", "Final Inspection"];

  // Calculate quick stats for the loading proof
  const stats = useMemo(() => {
    const pubCounts: Record<string, number> = {};
    const catCounts: Record<string, number> = {};
    let totalWords = 0;
    const authors = new Set();

    items.forEach(item => {
      pubCounts[item.publication] = (pubCounts[item.publication] || 0) + 1;
      totalWords += (item.wordcount || 0);
      item.authors.forEach(a => authors.add(a.name));
      const cat = item.primaryCategory?.name || 'General';
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });

    const topPub = Object.entries(pubCounts).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A';
    const topCat = Object.entries(catCounts).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return {
      count: items.length,
      avgWords: Math.round(totalWords / items.length) || 0,
      authors: authors.size,
      topPub,
      topCat
    };
  }, [items]);

  useEffect(() => {
    const timer = setInterval(() => {
      setHeadlineIndex(prev => (prev + 1) % items.length);
    }, 150);
    return () => clearInterval(timer);
  }, [items]);

  useEffect(() => {
    const sequence = async () => {
      for (let i = 0; i < steps.length; i++) {
        setStep(i);
        await new Promise(r => setTimeout(r, 1000));
      }
      onComplete();
    };
    sequence();
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-paper flex flex-col items-center justify-center p-8 animate-in fade-in duration-500 overflow-y-auto">
      <div className="w-full max-w-4xl text-center space-y-10 py-10">
        
        <div className="space-y-4">
          <div className="flex justify-center">
             <div className="p-4 border-4 border-ink rounded-full animate-bounce">
                <Printer size={48} className="text-ink" />
             </div>
          </div>
          <h2 className="text-4xl md:text-6xl font-branding font-black uppercase tracking-tighter text-ink">The Printing Press</h2>
          <div className="flex items-center justify-center gap-2 text-accent font-mono text-xs font-bold uppercase tracking-widest">
             <Loader2 size={14} className="animate-spin" /> {steps[step]}...
          </div>
        </div>

        {/* Live Proof Sheet Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="bg-sepia/30 border-2 border-ink p-6 shadow-[6px_6px_0px_0px_rgba(28,25,23,1)] animate-in slide-in-from-left duration-700">
             <div className="flex items-center gap-2 mb-4 text-stone-500 border-b border-stone-300 pb-2">
                <FileText size={16} />
                <span className="text-[10px] font-branding font-bold uppercase tracking-widest">Fig 1. Volume</span>
             </div>
             <div className="text-4xl font-display font-black text-ink">{stats.count}</div>
             <div className="text-[10px] font-mono text-stone-400 uppercase">Records Digested</div>
          </div>

          <div className="bg-sepia/30 border-2 border-ink p-6 shadow-[6px_6px_0px_0px_rgba(28,25,23,1)] animate-in slide-in-from-bottom duration-700">
             <div className="flex items-center gap-2 mb-4 text-stone-500 border-b border-stone-300 pb-2">
                <BarChart3 size={16} />
                <span className="text-[10px] font-branding font-bold uppercase tracking-widest">Fig 3. Leading Pub</span>
             </div>
             <div className="text-xl font-display font-bold text-ink truncate" title={stats.topPub}>{stats.topPub}</div>
             <div className="text-[10px] font-mono text-stone-400 uppercase mt-2">Primary Contributor</div>
          </div>

          <div className="bg-sepia/30 border-2 border-ink p-6 shadow-[6px_6px_0px_0px_rgba(28,25,23,1)] animate-in slide-in-from-right duration-700">
             <div className="flex items-center gap-2 mb-4 text-stone-500 border-b border-stone-300 pb-2">
                <PieChart size={16} />
                <span className="text-[10px] font-branding font-bold uppercase tracking-widest">Fig 4. Distribution</span>
             </div>
             <div className="text-xl font-display font-bold text-ink truncate" title={stats.topCat}>{stats.topCat}</div>
             <div className="text-[10px] font-mono text-stone-400 uppercase mt-2">Predominant Subject</div>
          </div>
        </div>

        {/* Scrolling News Proof */}
        <div className="bg-white/50 border-y-4 border-double border-stone-300 p-8 relative overflow-hidden h-32 flex items-center justify-center shadow-inner">
           <div className="absolute inset-x-0 h-px bg-stone-300 top-1/2 -translate-y-1/2 opacity-30"></div>
           <div key={headlineIndex} className="text-xl md:text-2xl font-display font-bold text-ink italic opacity-70 transition-all duration-75 transform scale-105 px-4 text-center">
              "{items[headlineIndex].title}"
           </div>
           <div className="absolute bottom-2 right-4 text-[9px] font-mono text-stone-400">SERIAL_KEY: PUBLISH_0x{headlineIndex.toString(16)}</div>
        </div>

        {/* Progress Bar */}
        <div className="max-w-md mx-auto grid grid-cols-5 gap-2">
           {steps.map((_, i) => (
              <div key={i} className={`h-1.5 transition-all duration-500 border border-ink/10 ${i <= step ? 'bg-accent shadow-[2px_2px_0px_0px_rgba(139,0,0,1)]' : 'bg-stone-200'}`}></div>
           ))}
        </div>
      </div>
    </div>
  );
};

const SubHeaderTicker: React.FC = () => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % PUBLICATIONS.length);
    }, 3500); 
    return () => clearInterval(timer);
  }, []);
  const current = PUBLICATIONS[index];
  return (
    <div className="inline-flex items-center gap-2 overflow-hidden px-2">
       <div key={index} className="flex items-center gap-2 animate-press-rotate whitespace-nowrap">
          <span className="font-bold text-ink uppercase tracking-[0.2em]">{current.name}</span>
          <span className="text-stone-400 font-mono text-[9px]">— {current.date}</span>
       </div>
    </div>
  );
};

const getFilteredItems = (items: FeedItem[], criteria: any, ignore?: string) => {
  return items.filter(item => {
    const matchesSearch = !criteria.search || item.title.toLowerCase().includes(criteria.search.toLowerCase()) || (item.summary && item.summary.toLowerCase().includes(criteria.search.toLowerCase()));
    const matchesPub = ignore === 'pub' || !criteria.pub || item.publication === criteria.pub;
    const matchesCat = ignore === 'cat' || !criteria.cat || item.categories.some(c => c.name === criteria.cat) || item.primaryCategory?.name === criteria.cat;
    const matchesSource = ignore === 'src' || !criteria.src || item.source === criteria.src;
    return matchesSearch && matchesPub && matchesCat && matchesSource;
  });
};

const App: React.FC = () => {
  const [initialConfig] = useState(() => window.legalChronicleConfig);
  const [loadedFeeds, setLoadedFeeds] = useState<LoadedFeed[]>([]);
  const [stagingData, setStagingData] = useState<LoadedFeed[] | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('feed'); 
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<FeedItem | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);

  // New state for category navigation
  const [targetCategory, setTargetCategory] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPub, setSelectedPub] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedSource, setSelectedSource] = useState('');

  const { generateEditorialIllustration } = useEditorialAI();

  useEffect(() => {
    const checkApiKey = async () => {
      if (typeof window.aistudio !== 'undefined') {
        const has = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(has);
      }
    };
    checkApiKey();
  }, []);

  const buildLoadedFeeds = useCallback((files: { data: FeedData, filename: string }[]) => {
    return files.map((file, index) => {
      const dates = file.data.items.map(i => new Date(i.publishedAt).getTime()).filter(t => !isNaN(t));
      const range = dates.length > 0 ? { start: Math.min(...dates), end: Math.max(...dates) } : { start: Date.now(), end: Date.now() };
      return { id: `${Date.now()}-${index}`, filename: file.filename, data: file.data, dateRange: range };
    });
  }, []);

  const stageFeeds = useCallback((feeds: LoadedFeed[]) => {
    if (feeds.length === 0) return;
    setStagingData(feeds);
    setIsPrinting(true);
    if (feeds[0].data.items.length > 0) {
      generateEditorialIllustration(feeds[0].data.items[0], "Modern Newspaper");
    }
  }, [generateEditorialIllustration]);

  const handleDataLoaded = useCallback((files: { data: FeedData, filename: string }[]) => {
    stageFeeds(buildLoadedFeeds(files));
  }, [buildLoadedFeeds, stageFeeds]);

  const handlePayloadLoaded = useCallback((payload: FeedPayload, sourceLabel = 'api-feed') => {
    const normalizedFeeds = normalizeFeedPayload(payload, sourceLabel);
    if (normalizedFeeds.length === 0) {
      console.error('No recognizable items found in the feed payload.');
      return;
    }
    stageFeeds(
      buildLoadedFeeds(
        normalizedFeeds.map((data, index) => ({
          data,
          filename: normalizedFeeds.length > 1 ? `${sourceLabel}-${index + 1}` : data.feedId || sourceLabel
        }))
      )
    );
  }, [buildLoadedFeeds, stageFeeds]);

  const loadFeedFromUrl = useCallback(async (feedUrl: string, sourceLabel = 'api-feed') => {
    try {
      const response = await fetch(feedUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch feed (${response.status})`);
      }
      const payload = await response.json();
      handlePayloadLoaded(payload as FeedPayload, sourceLabel);
    } catch (error) {
      console.error('Failed to load feed', error);
    }
  }, [handlePayloadLoaded]);

  useEffect(() => {
    window.legalChronicle = {
      loadFeed: handlePayloadLoaded
    };
    return () => {
      delete window.legalChronicle;
    };
  }, [handlePayloadLoaded]);

  useEffect(() => {
    if (initialConfig?.feedData) {
      handlePayloadLoaded(initialConfig.feedData, initialConfig.sourceLabel || 'embedded');
    } else if (initialConfig?.feedUrl) {
      loadFeedFromUrl(initialConfig.feedUrl, initialConfig.sourceLabel || 'embedded');
    }
  }, [handlePayloadLoaded, initialConfig, loadFeedFromUrl]);

  const finalizeLoading = () => {
    if (stagingData) {
      setLoadedFeeds(prev => [...prev, ...stagingData]);
      setStagingData(null);
      setIsPrinting(false);
      if (loadedFeeds.length === 0) setViewMode('feed');
    }
  };

  const handleRemoveFeed = (id: string) => setLoadedFeeds(prev => prev.filter(f => f.id !== id));
  const handleReset = () => { setLoadedFeeds([]); setViewMode('feed'); clearFilters(); };
  const clearFilters = () => { setSearchTerm(''); setSelectedPub(''); setSelectedCat(''); setSelectedSource(''); };

  const allItems = useMemo<FeedItem[]>(() => {
    return loadedFeeds.flatMap((feed) => feed.data.items.map(item => ({ ...item, id: `${feed.id}-${item.id}`, originalId: item.id, source: feed.filename })));
  }, [loadedFeeds]);

  const stagingItems = useMemo<FeedItem[]>(() => {
    return stagingData ? stagingData.flatMap((feed) => feed.data.items) : [];
  }, [stagingData]);

  const globalDateRange = useMemo(() => {
    if (allItems.length === 0) return null;
    const timestamps = allItems.map(i => new Date(i.publishedAt).getTime()).filter(t => !isNaN(t));
    if (timestamps.length === 0) return null;
    const min = new Date(Math.min(...timestamps));
    const max = new Date(Math.max(...timestamps));
    return { startYear: min.getFullYear(), endYear: max.getFullYear() };
  }, [allItems]);

  const filteredItems = useMemo(() => {
     return getFilteredItems(allItems, { search: searchTerm, pub: selectedPub, cat: selectedCat, src: selectedSource });
  }, [allItems, searchTerm, selectedPub, selectedCat, selectedSource]);

  const handleCategorySelect = (category: string) => {
    setTargetCategory(category);
    setViewMode('feed');
  };

  return (
    <div className="min-h-screen bg-[#f4f1ea] font-serif text-ink selection:bg-stone-300 selection:text-black pb-20">
      
      {!hasApiKey && <ApiKeySelector onComplete={() => setHasApiKey(true)} />}
      {isPrinting && <PrintingPressLoading items={stagingItems} onComplete={finalizeLoading} />}

      <header className="pt-8 pb-4 bg-[#f4f1ea]">
        <div className="max-w-7xl mx-auto px-4 text-center">
             <button onClick={handleReset} className="block mx-auto hover:opacity-80 transition-opacity">
                <h1 className="text-5xl md:text-8xl font-branding font-black uppercase tracking-tighter text-ink mb-3 leading-none scale-y-95">
                    The Legal Chronicle
                </h1>
             </button>
             
             <div className="border-y-2 border-ink py-1.5 mb-8 flex flex-col md:flex-row justify-between items-center text-[10px] md:text-xs font-branding uppercase tracking-[0.15em] gap-2">
                <div className="flex-1 text-left hidden md:block">
                  <span className="opacity-60">{globalDateRange ? `Records c. ${globalDateRange.startYear}–${globalDateRange.endYear}` : `Vol. ${Math.max(1, loadedFeeds.length)}`}</span>
                </div>
                
                <div className="flex-1 text-center font-bold px-4 flex items-center justify-center">
                   <div className="h-6 flex items-center overflow-hidden">
                      <SubHeaderTicker />
                   </div>
                </div>

                <div className="flex-1 text-right hidden md:block">
                  <span className="opacity-60">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
             </div>

             {loadedFeeds.length > 0 && (
                <div className="flex justify-center flex-wrap gap-x-8 gap-y-2 text-[11px] font-branding font-bold uppercase tracking-[0.2em] text-stone-500">
                    <button onClick={() => setViewMode('feed')} className={`hover:text-ink transition-colors pb-1 border-b-2 ${viewMode === 'feed' ? 'text-accent border-accent' : 'border-transparent'}`}>Front Page</button>
                    <button onClick={() => setViewMode('analytics')} className={`hover:text-ink transition-colors pb-1 border-b-2 ${viewMode === 'analytics' ? 'text-accent border-accent' : 'border-transparent'}`}>Market Data</button>
                    <button onClick={() => setViewMode('table')} className={`hover:text-ink transition-colors pb-1 border-b-2 ${viewMode === 'table' ? 'text-accent border-accent' : 'border-transparent'}`}>The Ledger</button>
                    <span className="text-stone-300">|</span>
                    <button onClick={() => setIsExportModalOpen(true)} className="hover:text-ink transition-colors">Export</button>
                    <button onClick={handleReset} className="hover:text-accent transition-colors">Reset</button>
                </div>
             )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {loadedFeeds.length === 0 && !isPrinting ? (
          <FileUpload onDataLoaded={handleDataLoaded} />
        ) : (
          <div>
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
                    sources={[]}
                    publications={[]}
                    categories={[]}
                    resultCount={filteredItems.length}
                    totalCount={allItems.length}
                    onClear={clearFilters}
                    loadedFeeds={loadedFeeds}
                    onAddFeed={handleDataLoaded}
                    onRemoveFeed={handleRemoveFeed}
                  />
               </div>
            )}
            <div className="min-h-[85vh]">
                {viewMode === 'analytics' && <MetricsDashboard items={filteredItems} onCategorySelect={handleCategorySelect} />}
                {viewMode === 'table' && <DataTable data={allItems} onCategorySelect={handleCategorySelect} />}
                {viewMode === 'feed' && (
                  <NewsFeed 
                    items={filteredItems} 
                    onArticleClick={setSelectedArticle}
                    initialCategory={targetCategory}
                    onCategoryLoaded={() => setTargetCategory(null)}
                  />
                )}
            </div>
          </div>
        )}
      </main>
      <ExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} onExport={(ids) => exportToCSV(filteredItems, ids)} />
      <ArticleSidebar 
        article={selectedArticle} 
        onClose={() => setSelectedArticle(null)} 
        onCategoryClick={handleCategorySelect}
      />
    </div>
  );
};

export default App;
