import React, { useState, useEffect } from 'react';
import { X, CheckSquare, Square, Download } from 'lucide-react';
import { AVAILABLE_COLUMNS } from '../utils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (selectedColumnIds: string[]) => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onExport }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Initialize with all columns selected when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelected(new Set(AVAILABLE_COLUMNS.map(c => c.id)));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleColumn = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  const toggleAll = () => {
    if (selected.size === AVAILABLE_COLUMNS.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(AVAILABLE_COLUMNS.map(c => c.id)));
    }
  };

  const handleExport = () => {
    onExport(Array.from(selected));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-paper border-4 border-double border-ink shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-ink bg-sepia">
          <h3 className="text-xl font-display font-bold text-ink">Export Configuration</h3>
          <button 
            onClick={onClose}
            className="text-stone-500 hover:text-ink transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-branding font-bold text-stone-500 uppercase">Select Data Points</span>
            <button 
              onClick={toggleAll}
              className="text-xs font-branding font-bold text-accent hover:text-ink uppercase"
            >
              {selected.size === AVAILABLE_COLUMNS.length ? 'Clear All' : 'Select All'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AVAILABLE_COLUMNS.map(col => {
              const isChecked = selected.has(col.id);
              return (
                <div 
                  key={col.id}
                  onClick={() => toggleColumn(col.id)}
                  className={`
                    flex items-center gap-3 p-3 border cursor-pointer transition-all
                    ${isChecked 
                      ? 'bg-sepia border-ink text-ink' 
                      : 'bg-paper border-stone-300 text-stone-500 hover:border-stone-500'
                    }
                  `}
                >
                  <div className={`${isChecked ? 'text-ink' : 'text-stone-400'}`}>
                    {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
                  </div>
                  <span className="text-sm font-serif font-bold">{col.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-6 border-t border-ink bg-sepia flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-stone-600 font-branding font-bold text-xs uppercase hover:text-ink transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={selected.size === 0}
            className="flex items-center gap-2 px-6 py-2 bg-ink hover:bg-stone-800 text-paper font-branding font-bold text-xs uppercase border border-transparent hover:border-ink transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={14} />
            Generate CSV
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;