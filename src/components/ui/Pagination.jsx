import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  itemsPerPage,
  pageSize,
  onPageChange,
  className = '',
}) {
  const perPage = Number(itemsPerPage ?? pageSize ?? 6) || 6;
  const resolvedTotalPages = Math.max(1, Number(totalPages) || Math.ceil(totalItems / perPage) || 1);
  const resolvedTotalItems = Number(totalItems) || 0;
  const safeCurrentPage = Math.min(Math.max(1, Number(currentPage) || 1), resolvedTotalPages);

  if (resolvedTotalItems === 0 && resolvedTotalPages <= 1) {
    return null;
  }

  const startItem = resolvedTotalItems === 0 ? 0 : (safeCurrentPage - 1) * perPage + 1;
  const endItem = Math.min(safeCurrentPage * perPage, resolvedTotalItems);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (resolvedTotalPages <= maxVisible) {
      for (let i = 1; i <= resolvedTotalPages; i++) {
        pages.push(i);
      }
    } else {
      if (safeCurrentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', resolvedTotalPages);
      } else if (safeCurrentPage >= resolvedTotalPages - 2) {
        pages.push(1, '...', resolvedTotalPages - 3, resolvedTotalPages - 2, resolvedTotalPages - 1, resolvedTotalPages);
      } else {
        pages.push(1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', resolvedTotalPages);
      }
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-1 border-t border-[#E5EDE8] text-xs ${className}`}>
      {/* Items Count Summary */}
      {resolvedTotalItems > 0 ? (
        <div className="text-[#566861] font-medium">
          Showing <span className="font-bold text-[#0B3326]">{startItem}</span> to{' '}
          <span className="font-bold text-[#0B3326]">{endItem}</span> of{' '}
          <span className="font-bold text-[#0B3326]">{resolvedTotalItems}</span> results
        </div>
      ) : (
        <div className="text-[#566861] font-medium">
          Page <span className="font-bold text-[#0B3326]">{safeCurrentPage}</span> of{' '}
          <span className="font-bold text-[#0B3326]">{resolvedTotalPages}</span>
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex items-center gap-1.5">
        {/* Previous Button */}
        <button
          onClick={() => onPageChange?.(Math.max(1, safeCurrentPage - 1))}
          disabled={safeCurrentPage === 1}
          className={`p-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
            safeCurrentPage === 1
              ? 'border-[#E5EDE8] bg-[#F8FAF8] text-gray-300 cursor-not-allowed'
              : 'border-[#E5EDE8] bg-white text-[#566861] hover:bg-[#F2FBF6] hover:text-[#0B3326] hover:border-[#10B981]'
          }`}
          title="Previous Page"
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page Number Buttons */}
        <div className="flex items-center gap-1">
          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 py-1 text-gray-400 font-bold select-none"
                >
                  &hellip;
                </span>
              );
            }

            const isActive = p === safeCurrentPage;
            return (
              <button
                key={`page-${p}`}
                onClick={() => onPageChange?.(p)}
                className={`min-w-[34px] h-[34px] px-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center cursor-pointer ${
                  isActive
                    ? 'bg-[#0B3326] text-white shadow-xs'
                    : 'bg-white text-[#566861] border border-[#E5EDE8] hover:bg-[#F2FBF6] hover:text-[#0B3326] hover:border-[#10B981]'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          onClick={() => onPageChange?.(Math.min(resolvedTotalPages, safeCurrentPage + 1))}
          disabled={safeCurrentPage >= resolvedTotalPages}
          className={`p-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
            safeCurrentPage >= resolvedTotalPages
              ? 'border-[#E5EDE8] bg-[#F8FAF8] text-gray-300 cursor-not-allowed'
              : 'border-[#E5EDE8] bg-white text-[#566861] hover:bg-[#F2FBF6] hover:text-[#0B3326] hover:border-[#10B981]'
          }`}
          title="Next Page"
          aria-label="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
