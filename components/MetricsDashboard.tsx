import React, { useMemo, useState } from 'react';
import { FeedItem } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Treemap,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import { RefreshCw, GitCompare, ScrollText, ArrowRight } from 'lucide-react';

interface MetricsDashboardProps {
  items: FeedItem[];
  onCategorySelect?: (category: string) => void;
}

const PATTERNS = ['hatch', 'crosshatch', 'dots', 'weave', 'vertical'];

const CustomTreemapItem = (props: any) => {
  const { root, depth, x, y, width, height, index, payload, name, value, onSelect } = props;
  const patternId = PATTERNS[index % PATTERNS.length];

  return (
    <g>
      <rect
        x={x + 2}
        y={y + 2}
        width={width}
        height={height}
        fill="#e6e2d3"
        stroke="none"
        opacity={0.5}
      />
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={`url(#${patternId})`}
        stroke="#1c1917"
        strokeWidth={2}
        style={{ cursor: 'pointer' }}
        onClick={() => onSelect(payload)}
        className="hover:opacity-80 transition-opacity"
      />
      {width > 40 && height > 25 && (
        <foreignObject x={x} y={y} width={width} height={height} style={{pointerEvents: 'none'}}>
            <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center overflow-hidden">
                <span className="text-paper bg-ink/90 px-1 text-[9px] md:text-[10px] font-branding font-bold uppercase tracking-wider truncate max-w-full">
                    {name}
                </span>
                {height > 40 && (
                     <span className="text-paper/90 bg-ink/70 px-1 text-[8px] md:text-[9px] font-mono font-bold mt-0.5">
                        {Math.round(value / root.value * 100)}%
                    </span>
                )}
            </div>
        </foreignObject>
      )}
    </g>
  );
};

const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ items, onCategorySelect }) => {
  const [timeFrame, setTimeFrame] = useState<'day' | 'week' | 'month'>('week');
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareDimension, setCompareDimension] = useState<'publication' | 'category'>('publication');
  const [compareValA, setCompareValA] = useState<string>('');
  const [compareValB, setCompareValB] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<any | null>(null);

  const dimensionOptions = useMemo(() => {
    const options = new Set<string>();
    items.forEach(item => {
        if (compareDimension === 'publication') {
            options.add(item.publication);
        } else {
            if (item.primaryCategory?.name) options.add(item.primaryCategory.name);
            item.categories.forEach(c => options.add(c.name));
        }
    });
    return Array.from(options).sort();
  }, [items, compareDimension]);

  useMemo(() => {
      if (!compareValA && dimensionOptions.length > 0) setCompareValA(dimensionOptions[0]);
      if (!compareValB && dimensionOptions.length > 1) setCompareValB(dimensionOptions[1]);
  }, [dimensionOptions]);

  const timelineData = useMemo(() => {
    const dataMap = new Map<string, { date: string, count: number, countA: number, countB: number }>();
    items.forEach(item => {
        const dateObj = new Date(item.publishedAt);
        if (isNaN(dateObj.getTime())) return;
        let key = '';
        if (timeFrame === 'day') key = dateObj.toISOString().split('T')[0];
        else if (timeFrame === 'month') key = dateObj.toISOString().slice(0, 7);
        else if (timeFrame === 'week') {
             const d = new Date(dateObj);
             d.setUTCDate(d.getUTCDate() - d.getUTCDay());
             key = d.toISOString().split('T')[0];
        }
        if (!dataMap.has(key)) dataMap.set(key, { date: key, count: 0, countA: 0, countB: 0 });
        const entry = dataMap.get(key)!;
        entry.count += 1;
        if (isCompareMode) {
            let matchesA = false, matchesB = false;
            if (compareDimension === 'publication') {
                matchesA = item.publication === compareValA;
                matchesB = item.publication === compareValB;
            } else {
                const cats = new Set(item.categories.map(c => c.name));
                if (item.primaryCategory?.name) cats.add(item.primaryCategory.name);
                matchesA = cats.has(compareValA);
                matchesB = cats.has(compareValB);
            }
            if (matchesA) entry.countA += 1;
            if (matchesB) entry.countB += 1;
        }
    });
    return Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [items, timeFrame, isCompareMode, compareDimension, compareValA, compareValB]);

  const publicationData = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach(item => { counts[item.publication] = (counts[item.publication] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [items]);

  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach(item => {
      if (item.categories && item.categories.length > 0) {
        item.categories.forEach(cat => { if (cat.name) counts[cat.name] = (counts[cat.name] || 0) + 1; });
      } else {
         const catName = item.primaryCategory?.name || 'Uncategorized';
         counts[catName] = (counts[catName] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [items]);

  const formatDateLabel = (dateStr: string, isTooltip = false) => {
    const parseStr = dateStr.length === 7 ? `${dateStr}-01` : dateStr;
    const date = new Date(parseStr);
    if (timeFrame === 'month') return date.toLocaleDateString('en-US', { month: isTooltip ? 'long' : 'short', year: 'numeric', timeZone: 'UTC' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <svg style={{ height: 0, width: 0, position: 'absolute' }}>
        <defs>
            <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="8" fill="#1c1917" opacity="0.9" /></pattern>
            <pattern id="crosshatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#f4f1ea" /><path d="M0 0L8 8ZM8 0L0 8Z" stroke="#1c1917" strokeWidth="2" /></pattern>
            <pattern id="dots" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="2" fill="#1c1917" /></pattern>
            <pattern id="weave" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M0 5L5 0L10 5L5 10Z" fill="#1c1917" /></pattern>
            <pattern id="vertical" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="2" height="4" fill="#1c1917" /></pattern>
        </defs>
      </svg>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
            { label: 'Total Items', value: items.length },
            { label: 'Avg Word Count', value: Math.round(items.reduce((a,b)=>a+(b.wordcount||0),0)/items.length) || 0 },
            { label: 'Unique Authors', value: new Set(items.flatMap(i => i.authors.map(a => a.name))).size },
            { label: 'Sources', value: new Set(items.map(i => i.source)).size }
        ].map((stat, i) => (
            <div key={i} className="bg-paper p-4 border-2 border-ink shadow-[4px_4px_0px_0px_rgba(28,25,23,1)]">
                <div className="text-[10px] font-branding font-bold text-stone-500 uppercase tracking-widest border-b border-stone-300 pb-1 mb-2">{stat.label}</div>
                <div className="text-2xl md:text-3xl font-display font-bold text-ink">{stat.value}</div>
            </div>
        ))}
      </div>

      <div className="bg-paper p-4 md:p-6 border-2 border-ink shadow-[4px_4px_0px_0px_rgba(28,25,23,1)]">
        <div className="flex flex-col gap-4 mb-6 border-b border-stone-300 pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h3 className="font-branding font-bold text-lg text-ink uppercase tracking-widest">Fig 2. Volume Analysis</h3>
                <div className="flex border border-ink p-0.5 bg-sepia">
                    {(['day', 'week', 'month'] as const).map((tf) => (
                        <button key={tf} onClick={() => setTimeFrame(tf)} className={`px-3 py-1 text-[10px] font-branding font-bold uppercase transition-all ${timeFrame === tf ? 'bg-ink text-paper' : 'text-stone-600 hover:text-ink'}`}>{tf}</button>
                    ))}
                </div>
            </div>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-sepia/30 p-3 border border-stone-300 border-dashed">
                <button onClick={() => setIsCompareMode(!isCompareMode)} className={`flex items-center gap-2 px-3 py-1 border border-ink text-[10px] font-bold font-branding uppercase transition-colors ${isCompareMode ? 'bg-ink text-paper' : 'text-ink hover:bg-stone-200'}`}><GitCompare size={12} /> {isCompareMode ? 'Disable Comparison' : 'Compare Data'}</button>
                {isCompareMode && (
                    <div className="flex flex-wrap items-center gap-3 animate-in fade-in duration-300">
                        <select value={compareDimension} onChange={(e) => setCompareDimension(e.target.value as any)} className="text-[10px] font-mono bg-paper border border-stone-400 py-1 px-2 focus:border-accent outline-none"><option value="publication">By Publication</option><option value="category">By Topic</option></select>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold uppercase text-stone-500">A:</span>
                            <select value={compareValA} onChange={(e) => setCompareValA(e.target.value)} className="text-[10px] font-serif bg-paper border-b border-ink py-1 px-2 focus:border-accent outline-none min-w-[120px]">{dimensionOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>
                        </div>
                        <div className="flex items-center gap-2">
                             <span className="text-[9px] font-bold uppercase text-stone-500">B:</span>
                            <select value={compareValB} onChange={(e) => setCompareValB(e.target.value)} className="text-[10px] font-serif bg-paper border-b border-stone-400 border-dashed py-1 px-2 focus:border-accent outline-none min-w-[120px]">{dimensionOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>
                        </div>
                    </div>
                )}
            </div>
        </div>
        <div className="h-64 md:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
            {isCompareMode ? (
                <LineChart data={timelineData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d6d3d1" /><XAxis dataKey="date" tickFormatter={(str) => formatDateLabel(str)} minTickGap={30} tick={{fontSize: 10, fill: '#57534e'}} stroke="#a8a29e" /><YAxis tick={{fontSize: 10, fill: '#57534e'}} /><Tooltip contentStyle={{ backgroundColor: '#f4f1ea', borderColor: '#1c1917', borderRadius: '0', fontSize: '10px' }} /><Legend wrapperStyle={{fontSize: '9px', textTransform: 'uppercase'}} /><Line type="monotone" dataKey="countA" name={compareValA} stroke="#1c1917" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="countB" name={compareValB} stroke="#57534e" strokeWidth={2} strokeDasharray="5 5" dot={false} /></LineChart>
            ) : (
                <AreaChart data={timelineData}><defs><linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1c1917" stopOpacity={0.2}/><stop offset="95%" stopColor="#1c1917" stopOpacity={0}/></linearGradient></defs><XAxis dataKey="date" tickFormatter={(str) => formatDateLabel(str)} minTickGap={30} tick={{fontSize: 10, fill: '#57534e'}} stroke="#a8a29e" /><YAxis tick={{fontSize: 10, fill: '#57534e'}} /><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d6d3d1" /><Tooltip contentStyle={{ backgroundColor: '#f4f1ea', borderColor: '#1c1917', borderRadius: '0', fontSize: '10px' }} /><Area type="monotone" dataKey="count" stroke="#1c1917" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" /></AreaChart>
            )}
            </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-paper p-6 border-2 border-ink h-[25rem] md:h-[30rem] flex flex-col shadow-[4px_4px_0px_0px_rgba(28,25,23,1)]">
          <h3 className="font-branding font-bold text-sm md:text-lg text-ink mb-2 border-b border-stone-300 pb-2 uppercase tracking-widest">Fig 3. Leading Publications</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={publicationData} layout="vertical" margin={{ left: 10, right: 30 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#d6d3d1" /><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={100} tick={{fontSize: 9, fill: '#1c1917', fontWeight: 'bold'}} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ backgroundColor: '#f4f1ea', borderRadius: '0', fontSize: '10px' }} /><Bar dataKey="value" fill="#1c1917" barSize={15} /></BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-paper p-4 md:p-6 border-2 border-ink h-auto min-h-[30rem] flex flex-col shadow-[4px_4px_0px_0px_rgba(28,25,23,1)]">
          <h3 className="font-branding font-bold text-sm md:text-lg text-ink mb-4 border-b border-stone-300 pb-2 uppercase tracking-widest text-center">Fig 4. Topic Distribution</h3>
          
          <div className="mb-4 p-3 bg-sepia/40 border border-stone-300 text-[11px] md:text-sm font-serif leading-relaxed text-justify">
            <p className="first-letter:font-branding first-letter:text-2xl first-letter:font-bold first-letter:float-left first-letter:mr-2">
                {selectedTopic ? `Analysis of ${selectedTopic.name}: This subject accounts for ${selectedTopic.value} entries in the current ledger.` : `The treemap below illustrates the relative prevalence of legal topics.`}
            </p>
            {selectedTopic && (
                <div className="mt-2 flex gap-2">
                    <button onClick={() => setSelectedTopic(null)} className="text-[9px] uppercase font-bold text-stone-500 flex items-center gap-1 hover:text-ink"><RefreshCw size={10} /> Reset</button>
                    {onCategorySelect && (
                        <button onClick={() => onCategorySelect(selectedTopic.name)} className="text-[9px] uppercase font-bold text-accent flex items-center gap-1 hover:text-ink hover:underline"><ArrowRight size={10} /> Read {selectedTopic.name} Section</button>
                    )}
                </div>
            )}
          </div>

          <div className="flex-1 h-[250px] md:h-auto min-h-[250px] border border-ink p-1 bg-white/30">
             <ResponsiveContainer width="100%" height="100%">
                <Treemap
                    data={categoryData}
                    dataKey="value"
                    aspectRatio={1.5}
                    stroke="#fff"
                    fill="#1c1917"
                    content={<CustomTreemapItem onSelect={setSelectedTopic} />}
                >
                    <Tooltip contentStyle={{ backgroundColor: '#f4f1ea', borderRadius: '0', fontSize: '10px' }} />
                </Treemap>
             </ResponsiveContainer>
          </div>
          <div className="text-center mt-3 text-[9px] font-mono text-stone-400 uppercase tracking-widest">
             {selectedTopic ? `Reviewing: ${selectedTopic.name}` : 'Select topic to focus analysis'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsDashboard;