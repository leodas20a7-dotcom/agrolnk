import React, { useState, useRef } from 'react';
import {
  Camera,
  Video,
  Upload,
  X,
  Star,
  Play,
  Film,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Eye,
  Maximize2,
  Plus,
  Link,
  ImageIcon
} from 'lucide-react';
import Badge from './Badge';
import {
  isVideoFile,
  isVideoUrl,
  validateVideoFile,
  uploadProduceImage,
  uploadProduceVideo
} from '../../utils/imageUpload';
import { toast } from '../../context/ToastContext';

/**
 * MultiMediaUploader
 *
 * Allows uploading up to 8 media files (photos + max 1 short video clip).
 * - Photos are automatically compressed via HTML5 Canvas (WebP/JPEG max 1200px)
 * - Video is validated to be short (5s - 10s) and uploaded directly to Supabase Storage
 * - First item (index 0) serves as primary Cover Media
 * - Full thumbnail gallery with "Make Cover", preview, and remove capabilities
 *
 * @param {Object} props
 * @param {string[]} props.media - Array of media URLs
 * @param {Function} props.onChange - (urls: string[]) => void
 * @param {number} [props.maxFiles=8] - Total items allowed
 * @param {number} [props.maxVideos=1] - Maximum videos allowed
 * @param {string} [props.className='']
 */
export default function MultiMediaUploader({
  media = [],
  onChange,
  maxFiles = 8,
  maxVideos = 1,
  className = '',
}) {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, percent: 0, status: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [urlInputType, setUrlInputType] = useState('image'); // 'image' | 'video'
  const [urlInputValue, setUrlInputValue] = useState('');
  const [urlModalError, setUrlModalError] = useState('');
  const [previewModalItem, setPreviewModalItem] = useState(null);

  const handleOpenUrlModal = () => {
    setErrorMsg('');
    setUrlModalError('');
    setUrlInputValue('');
    // If video is already 1/1, default to image
    setUrlInputType('image');
    setShowUrlModal(true);
  };

  const handleAddMediaUrl = (e) => {
    e?.preventDefault();
    setUrlModalError('');

    const trimmedUrl = urlInputValue.trim();
    if (!trimmedUrl) {
      setUrlModalError('Please enter a valid URL.');
      return;
    }

    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://') && !trimmedUrl.startsWith('data:')) {
      setUrlModalError('URL must start with http://, https://, or data:');
      return;
    }

    if (currentMedia.length >= maxFiles) {
      setUrlModalError(`Maximum ${maxFiles} media items reached.`);
      return;
    }

    if (urlInputType === 'video') {
      if (currentVideosCount >= maxVideos) {
        setUrlModalError(`Only ${maxVideos} video clip is allowed. You already have a video.`);
        return;
      }
    }

    // Append URL
    const updatedMedia = [...currentMedia, trimmedUrl];
    onChange?.(updatedMedia);
    toast.success(`${urlInputType === 'video' ? 'Video' : 'Image'} URL added successfully!`);
    setShowUrlModal(false);
    setUrlInputValue('');
  };

  const currentMedia = Array.isArray(media) ? media : [];
  const currentVideosCount = currentMedia.filter(isVideoUrl).length;
  const remainingSlots = Math.max(0, maxFiles - currentMedia.length);

  // Process incoming files
  const processFiles = async (selectedFiles) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    setErrorMsg('');

    const filesArray = Array.from(selectedFiles);

    // Validate slot overflow
    if (filesArray.length > remainingSlots) {
      setErrorMsg(`You can only add ${remainingSlots} more item${remainingSlots === 1 ? '' : 's'} (max ${maxFiles} total).`);
      return;
    }

    // Validate video limits
    const incomingVideos = filesArray.filter(isVideoFile);
    if (incomingVideos.length + currentVideosCount > maxVideos) {
      setErrorMsg(`Only ${maxVideos} short video clip (5s–10s) is allowed per listing.`);
      return;
    }

    setIsProcessing(true);
    const newUrls = [];
    const total = filesArray.length;

    for (let i = 0; i < total; i++) {
      const file = filesArray[i];
      const isVid = isVideoFile(file);

      setUploadProgress({
        current: i + 1,
        total,
        percent: Math.round(((i + 0.1) / total) * 100),
        status: isVid
          ? `Validating & uploading video (${i + 1}/${total})...`
          : `Compressing & uploading photo (${i + 1}/${total})...`,
      });

      try {
        if (isVid) {
          await validateVideoFile(file, 12); // max ~10-12s
          const vidUrl = await uploadProduceVideo(file, 'listings');
          if (vidUrl) {
            newUrls.push(vidUrl);
          }
        } else {
          const imgUrl = await uploadProduceImage(file, 'listings');
          if (imgUrl) {
            newUrls.push(imgUrl);
          }
        }
      } catch (err) {
        console.error('File processing error:', err);
        setErrorMsg(err.message || `Failed to process ${file.name}`);
        toast.error(err.message || `Failed to upload ${file.name}`);
      }
    }

    setIsProcessing(false);
    setUploadProgress({ current: 0, total: 0, percent: 0, status: '' });

    if (newUrls.length > 0) {
      const updatedMedia = [...currentMedia, ...newUrls];
      onChange?.(updatedMedia);
      toast.success(`Successfully uploaded ${newUrls.length} media file${newUrls.length > 1 ? 's' : ''}!`);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (e) => {
    processFiles(e.target.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveItem = (indexToRemove) => {
    const updated = currentMedia.filter((_, idx) => idx !== indexToRemove);
    onChange?.(updated);
  };

  const handleMakeCover = (indexToCover) => {
    if (indexToCover === 0) return;
    const target = currentMedia[indexToCover];
    const remaining = currentMedia.filter((_, idx) => idx !== indexToCover);
    const reordered = [target, ...remaining];
    onChange?.(reordered);
    toast.success('Cover media updated!');
  };

  return (
    <div className={`space-y-4 ${className}`}>
      
      {/* Header Info Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E5EDE8]">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-[#0B3326] font-heading">
              Produce Media Gallery
            </h4>
            <Badge variant={currentMedia.length > 0 ? 'emerald' : 'neutral'} size="sm">
              {currentMedia.length} / {maxFiles} Uploaded
            </Badge>
          </div>
          <p className="text-xs text-[#566861] mt-0.5">
            Upload up to {maxFiles} high-res photos and 1 short harvest video clip (5–10s). Photos are auto-compressed.
          </p>
        </div>

        {/* Action Controls & Video Allowance Indicator */}
        <div className="flex items-center gap-3">
          {/* Add via URL Button */}
          <button
            type="button"
            onClick={handleOpenUrlModal}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg border border-[#10B981] text-[#0B3326] bg-[#F2FBF6] hover:bg-[#10B981] hover:text-white transition-all shadow-2xs cursor-pointer"
            title="Add image or video by URL"
          >
            <Link className="w-3.5 h-3.5" />
            <span>URL</span>
          </button>

          {/* Video Allowance Indicator */}
          <div className="flex items-center gap-1.5 text-xs">
            <Film className="w-3.5 h-3.5 text-[#10B981]" />
            <span className="text-[#566861]">
              Video clip: <strong className={currentVideosCount >= maxVideos ? 'text-amber-600' : 'text-[#0B3326]'}>
                {currentVideosCount}/{maxVideos}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Error Notice */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg('')}
            className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Active Uploading / Compression Progress Bar */}
      {isProcessing && (
        <div className="p-4 rounded-2xl bg-[#F2FBF6] border border-[#10B981]/30 space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#0B3326] flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#10B981]" />
              {uploadProgress.status || 'Optimizing & uploading produce media...'}
            </span>
            <span className="font-semibold text-[#10B981]">
              {uploadProgress.percent}%
            </span>
          </div>
          <div className="w-full bg-[#E5EDE8] rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#10B981] to-[#059669] h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress.percent}%` }}
            />
          </div>
          <p className="text-[11px] text-[#566861]">
            Compressing photos on your device before storing in Supabase to keep page load lightning fast.
          </p>
        </div>
      )}

      {/* Media Grid & Upload Box */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        
        {/* Uploaded Items */}
        {currentMedia.map((url, idx) => {
          const isVid = isVideoUrl(url);
          const isCover = idx === 0;

          return (
            <div
              key={`${url}-${idx}`}
              className={`group relative rounded-2xl overflow-hidden border-2 aspect-square bg-[#0B3326]/5 transition-all shadow-xs ${
                isCover ? 'border-[#10B981] ring-2 ring-[#10B981]/20' : 'border-[#E5EDE8] hover:border-[#10B981]/60'
              }`}
            >
              {/* Media Content */}
              {isVid ? (
                <div className="w-full h-full relative bg-black flex items-center justify-center">
                  <video
                    src={url}
                    className="w-full h-full object-cover opacity-85"
                    preload="metadata"
                    playsInline
                    muted
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-xs shadow-md">
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    </div>
                  </div>
                </div>
              ) : (
                <img
                  src={url}
                  alt={`Produce media ${idx + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              )}

              {/* Badges Overlay */}
              <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                {isCover && (
                  <Badge variant="accent" size="sm" className="shadow-xs font-bold">
                    <Star className="w-3 h-3 fill-white" />
                    Cover
                  </Badge>
                )}
                {isVid && (
                  <Badge variant="dark" size="sm" className="shadow-xs font-bold text-[10px] bg-black/70 border-white/20">
                    <Video className="w-2.5 h-2.5 text-[#10B981]" />
                    Video (5-10s)
                  </Badge>
                )}
              </div>

              {/* Action Buttons (Hover or Touch Overlay) */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 z-20">
                
                {/* Top Right: Delete */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    title="Remove media"
                    className="w-7 h-7 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-md transition-transform hover:scale-110 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Bottom Row Actions */}
                <div className="flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => setPreviewModalItem({ url, isVideo: isVid, index: idx })}
                    title="View Full Preview"
                    className="p-1.5 rounded-lg bg-white/20 hover:bg-white/40 text-white backdrop-blur-xs text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  {!isCover && (
                    <button
                      type="button"
                      onClick={() => handleMakeCover(idx)}
                      title="Set as Primary Cover"
                      className="px-2 py-1 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                    >
                      <Star className="w-3 h-3" />
                      Set Cover
                    </button>
                  )}
                </div>

              </div>
            </div>
          );
        })}

        {/* Drag & Drop Add Slot (if remaining slots exist) */}
        {remainingSlots > 0 && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`rounded-2xl border-2 border-dashed aspect-square flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-[#10B981] bg-[#F2FBF6] scale-[1.02]'
                : 'border-[#CCDCD3] hover:border-[#10B981] bg-[#F8FAF8] hover:bg-[#F2FBF6]/60'
            }`}
          >
            <div className="w-10 h-10 rounded-2xl bg-white border border-[#E5EDE8] shadow-2xs flex items-center justify-center text-[#10B981] mb-2 group-hover:scale-110 transition-transform">
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Plus className="w-5 h-5 stroke-[2.5]" />
              )}
            </div>

            <span className="text-xs font-bold text-[#0B3326]">
              Add Media
            </span>
            <span className="text-[10px] text-[#566861] mt-0.5 line-clamp-1">
              Photos &amp; 1 Video
            </span>
            <span className="text-[9px] text-[#10B981] font-semibold mt-1">
              {remainingSlots} slot{remainingSlots > 1 ? 's' : ''} left
            </span>

            {/* Hidden Input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

      </div>

      {/* Helpful Tips Footer */}
      <div className="p-3 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-[11px] text-[#566861] flex items-start gap-2">
        <Camera className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
        <div>
          <span><strong>Farmer Tip:</strong> Listings with multiple clear photos and a 5–10s harvest clip receive up to <strong>3x more buyer bids &amp; faster escrow deals</strong>. Drag or use the <strong>"Set Cover"</strong> button to choose your primary display image.</span>
        </div>
      </div>

      {/* Media Fullscreen Preview Modal */}
      {previewModalItem && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewModalItem(null)}
        >
          <div
            className="relative max-w-3xl w-full max-h-[85vh] bg-[#0B3326] rounded-3xl overflow-hidden border border-[#14624A] shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#14624A] text-white">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">
                  {previewModalItem.isVideo ? '🎥 Harvest Video Preview (5-10s)' : `📷 Photo Preview (${previewModalItem.index + 1})`}
                </span>
                {previewModalItem.index === 0 && (
                  <Badge variant="accent" size="sm">Primary Cover</Badge>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalItem(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 flex items-center justify-center bg-black/40 min-h-[300px] max-h-[70vh] overflow-hidden">
              {previewModalItem.isVideo ? (
                <video
                  src={previewModalItem.url}
                  controls
                  autoPlay
                  className="max-h-[60vh] w-auto max-w-full rounded-xl shadow-lg"
                />
              ) : (
                <img
                  src={previewModalItem.url}
                  alt="Full preview"
                  className="max-h-[60vh] w-auto max-w-full object-contain rounded-xl shadow-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Media via URL Modal */}
      {showUrlModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowUrlModal(false)}
        >
          <div
            className="relative max-w-md w-full bg-white rounded-2xl overflow-hidden border border-[#E5EDE8] shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E5EDE8] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#EBF5F0] flex items-center justify-center text-[#10B981]">
                  <Link className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0B3326] font-heading">
                    Add Media from URL
                  </h3>
                  <p className="text-[11px] text-[#566861]">
                    Paste direct link to an image or video
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUrlModal(false)}
                className="w-7 h-7 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error in modal */}
            {urlModalError && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                <span>{urlModalError}</span>
              </div>
            )}

            <form onSubmit={handleAddMediaUrl} className="space-y-4">
              {/* Option Selector: Image vs Video */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0B3326] block">
                  Select Media Type
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Image Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setUrlInputType('image');
                      setUrlModalError('');
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      urlInputType === 'image'
                        ? 'border-[#10B981] bg-[#F2FBF6] text-[#0B3326] ring-2 ring-[#10B981]/20'
                        : 'border-[#E5EDE8] bg-white text-[#566861] hover:bg-gray-50'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4 text-[#10B981]" />
                    <span>Photo / Image</span>
                  </button>

                  {/* Video Option */}
                  <button
                    type="button"
                    disabled={currentVideosCount >= maxVideos}
                    onClick={() => {
                      if (currentVideosCount < maxVideos) {
                        setUrlInputType('video');
                        setUrlModalError('');
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      currentVideosCount >= maxVideos
                        ? 'border-gray-200 bg-gray-100 text-gray-400 opacity-60 cursor-not-allowed'
                        : urlInputType === 'video'
                        ? 'border-[#10B981] bg-[#F2FBF6] text-[#0B3326] ring-2 ring-[#10B981]/20 cursor-pointer'
                        : 'border-[#E5EDE8] bg-white text-[#566861] hover:bg-gray-50 cursor-pointer'
                    }`}
                  >
                    <Film className="w-4 h-4 text-emerald-600" />
                    <span>
                      Video {currentVideosCount >= maxVideos ? '(1/1 Limit)' : '(Max 1)'}
                    </span>
                  </button>
                </div>

                {currentVideosCount >= maxVideos && (
                  <p className="text-[10.5px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-1 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>A video is already attached ({currentVideosCount}/{maxVideos}). Remove the existing video first to add a new one.</span>
                  </p>
                )}
              </div>

              {/* URL Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0B3326] block">
                  {urlInputType === 'video' ? 'Video Direct URL' : 'Image Direct URL'}
                </label>
                <input
                  type="url"
                  required
                  autoFocus
                  value={urlInputValue}
                  onChange={(e) => {
                    setUrlInputValue(e.target.value);
                    if (urlModalError) setUrlModalError('');
                  }}
                  placeholder={
                    urlInputType === 'video'
                      ? 'https://example.com/video.mp4'
                      : 'https://example.com/produce.jpg'
                  }
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E5EDE8] focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 bg-white"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5EDE8]">
                <button
                  type="button"
                  onClick={() => setShowUrlModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#566861] hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!urlInputValue.trim() || (urlInputType === 'video' && currentVideosCount >= maxVideos)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#10B981] text-white hover:bg-[#0ea371] transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add to Gallery
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
