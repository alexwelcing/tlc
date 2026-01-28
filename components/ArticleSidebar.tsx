import React, { useEffect } from 'react';
import { X, Calendar, User, Clock, Loader2 } from 'lucide-react';
import { FeedItem } from '../types';
import { useEditorialAI } from '../hooks/useEditorialAI';
import { formatDate } from '../utils';

interface ArticleSidebarProps {
  article: FeedItem | null;
  onClose: () => void;
  onCategoryClick?: (category: string) => void;
}

const ArticleSidebar: React.FC<ArticleSidebarProps> = ({ article, onClose, onCategoryClick }) => {
  const { assets, generateEditorialIllustration } = useEditorialAI();
  
  // Trigger generation when article opens
  useEffect(() => {
    if (article) {
       // Determine era style
       let era = "Modern";
       const p = article.publication.toLowerCase();
       if (p.includes('18') || p.includes('intelligencer')) era = "1890s Victorian Engraving";
       else if (p.includes('daily') || p.includes('review')) era = "1950s Mid-Century Offset Print";
       else if (p.includes('texas') || p.includes('american')) era = "1980s Retro Color Newsprint";

       generateEditorialIllustration(article, era);
    }
  }, [article]);

  if (!article) return null;

  const asset = assets[article.id];
  const isLoading = asset?.status === 'grounding' || asset?.status === 'imagining';

  const handleCategoryClick = (categoryName: string) => {
    if (onCategoryClick) {
        onCategoryClick(categoryName);
        onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div className="relative w-full max-w-xl bg-paper h-full shadow-2xl border-l-4 border-ink flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-6 border-b-2 border-ink flex justify-between items-start bg-sepia">
            <div>
                <h3 className="text-xs font-branding font-bold uppercase tracking-widest text-stone-500 mb-1">
                    {article.publication}
                </h3>
                <h2 className="text-2xl font-display font-bold text-ink leading-tight">
                    {article.title}
                </h2>
            </div>
            <button 
                onClick={onClose}
                className="p-2 hover:bg-ink hover:text-paper transition-colors rounded-full"
            >
                <X size={20} />
            </button>
        </div>

        {/* Content Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Metadata Bar */}
            <div className="flex flex-wrap gap-4 text-xs font-mono text-stone-500 border-b border-stone-300 pb-4">
                <span className="flex items-center gap-1.5">
                    <Calendar size={12} /> {formatDate(article.publishedAt)}
                </span>
                <span className="flex items-center gap-1.5">
                    <Clock size={12} /> {article.readtime} min read
                </span>
                <span className="flex items-center gap-1.5">
                    <User size={12} /> {article.authors.map(a => a.name).join(', ') || 'Staff'}
                </span>
            </div>

            {/* Generated Image Container */}
            <div className="w-full min-h-[300px] bg-stone-200 border-2 border-ink relative overflow-hidden flex items-center justify-center">
                 {asset?.imageUrl ? (
                     <img 
                        src={asset.imageUrl} 
                        alt="AI Generated Editorial" 
                        className="w-full h-full object-cover animate-in fade-in duration-700 img-style-modern"
                     />
                 ) : (
                     <div className="flex flex-col items-center gap-3 text-stone-400">
                         {isLoading ? (
                            <>
                                <Loader2 size={32} className="animate-spin text-ink" />
                                <span className="text-xs font-branding uppercase tracking-widest animate-pulse">
                                    {asset?.status === 'grounding' ? 'Researching Visuals...' : 'Inking Plates...'}
                                </span>
                            </>
                         ) : (
                            <span className="text-xs font-mono">Image Pending...</span>
                         )}
                     </div>
                 )}
            </div>

            {/* Neat Text Layout */}
            <div className="prose prose-stone prose-sm font-serif text-justify leading-relaxed max-w-none">
                <p className="first-letter:text-4xl first-letter:font-display first-letter:float-left first-letter:mr-2 first-letter:text-ink first-letter:font-bold">
                    {article.summary}
                </p>
                {/* Fallback for body since we usually only have summary in feeds */}
                <p>
                    [Full text of the article would be displayed here. The summary provided above captures the essential legal developments reported in this filing.]
                </p>
                
                {article.categories.length > 0 && (
                    <div className="mt-8 pt-4 border-t border-ink/10">
                        <h4 className="text-xs font-bold uppercase mb-2">Filed Under:</h4>
                        <div className="flex flex-wrap gap-2">
                            {article.categories.map(c => (
                                <button 
                                    key={c.slug} 
                                    onClick={() => handleCategoryClick(c.name)}
                                    className="px-2 py-1 bg-sepia text-ink text-[10px] font-mono border border-stone-300 hover:bg-ink hover:text-paper hover:border-ink transition-colors cursor-pointer"
                                    title={`Go to Department of ${c.name}`}
                                >
                                    {c.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
        
        {/* Footer Actions */}
        <div className="p-4 border-t border-ink bg-paper flex justify-center">
            <a 
                href={article.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full text-center px-4 py-3 bg-ink text-paper font-branding font-bold uppercase tracking-widest hover:bg-accent transition-colors"
            >
                Read Original Source
            </a>
        </div>

      </div>
    </div>
  );
};

export default ArticleSidebar;