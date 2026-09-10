import React from 'react';
import { LayoutGrid, List } from 'lucide-react';

export default function ViewModeToggle({
  viewMode = 'grid',
  onViewModeChange,
  gridLabel = 'Grid',
  rowsLabel = 'Rows',
  className = '',
}) {
  const isRows = viewMode === 'rows' || viewMode === 'row' || viewMode === 'list';
  const isGrid = viewMode === 'grid' || !isRows;

  return (
    <div className={`flex items-center bg-[#F8FAF8] border border-[#E5EDE8] p-1 rounded-xl shrink-0 ${className}`}>
      <button
        type="button"
        onClick={() => onViewModeChange('grid')}
        title="Card Box Grid View"
        className={`p-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
          isGrid
            ? 'bg-white text-[#0B3326] shadow-2xs font-bold border border-[#E5EDE8]'
            : 'text-[#566861] hover:text-[#0B3326]'
        }`}
      >
        <LayoutGrid className="w-3.5 h-3.5" />
        <span className="text-[11px] hidden sm:inline">{gridLabel}</span>
      </button>
      <button
        type="button"
        onClick={() => onViewModeChange('rows')}
        title="Row / List Records View"
        className={`p-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
          isRows
            ? 'bg-white text-[#0B3326] shadow-2xs font-bold border border-[#E5EDE8]'
            : 'text-[#566861] hover:text-[#0B3326]'
        }`}
      >
        <List className="w-3.5 h-3.5" />
        <span className="text-[11px] hidden sm:inline">{rowsLabel}</span>
      </button>
    </div>
  );
}

