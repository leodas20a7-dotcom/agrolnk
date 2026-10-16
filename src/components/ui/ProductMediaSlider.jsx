import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Maximize2,
  X,
  Volume2,
  VolumeX,
  Film,
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import Badge from './Badge';
import { isVideoUrl } from '../../utils/imageUpload';
import { COMMODITY_IMAGES } from '../../utils/listings';

/**
 * ProductMediaSlider
 * 
 * An interactive, touch-friendly, high-performance carousel/slider for viewing
 * up to 8 produce photos and harvest video clips after listing creation.
 * 
 * @param {Object} props
 * @param {string[]} [props.media=[]] - Array of image/video URLs
 * @param {string} [props.commodity=''] - Commodity name for fallback
 * @param {React.ReactNode} [props.overlayBadges] - Custom badges displayed at top-left
 * @param {React.ReactNode} [props.bottomOverlay] - Custom elements displayed at bottom
 * @param {string} [props.className='']
 * @param {string} [props.aspectClassName='h-72 sm:h-96']
 */
export default function ProductMediaSlider({
  media = [],
  commodity = '',
  overlayBadges,
  bottomOverlay,
  className = '',
  aspectClassName = 'h-72 sm:h-96',
}) {
  // Normalize media items: ensure at least one fallback item if empty
  const fallback = COMMODITY_IMAGES[commodity] || COMMODITY_IMAGES.Other || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80';
  const rawList = Array.isArray(media) && media.length > 0 ? media.filter(Boolean) : [fallback];
  const items = rawList.length > 0 ? rawList : [fallback];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Keep index in valid range if media length changes
  useEffect(() => {
    if (currentIndex >= items.length) {
      setCurrentIndex(0);
    }
  }, [items.length, currentIndex]);

  const activeUrl = items[currentIndex] || fallback;
  const isCurrentVideo = isVideoUrl(activeUrl);

  const handlePrev = (e) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
    setIsPlaying(false);
  };

  const handleNext = (e) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1));
    setIsPlaying(false);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'Escape') setIsLightboxOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items.length]);

  // Touch swipe support
  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 50) {
      handleNext();
    } else if (distance < -50) {
      handlePrev();
    }
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  const toggleVideoPlayback = (e) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      
      {/* Main Viewport Container */}
      <div
        className={`relative w-full ${aspectClassName} rounded-3xl overflow-hidden bg-black/90 border border-[#E5EDE8] shadow-xs select-none group`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Active Media Renderer */}
        {isCurrentVideo ? (
          <div
            className="w-full h-full relative flex items-center justify-center cursor-pointer bg-black"
            onClick={toggleVideoPlayback}
          >
            <video
              ref={videoRef}
              src={activeUrl}
              className="w-full h-full object-contain"
              playsInline
              loop
              muted={isMuted}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />

            {/* Centered Play Button when paused */}
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity">
                <div className="w-14 h-14 rounded-full bg-[#10B981] text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110">
                  <Play className="w-7 h-7 fill-white ml-1" />
                </div>
              </div>
            )}

            {/* Video Controls Overlay */}
            <div
              className="absolute bottom-16 right-4 flex items-center gap-2 z-20"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setIsMuted((prev) => !prev)}
                className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ) : (
          <img
            src={activeUrl}
            alt={`${commodity || 'Produce'} view ${currentIndex + 1}`}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = fallback;
            }}
            className="w-full h-full object-cover transition-all duration-300"
          />
        )}

        {/* Top Floating Badges */}
        {overlayBadges && (
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 flex-wrap">
            {overlayBadges}
          </div>
        )}

        {/* Top-Right Counter & Lightbox Button */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          {items.length > 1 && (
            <div className="px-2.5 py-1 rounded-full bg-black/60 text-white text-xs font-bold backdrop-blur-xs shadow-xs">
              {currentIndex + 1} / {items.length}
            </div>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsLightboxOpen(true);
            }}
            title="Expand Fullscreen"
            className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-all hover:scale-105 cursor-pointer shadow-xs"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Previous & Next Arrow Controls (Visible when media > 1) */}
        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              title="Previous Media"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-all hover:scale-110 cursor-pointer shadow-md opacity-80 group-hover:opacity-100"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              type="button"
              onClick={handleNext}
              title="Next Media"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-all hover:scale-110 cursor-pointer shadow-md opacity-80 group-hover:opacity-100"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Custom Bottom Overlay (e.g. Escrow Banner) */}
        {bottomOverlay && (
          <div className="absolute bottom-4 left-4 right-4 z-20">
            {bottomOverlay}
          </div>
        )}
      </div>

      {/* Horizontal Thumbnail Strip (If > 1 items) */}
      {items.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
          {items.map((url, idx) => {
            const isVid = isVideoUrl(url);
            const isSelected = idx === currentIndex;

            return (
              <button
                key={`${url}-${idx}`}
                type="button"
                onClick={() => {
                  setCurrentIndex(idx);
                  setIsPlaying(false);
                }}
                className={`relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer bg-[#0B3326]/5 ${
                  isSelected
                    ? 'border-[#10B981] ring-2 ring-[#10B981]/25 scale-105'
                    : 'border-[#E5EDE8] opacity-70 hover:opacity-100 hover:border-[#10B981]/50'
                }`}
              >
                {isVid ? (
                  <div className="w-full h-full bg-black flex items-center justify-center relative">
                    <video
                      src={url}
                      className="w-full h-full object-cover opacity-80"
                      preload="metadata"
                      muted
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center">
                        <Play className="w-2.5 h-2.5 fill-white ml-0.5" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <img
                    src={url}
                    alt={`Thumbnail ${idx + 1}`}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = fallback;
                    }}
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Badge for Video vs Photo */}
                <div className="absolute bottom-1 right-1">
                  {isVid ? (
                    <Film className="w-3 h-3 text-white drop-shadow-md" />
                  ) : idx === 0 ? (
                    <span className="text-[8px] font-bold px-1 py-0.2 rounded-xs bg-[#10B981] text-white">
                      Cover
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Lightbox Fullscreen Modal */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-in fade-in"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Lightbox Header */}
          <div className="flex items-center justify-between text-white pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm sm:text-base">
                {commodity} — Media {currentIndex + 1} of {items.length}
              </span>
              {isCurrentVideo && (
                <Badge variant="accent" size="sm">Video Clip</Badge>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Lightbox Main Stage */}
          <div
            className="flex-1 flex items-center justify-center relative p-2 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {isCurrentVideo ? (
              <video
                src={activeUrl}
                controls
                autoPlay
                className="max-h-[75vh] max-w-full rounded-2xl shadow-2xl"
              />
            ) : (
              <img
                src={activeUrl}
                alt="Full display"
                className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl"
              />
            )}

            {items.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center cursor-pointer shadow-lg transition-transform hover:scale-110"
                >
                  <ChevronLeft className="w-7 h-7" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center cursor-pointer shadow-lg transition-transform hover:scale-110"
                >
                  <ChevronRight className="w-7 h-7" />
                </button>
              </>
            )}
          </div>

          {/* Lightbox Thumbnails Strip */}
          {items.length > 1 && (
            <div
              className="flex items-center justify-center gap-2 py-3 border-t border-white/10 overflow-x-auto no-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              {items.map((url, idx) => (
                <button
                  key={`lb-${url}-${idx}`}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    idx === currentIndex
                      ? 'border-[#10B981] scale-110 ring-2 ring-[#10B981]/50'
                      : 'border-white/20 opacity-60 hover:opacity-100'
                  }`}
                >
                  {isVideoUrl(url) ? (
                    <div className="w-full h-full bg-black flex items-center justify-center">
                      <Play className="w-4 h-4 fill-white" />
                    </div>
                  ) : (
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
