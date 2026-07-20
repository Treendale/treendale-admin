import { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { uploadsApi } from '../lib/api';
import clsx from 'clsx';

interface ImageUploaderProps {
  currentUrl?: string;
  onUploaded: (url: string) => void;
  onMultipleUploaded?: (urls: string[]) => void;
  label?: string;
  id?: string;
  aspectClass?: string; // e.g. 'aspect-video' or 'aspect-square' or 'h-36 w-full'
  multiple?: boolean;
}

export default function ImageUploader({
  currentUrl,
  onUploaded,
  onMultipleUploaded,
  label = 'Image',
  id = 'img-uploader',
  aspectClass = 'aspect-video',
  multiple = false,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  async function uploadSingle(file: File): Promise<string> {
    const res = await uploadsApi.upload(file);
    const url: string = res.data?.data?.url;
    if (!url) throw new Error('No URL returned from server');
    return url;
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError('');
    setUploading(true);

    try {
      if (multiple && onMultipleUploaded) {
        // Upload all in parallel
        const promises = Array.from(files).map((f) => uploadSingle(f));
        const urls = await Promise.all(promises);
        onMultipleUploaded(urls);
      } else {
        // Single file upload
        const url = await uploadSingle(files[0]);
        onUploaded(url);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? 'Upload failed. Max 10MB, JPEG/PNG/WebP only.');
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  }

  return (
    <div>
      {label && <p className="label mb-2">{label}</p>}

      <div
        className={clsx(
          'relative rounded-xl border-2 border-dashed transition-all overflow-hidden flex items-center justify-center',
          aspectClass,
          dragging ? 'border-brand-400 bg-brand-500/10' : 'border-admin-border hover:border-brand-500/40',
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        {currentUrl ? (
          <>
            <img src={currentUrl} alt="Preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/45 opacity-0 hover:opacity-100 transition-all flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="btn-primary text-xs py-2 px-3 text-white"
                disabled={uploading}
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Replace
              </button>
              <button
                type="button"
                onClick={() => onUploaded('')}
                className="btn-secondary text-xs py-2 px-3 text-white"
              >
                <X className="w-4 h-4" /> Remove
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            id={id}
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-cocoa/30 hover:text-cocoa/60 transition-all w-full h-full p-2"
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
            ) : (
              <>
                <ImageIcon className="w-6 h-6" aria-hidden="true" />
                <span className="text-xs font-semibold">
                  {multiple ? 'Click to select multiple' : 'Click or drag & drop'}
                </span>
                <span className="text-[10px] text-cocoa/20">JPEG, PNG, WebP · max 10MB</span>
              </>
            )}
          </button>
        )}
      </div>

      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
      />
    </div>
  );
}
