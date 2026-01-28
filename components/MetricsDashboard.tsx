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
import { RefreshCw, GitCompare, ScrollText } from 'lucide-react';

interface MetricsDashboardProps {
  items: FeedItem[];
}

// --- Types & Helpers ---
type TimeFrame = 'day' | 'week' | 'month';
type CompareDimension = 'publication' | 'category';

const PATTERNS = ['hatch', 'crosshatch', 'dots', 'weave', 'vertical'];

// --- Components ---

// 1. Vintage Treemap Cell (The "Square Histogram")
const CustomTreemapItem = (props: any) => {
  const { root, depth, x, y, width, height, index, payload, name, value, onSelect } = props;
  
  // Assign a pattern based on index to ensure deterministic rendering
  const patternId = PATTERNS[index % PATTERNS.length];

  return (
    <g>
      {/* Shadow/Bleed Effect */}
      <rect
        x={x + 2}
        y={y + 2}
        width={width}
        height={height}
        fill="#e6e2d3"
        stroke="none"
        opacity={0.5}
      />
      {/* Main Block */}
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
      {/* Label - Only show if box is big enough */}
      {width > 50 && height > 30 && (
        <foreignObject x={x} y={y} width={width} height={height} style={{pointerEvents: 'none'}}>
            <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center overflow-hidden">
                <span className="text-paper bg-ink/90 px-1 text-[10px] font-branding font-bold uppercase tracking-wider truncate max-w-full">
                    {name}
                </span>
                {height > 50 && (
                     <span className="text-paper/90 bg-ink/70 px-1 text-[9px] font-mono font-bold mt-0.5">
                        {(value / root.value * 100).toFixed(0)}%
                    </span>
                )}
            </div>
        </foreignObject>
      )}
    </g>
  );
};

const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ items }) => {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('week');
  
  // Comparison State
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareDimension, setCompareDimension] = useState<CompareDimension>('publication');
  const [compareValA, setCompareValA] = useState<string>('');
  const [compareValB, setCompareValB] = useState<string>('');

  // Treemap Selection State
  const [selectedTopic, setSelectedTopic] = useState<any | null>(null);

  // --- Data Preparation ---

  // 1. Comparison Options
  const dimensionOptions = useMemo(() => {
    const options = new Set<string>();
    items.forEach(item => {
        if (compareDimension === 'publication') {
            options.add(item.publication);
        } else {
            // categories
            if (item.primaryCategory?.name) options.add(item.primaryCategory.name);
            item.categories.forEach(c => options.add(c.name));
        }
    });
    return Array.from(options).sort();
  }, [items, compareDimension]);

  // Initialize comparison values if empty
  useMemo(() => {
      if (!compareValA && dimensionOptions.length > 0) setCompareValA(dimensionOptions[0]);
      if (!compareValB && dimensionOptions.length > 1) setCompareValB(dimensionOptions[1]);
  }, [dimensionOptions]);


  // 2. Timeline Data (Switchable between Single vs Dual)
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
             const day = d.getUTCDay();
             d.setUTCDate(d.getUTCDate() - day);
             key = d.toISOString().split('T')[0];
        }

        if (!dataMap.has(key)) {
            dataMap.set(key, { date: key, count: 0, countA: 0, countB: 0 });
        }
        
        const entry = dataMap.get(key)!;
        entry.count += 1;

        if (isCompareMode) {
            let matchesA = false;
            let matchesB = false;
            
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


  // 3. Leading Publications (Fig 3)
  const publicationData = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach(item => {
      counts[item.publication] = (counts[item.publication] || 0) + 1;
    });
    // Reduced slice from 10 to 8 to prevent overflow
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [items]);

  // 4. Topic Distribution (Fig 4 - Treemap)
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    let total = 0;
    items.forEach(item => {
      if (item.categories && item.categories.length > 0) {
        item.categories.forEach(cat => {
            if (cat.name) {
                counts[cat.name] = (counts[cat.name] || 0) + 1;
                total++;
            }
        });
      } else {
         const catName = item.primaryCategory?.name || 'Uncategorized';
         counts[catName] = (counts[catName] || 0) + 1;
         total++;
      }
    });
    
    // Convert to Treemap format (name, value)
    const data = Object.entries(counts)
      .map(([name, value]) => ({ name, value, total }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12); // Top 12 blocks

    return data;
  }, [items]);

  // --- Helpers ---

  const formatDateLabel = (dateStr: string, isTooltip = false) => {
    const parseStr = dateStr.length === 7 ? `${dateStr}-01` : dateStr;
    const date = new Date(parseStr);
    if (timeFrame === 'month') {
        const opts: Intl.DateTimeFormatOptions = isTooltip 
            ? { month: 'long', year: 'numeric', timeZone: 'UTC' }
            : { month: 'short', year: '2-digit', timeZone: 'UTC' };
        return date.toLocaleDateString('en-US', opts);
    } 
    if (timeFrame === 'week') {
        if (isTooltip) {
            return `Week of ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`;
        }
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    }
    const opts: Intl.DateTimeFormatOptions = isTooltip
        ? { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }
        : { month: 'short', day: 'numeric', timeZone: 'UTC' };
    return date.toLocaleDateString('en-US', opts);
  };

  const generateNarrative = () => {
    if (!items.length) return "No data available for analysis.";
    
    if (selectedTopic) {
        const pct = ((selectedTopic.value / items.length) * 100).toFixed(1); // Rough approx using items length vs block value
        return `Regarding the subject of ${selectedTopic.name}: This topic has garnered significant attention, represented by ${selectedTopic.value} distinct entries in the ledger. It accounts for a notable portion of the current news cycle, reflecting ongoing legal discourse in this area.`;
    }

    const top = categoryData[0];
    if (!top) return "Data is insufficient to form a summary.";
    
    return `In a survey of the current legal landscape, '${top.name}' emerges as the predominant theme, commanding the largest share of coverage with ${top.value} recorded items. Following this, the remaining distribution is fragmented among various other legal disciplines, suggesting a diverse range of active proceedings.`;
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      
      {/* SVG Patterns for Treemap */}
      <svg style={{ height: 0, width: 0, position: 'absolute' }}>
        <defs>
            <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="4" height="8" transform="translate(0,0)" fill="#1c1917" opacity="0.9" />
            </pattern>
            <pattern id="crosshatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="8" height="8" fill="#f4f1ea" />
                <path d="M0 0L8 8ZM8 0L0 8Z" stroke="#1c1917" strokeWidth="2" />
            </pattern>
            <pattern id="dots" width="6" height="6" patternUnits="userSpaceOnUse">
                <circle cx="3" cy="3" r="2" fill="#1c1917" />
            </pattern>
            <pattern id="weave" width="10" height="10" patternUnits="userSpaceOnUse">
                 <path d="M0 5L5 0L10 5L5 10Z" fill="#1c1917" />
            </pattern>
            <pattern id="vertical" width="4" height="4" patternUnits="userSpaceOnUse">
                 <rect width="2" height="4" fill="#1c1917" />
            </pattern>
        </defs>
      </svg>

      {/* KPI Cards (Unchanged) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
            { label: 'Total Items', value: items.length },
            { label: 'Avg Word Count', value: Math.round(items.reduce((a,b)=>a+(b.wordcount||0),0)/items.length) || 0 },
            { label: 'Unique Authors', value: new Set(items.flatMap(i => i.authors.map(a => a.name))).size },
            { label: 'Sources', value: new Set(items.map(i => i.source)).size }
        ].map((stat, i) => (
            <div key={i} className="bg-paper p-4 border-2 border-ink shadow-[4px_4px_0px_0px_rgba(28,25,23,1)]">
                <div className="text-[10px] font-branding font-bold text-stone-500 uppercase tracking-widest border-b border-stone-300 pb-1 mb-2">{stat.label}</div>
                <div className="text-3xl font-display font-bold text-ink">{stat.value}</div>
            </div>
        ))}
      </div>

      {/* Figure 2: Volume Analysis with Comparison */}
      <div className="bg-paper p-6 border-2 border-ink">
        <div className="flex flex-col gap-6 mb-6 border-b border-stone-300 pb-4">
            <div className="flex items-center justify-between">
                <h3 className="font-branding font-bold text-lg text-ink uppercase tracking-widest">Fig 2. Volume Analysis</h3>
                <div className="flex border border-ink p-0.5 bg-sepia">
                    {(['day', 'week', 'month'] as const).map((tf) => (
                        <button
                            key={tf}
                            onClick={() => setTimeFrame(tf)}
                            className={`px-4 py-1 text-xs font-branding font-bold uppercase transition-all ${
                                timeFrame === tf 
                                    ? 'bg-ink text-paper' 
                                    : 'text-stone-600 hover:text-ink'
                            }`}
                        >
                            {tf}
                        </button>
                    ))}
                </div>
            </div>

            {/* Comparison Controls */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-sepia/30 p-4 border border-stone-300 border-dashed">
                <button 
                    onClick={() => setIsCompareMode(!isCompareMode)}
                    className={`flex items-center gap-2 px-3 py-1.5 border border-ink text-xs font-bold font-branding uppercase transition-colors ${isCompareMode ? 'bg-ink text-paper' : 'text-ink hover:bg-stone-200'}`}
                >
                    <GitCompare size={14} />
                    {isCompareMode ? 'Disable Comparison' : 'Compare Data'}
                </button>

                {isCompareMode && (
                    <div className="flex flex-wrap items-center gap-3 animate-in fade-in duration-300">
                        <select 
                            value={compareDimension} 
                            onChange={(e) => setCompareDimension(e.target.value as CompareDimension)}
                            className="text-xs font-mono bg-paper border border-stone-400 py-1 px-2 focus:border-accent outline-none"
                        >
                            <option value="publication">By Publication</option>
                            <option value="category">By Topic</option>
                        </select>

                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase text-stone-500">A:</span>
                            <select 
                                value={compareValA} 
                                onChange={(e) => setCompareValA(e.target.value)}
                                className="text-xs font-serif bg-paper border-b-2 border-ink py-1 px-2 focus:border-accent outline-none min-w-[150px]"
                            >
                                {dimensionOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>

                        <span className="text-xs font-serif italic text-stone-400">vs.</span>

                        <div className="flex items-center gap-2">
                             <span className="text-[10px] font-bold uppercase text-stone-500">B:</span>
                            <select 
                                value={compareValB} 
                                onChange={(e) => setCompareValB(e.target.value)}
                                className="text-xs font-serif bg-paper border-b-2 border-stone-400 border-dashed py-1 px-2 focus:border-accent outline-none min-w-[150px]"
                            >
                                {dimensionOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                    </div>
                )}
            </div>
        </div>

        <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
            {isCompareMode ? (
                <LineChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d6d3d1" />
                    <XAxis 
                        dataKey="date" 
                        tickFormatter={(str) => formatDateLabel(str)}
                        minTickGap={30}
                        tick={{fontSize: 12, fill: '#57534e', fontFamily: 'Merriweather'}}
                        axisLine={true}
                        tickLine={true}
                        stroke="#a8a29e"
                    />
                    <YAxis tick={{fontSize: 12, fill: '#57534e', fontFamily: 'Merriweather'}} axisLine={false} tickLine={false} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#f4f1ea', borderColor: '#1c1917', borderRadius: '0', fontFamily: 'Merriweather' }}
                        labelFormatter={(label) => formatDateLabel(label, true)}
                    />
                    <Legend wrapperStyle={{fontFamily: 'Cinzel', fontSize: '10px'}} />
                    <Line type="monotone" dataKey="countA" name={compareValA} stroke="#1c1917" strokeWidth={3} dot={false} activeDot={{r: 6}} />
                    <Line type="monotone" dataKey="countB" name={compareValB} stroke="#57534e" strokeWidth={3} strokeDasharray="5 5" dot={false} activeDot={{r: 6}} />
                </LineChart>
            ) : (
                <AreaChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1c1917" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#1c1917" stopOpacity={0}/>
                    </linearGradient>
                    </defs>
                    <XAxis 
                        dataKey="date" 
                        tickFormatter={(str) => formatDateLabel(str)}
                        minTickGap={30}
                        tick={{fontSize: 12, fill: '#57534e', fontFamily: 'Merriweather'}}
                        axisLine={true}
                        tickLine={true}
                        stroke="#a8a29e"
                    />
                    <YAxis tick={{fontSize: 12, fill: '#57534e', fontFamily: 'Merriweather'}} axisLine={false} tickLine={false} />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d6d3d1" />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#f4f1ea', borderColor: '#1c1917', borderRadius: '0', fontFamily: 'Merriweather' }}
                        labelFormatter={(label) => formatDateLabel(label, true)}
                    />
                    <Area type="monotone" dataKey="count" stroke="#1c1917" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
            )}
            </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Figure 3: Top Publications (Fixed Layout) */}
        <div className="bg-paper p-6 border-2 border-ink h-[30rem] flex flex-col">
          <h3 className="font-branding font-bold text-lg text-ink mb-2 border-b border-stone-300 pb-2 uppercase tracking-widest">Fig 3. Leading Publications</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={publicationData} layout="vertical" margin={{ top: 20, right: 30, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#d6d3d1" />
                <XAxis type="number" hide />
                <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={140} 
                    tick={{fontSize: 11, fill: '#1c1917', fontFamily: 'Merriweather', fontWeight: 'bold'}} 
                    axisLine={false} 
                    tickLine={false} 
                    interval={0}
                />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#f4f1ea', borderColor: '#1c1917', borderRadius: '0', fontFamily: 'Merriweather' }}
                    cursor={{fill: '#e6e2d3'}} 
                />
                <Bar dataKey="value" fill="#1c1917" barSize={20} radius={[0, 4, 4, 0]} />
                </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Figure 4: Topic Distribution (Square Histogram / Treemap) */}
        <div className="bg-paper p-6 border-2 border-ink h-[30rem] flex flex-col relative">
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-ink"></div>
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-ink"></div>
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-ink"></div>
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-ink"></div>

          <h3 className="font-branding font-bold text-lg text-ink mb-4 border-b border-stone-300 pb-2 uppercase tracking-widest text-center">Fig 4. Topic Distribution</h3>
          
          {/* Narrative Summary */}
          <div className="mb-4 p-4 bg-sepia/40 border border-stone-300 text-sm font-serif leading-relaxed text-justify relative">
            <ScrollText size={16} className="absolute -top-2 -left-2 text-ink bg-paper p-0.5 border border-stone-300" />
            <p className="first-letter:font-branding first-letter:text-3xl first-letter:font-bold first-letter:float-left first-letter:mr-2 first-letter:leading-none">
                {generateNarrative()}
            </p>
            {selectedTopic && (
                <button 
                    onClick={() => setSelectedTopic(null)} 
                    className="mt-2 text-[10px] uppercase font-bold text-accent hover:underline flex items-center gap-1"
                >
                    <RefreshCw size={10} /> Reset View
                </button>
            )}
          </div>

          <div className="flex-1 min-h-0 border-2 border-ink p-1 bg-paper shadow-inner">
             <ResponsiveContainer width="100%" height="100%">
                <Treemap
                    data={categoryData}
                    dataKey="value"
                    aspectRatio={1}
                    stroke="#fff"
                    fill="#1c1917"
                    content={<CustomTreemapItem onSelect={setSelectedTopic} />}
                >
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#f4f1ea', borderColor: '#1c1917', borderRadius: '0', fontFamily: 'Merriweather' }}
                        formatter={(value: number, name: string) => [`${value} Articles`, name]}
                    />
                </Treemap>
             </ResponsiveContainer>
          </div>
          <div className="text-center mt-2 text-[10px] font-mono text-stone-500 uppercase">
             {selectedTopic ? `Selected: ${selectedTopic.name}` : 'Select a block for details'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsDashboard;