import React, { useRef, useState } from 'react';
import { Upload, FileJson, AlertCircle, Plus } from 'lucide-react';
import { FeedData } from '../types';

interface ProcessedFile {
  data: FeedData;
  filename: string;
}

interface FileUploadProps {
  onDataLoaded: (files: ProcessedFile[]) => void;
  isCompact?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded, isCompact = false }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsProcessing(true);
    setError(null);

    const promises: Promise<ProcessedFile>[] = [];

    Array.from(files).forEach((file: File) => {
      const promise = new Promise<ProcessedFile>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const text = event.target?.result as string;
            const jsonStartIndex = text.indexOf('{');
            const cleanText = jsonStartIndex > -1 ? text.substring(jsonStartIndex) : text;
            
            const json = JSON.parse(cleanText) as FeedData;
            
            if (!json.items || !Array.isArray(json.items)) {
              reject(new Error(`Invalid Manifest in ${file.name}: Missing 'items'.`));
            } else {
              resolve({ data: json, filename: file.name });
            }
          } catch (err) {
            reject(new Error(`Failed to read ledger ${file.name}`));
          }
        };
        reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
        reader.readAsText(file);
      });
      promises.push(promise);
    });

    try {
      const results = await Promise.all(promises);
      onDataLoaded(results);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while processing ledgers.");
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (isCompact) {
    return (
      <>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json,application/json,.txt"
          className="hidden"
          multiple
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="flex items-center gap-2 px-3 py-1 bg-paper hover:bg-sepia text-ink border border-ink rounded-none text-xs font-bold font-branding uppercase tracking-wide transition-colors"
          title="Add another source"
        >
          {isProcessing ? (
             <span className="w-3 h-3 border-2 border-ink border-t-transparent rounded-full animate-spin"></span>
          ) : (
            <Plus size={14} />
          )}
          Append Wire
        </button>
      </>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto mt-20 p-8 bg-paper border-4 border-double border-ink text-center shadow-lg">
      <div className="w-16 h-16 border-2 border-ink text-ink rounded-full flex items-center justify-center mx-auto mb-6 bg-sepia">
        <Upload size={32} />
      </div>
      
      <h2 className="text-3xl font-display font-bold text-ink mb-2">Submit Wire for Publication</h2>
      <p className="text-stone-600 mb-8 font-serif italic">
        Deposit your JSON manifests here to organize, review, and analyze the latest legal proceedings.
      </p>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json,application/json,.txt"
        className="hidden"
        multiple
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isProcessing}
        className="px-8 py-3 bg-ink text-paper font-branding font-bold uppercase tracking-widest border border-transparent hover:bg-white hover:text-ink hover:border-ink transition-colors flex items-center gap-2 mx-auto disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <span className="w-5 h-5 border-2 border-paper border-t-transparent rounded-full animate-spin"></span>
        ) : (
          <FileJson size={20} />
        )}
        {isProcessing ? 'Processing...' : 'Select Files'}
      </button>

      {error && (
        <div className="mt-6 p-4 border border-accent/30 bg-accent/5 text-accent font-serif italic flex items-center gap-2 justify-center text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}
      
      <div className="mt-8 text-xs font-mono text-stone-500 uppercase">
        Accepts: JSON formatted wires. Multi-select enabled.
      </div>
    </div>
  );
};

export default FileUpload;