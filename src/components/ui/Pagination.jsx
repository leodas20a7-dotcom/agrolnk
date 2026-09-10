import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  itemsPerPage = 6,
  onPageChange,
  className = '',
}) {
  if (totalPages <= 1 && totalItems <= itemsPerPage) {
    return null;
  }

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-1 border-t border-[#E5EDE8] text-xs ${className}`}>
      {/* Items Count Summary */}
      <div className="text-[#566861] font-medium">
        Showing <span className="font-bold text-[#0B3326]">{startItem}</span> to{' '}
        <span className="font-bold text-[#0B3326]">{endItem}</span> of{' '}
        <span className="font-bold text-[#0B3326]">{totalItems}</span> results
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center gap-1.5">
        {/* Previous Button */}
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className={`p-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
            currentPage === 1
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

            const isActive = p === currentPage;
            return (
              <button
                key={`page-${p}`}
                onClick={() => onPageChange(p)}
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
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className={`p-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
            currentPage >= totalPages
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
