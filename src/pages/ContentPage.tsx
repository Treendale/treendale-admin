import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, FileText, Trash2, Image as ImageIcon } from 'lucide-react';
import { adminContentApi, resolveImageUrl } from '../lib/api';
import ImageUploader from '../components/ImageUploader';
import clsx from 'clsx';

// ─── Page config ────────────────────────────────────────────────────────────────
// Text-only keys for each page (image keys handled separately)
const TEXT_PAGES = [
  {
    page: 'global',
    label: 'Logos & Branding',
    textKeys: [],
    imageKeys: [
      { key: 'logo_main_url',   label: 'Main Header Logo', aspect: 'h-36 w-full' },
      { key: 'logo_footer_url', label: 'Footer Logo',      aspect: 'h-36 w-full' },
    ],
  },
  {
    page: 'home',
    label: 'Home',
    textKeys: ['hero_heading', 'hero_subheading', 'hero_cta', 'intro_text'],
    imageKeys: [
      { key: 'hero_image_url',     label: 'Hero Image (Home Page)',     aspect: 'h-36 w-full' },
      { key: 'interior_image_url', label: 'Salon Interior (Home Page)', aspect: 'h-36 w-full' },
    ],
  },
  {
    page: 'about',
    label: 'About',
    textKeys: ['about_heading', 'about_text'],
    imageKeys: [],
  },
  {
    page: 'contact',
    label: 'Contact & Socials',
    textKeys: ['contact_heading', 'contact_intro', 'phone', 'email', 'instagram_url', 'facebook_url', 'tiktok_url'],
    imageKeys: [],
  },
];

export default function ContentPage() {
  const queryClient = useQueryClient();
  const [activePage, setActivePage] = useState('home');
  const [saved, setSaved] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});

  // Gallery images state (separate from the content block system)
  const [galleryImages, setGalleryImages] = useState<Array<{ url: string; alt: string }>>([]);
  const [galleryDirty, setGalleryDirty] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-content', activePage],
    queryFn: () => adminContentApi.getPage(activePage),
  });
  const content: Record<string, string> = data?.data?.data?.content ?? {};

  // Sync gallery from content when gallery tab is opened
  const { data: galleryData } = useQuery({
    queryKey: ['admin-content', 'gallery'],
    queryFn: () => adminContentApi.getPage('gallery'),
  });
  useEffect(() => {
    if (galleryData) {
      try {
        const raw = galleryData?.data?.data?.content?.images;
        setGalleryImages(raw ? JSON.parse(raw) : []);
      } catch { setGalleryImages([]); }
    }
  }, [galleryData]);

  // Reset edits when page tab changes
  useEffect(() => { setEdits({}); }, [activePage]);

  const merged = { ...content, ...edits };

  const updateMutation = useMutation({
    mutationFn: ({ page, key, value }: { page: string; key: string; value: string }) =>
      adminContentApi.update(page, key, value),
  });

  async function saveTextEdits() {
    await Promise.all(
      Object.entries(edits).map(([key, value]) =>
        updateMutation.mutateAsync({ page: activePage, key, value }),
      ),
    );
    queryClient.invalidateQueries({ queryKey: ['admin-content', activePage] });
    setEdits({});
    setSaved(activePage);
    setTimeout(() => setSaved(null), 2000);
  }

  async function saveGallery() {
    await updateMutation.mutateAsync({
      page: 'gallery',
      key: 'images',
      value: JSON.stringify(galleryImages),
    });
    queryClient.invalidateQueries({ queryKey: ['admin-content', 'gallery'] });
    setGalleryDirty(false);
    setSaved('gallery');
    setTimeout(() => setSaved(null), 2000);
  }

  function addGalleryImage(url: string) {
    if (!url) return;
    setGalleryImages((prev) => [{ url, alt: '' }, ...prev]);
    setGalleryDirty(true);
  }

  // Prepend newly uploaded multiple images to the top of the gallery list
  function addMultipleGalleryImages(urls: string[]) {
    if (!urls || urls.length === 0) return;
    const newItems = urls.map((url) => ({ url, alt: '' }));
    setGalleryImages((prev) => [...newItems, ...prev]);
    setGalleryDirty(true);
  }

  function removeGalleryImage(i: number) {
    setGalleryImages((prev) => prev.filter((_, idx) => idx !== i));
    setGalleryDirty(true);
  }

  // Native HTML5 Drag and Drop Reordering handlers
  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDragEnter(index: number) {
    if (draggedIndex === null || draggedIndex === index) return;

    const copy = [...galleryImages];
    const item = copy[draggedIndex];
    // Remove the dragged item
    copy.splice(draggedIndex, 1);
    // Insert at current hover position
    copy.splice(index, 0, item);

    setDraggedIndex(index);
    setGalleryImages(copy);
    setGalleryDirty(true);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
  }

  function updateImageUrl(key: string, url: string) {
    setEdits((p) => ({ ...p, [key]: url }));
  }

  const pageConfig = TEXT_PAGES.find((p) => p.page === activePage);
  const isGallery = activePage === 'gallery';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6" aria-hidden="true" /> Website Content
          </h1>
          <p className="text-white/40 text-sm mt-1">Edit public website copy and images. Changes are live immediately.</p>
        </div>
        {!isGallery && (
          <button
            onClick={saveTextEdits}
            disabled={Object.keys(edits).length === 0 || updateMutation.isPending}
            className="btn-primary text-sm"
            id="save-content-btn"
          >
            <Save className="w-4 h-4" />
            {updateMutation.isPending ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
          </button>
        )}
        {isGallery && (
          <button
            onClick={saveGallery}
            disabled={!galleryDirty || updateMutation.isPending}
            className="btn-primary text-sm"
            id="save-gallery-btn"
          >
            <Save className="w-4 h-4" />
            {updateMutation.isPending ? 'Saving...' : saved === 'gallery' ? '✓ Saved!' : 'Save Gallery'}
          </button>
        )}
      </div>

      {/* Page tabs */}
      <div className="flex gap-2 flex-wrap">
        {[...TEXT_PAGES.map((p) => ({ page: p.page, label: p.label })), { page: 'gallery', label: 'Gallery' }].map(({ page, label }) => (
          <button
            key={page}
            id={`content-tab-${page}`}
            onClick={() => { setActivePage(page); setEdits({}); }}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all capitalize min-h-[44px] border ${
              activePage === page
                ? 'bg-brand-500 text-white border-brand-500 shadow-md shadow-brand-500/10'
                : 'border-admin-border text-white/50 hover:text-white hover:border-white/20'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Gallery Tab ── */}
      {isGallery && (
        <div className="space-y-6">
          <div className="card space-y-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-brand-400" /> Upload Images
            </h2>
            <ImageUploader
              id="gallery-uploader"
              label=""
              multiple={true}
              aspectClass="h-36 w-full"
              onUploaded={addGalleryImage}
              onMultipleUploaded={addMultipleGalleryImages}
            />
          </div>

          {galleryImages.length > 0 && (
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-white">Gallery ({galleryImages.length} images)</h2>
                <span className="text-white/40 text-xs select-none">💡 Drag and drop items to re-order</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {galleryImages.map((img, i) => (
                  <div
                    key={img.url}
                    draggable
                    onDragStart={() => handleDragStart(i)}
                    onDragEnter={() => handleDragEnter(i)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    className={clsx(
                      'relative group rounded-xl overflow-hidden aspect-square border cursor-grab active:cursor-grabbing transition-all duration-200 select-none bg-admin-bg',
                      draggedIndex === i ? 'opacity-40 border-dashed border-brand-500 scale-95' : 'border-admin-border',
                    )}
                  >
                    <img src={resolveImageUrl(img.url)} alt="" className="w-full h-full object-cover pointer-events-none" loading="lazy" />
                    <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center pointer-events-auto">
                      <button
                        onClick={(e) => { e.stopPropagation(); removeGalleryImage(i); }}
                        className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center hover:bg-red-500 transition-all text-white-force shadow-md"
                        aria-label={`Remove image ${i + 1}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Text + Image pages ── */}
      {!isGallery && !isLoading && pageConfig && (
        <div className="space-y-4">
          {/* Image fields */}
          {pageConfig.imageKeys.length > 0 && (
            <div className="card space-y-4">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-brand-400" /> Page Images
              </h2>
              {/* Render image uploaders side by side on desktop */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pageConfig.imageKeys.map(({ key, label, aspect }) => (
                  <ImageUploader
                    key={key}
                    id={`img-${key}`}
                    label={label}
                    aspectClass={aspect}
                    currentUrl={resolveImageUrl(merged[key]) || undefined}
                    onUploaded={(url) => updateImageUrl(key, url)}
                  />
                ))}
              </div>
              {pageConfig.imageKeys.some(({ key }) => edits[key] !== undefined) && (
                <p className="text-brand-300 text-xs">● Image changes — click Save to apply</p>
              )}
            </div>
          )}

          {/* Text fields */}
          {pageConfig.textKeys.map((key) => (
            <div key={key} className="card">
              <label htmlFor={`content-${key}`} className="label">
                {key.replace(/_/g, ' ').toUpperCase()}
              </label>
              {key.includes('text') || key.includes('intro') || key.includes('bio') ? (
                <textarea
                  id={`content-${key}`}
                  rows={4}
                  className="input resize-none"
                  value={merged[key] ?? ''}
                  onChange={(e) => setEdits((p) => ({ ...p, [key]: e.target.value }))}
                />
              ) : (
                <input
                  id={`content-${key}`}
                  type="text"
                  className="input"
                  value={merged[key] ?? ''}
                  onChange={(e) => setEdits((p) => ({ ...p, [key]: e.target.value }))}
                />
              )}
              {edits[key] !== undefined && (
                <p className="text-brand-300 text-xs mt-1">● Unsaved changes</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
