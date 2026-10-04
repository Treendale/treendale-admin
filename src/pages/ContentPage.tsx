import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, FileText, Image as ImageIcon } from 'lucide-react';
import { adminContentApi, resolveImageUrl } from '../lib/api';
import ImageUploader from '../components/ImageUploader';

// ─── Page config ────────────────────────────────────────────────────────────────
// Text and image keys for every customer-facing page
const TEXT_PAGES = [
  {
    page: 'home',
    label: 'Home Page',
    imageKeys: [
      { key: 'hero_image_url',     label: 'Hero Background Image', aspect: 'h-40 w-full', objectFit: 'cover' as const },
      { key: 'interior_image_url', label: 'Texture / Salon Section Image', aspect: 'h-40 w-full', objectFit: 'cover' as const },
    ],
    textKeys: [
      'hero_tagline',
      'hero_heading',
      'hero_subheading',
      'hero_cta',
      'intro_heading',
      'card1_title',
      'card1_text',
      'card1_cta',
      'card2_title',
      'card2_text',
      'card2_cta',
      'card3_title',
      'card3_text',
      'card3_cta',
    ],
  },
  {
    page: 'services',
    label: 'Services Page',
    imageKeys: [
      { key: 'hero_image_url', label: 'Services Hero Banner', aspect: 'h-40 w-full', objectFit: 'cover' as const },
    ],
    textKeys: [
      'hero_title',
      'hero_subtitle',
    ],
  },
  {
    page: 'about',
    label: 'About Page',
    imageKeys: [
      { key: 'hero_image_url', label: 'About Hero Banner', aspect: 'h-40 w-full', objectFit: 'cover' as const },
    ],
    textKeys: [
      'hero_title',
      'hero_subtitle',
      'about_badge',
      'about_heading',
      'about_text',
      'about_text_secondary',
      'about_cta',
      'standards_heading',
      'story1_title',
      'story1_desc',
      'story2_title',
      'story2_desc',
      'story3_title',
      'story3_desc',
      'story4_title',
      'story4_desc',
    ],
  },
  {
    page: 'contact',
    label: 'Contact & Socials',
    imageKeys: [
      { key: 'hero_image_url', label: 'Contact Hero Banner', aspect: 'h-40 w-full', objectFit: 'cover' as const },
    ],
    textKeys: [
      'hero_title',
      'hero_subtitle',
      'socials_heading',
      'location_badge',
      'location_title',
      'location_subtext',
      'hours_badge',
      'hours_title',
      'hours_subtext',
      'policy_badge',
      'policy_subtext',
      'form_heading',
      'form_subtext',
      'form_success_heading',
      'form_success_subtext',
      'phone',
      'email',
      'instagram_url',
      'facebook_url',
      'tiktok_url',
    ],
  },
  {
    page: 'policies',
    label: 'Policies Page',
    imageKeys: [
      { key: 'hero_image_url', label: 'Policies Hero Banner', aspect: 'h-40 w-full', objectFit: 'cover' as const },
    ],
    textKeys: [
      'hero_title',
      'hero_subtitle',
      'notice_title',
      'notice_text',
      'arrival_title',
      'arrival_text',
      'booking_terms_title',
      'booking_terms_text',
    ],
  },
  {
    page: 'global',
    label: 'Logos & Branding',
    imageKeys: [
      { key: 'logo_light_url', label: 'Light Logo (For Dark Hero / Transparent Navbar)', aspect: 'h-36 w-full', darkPreview: true, objectFit: 'contain' as const },
      { key: 'logo_dark_url',  label: 'Dark Logo (For White Header / Scrolled Navbar)',  aspect: 'h-36 w-full', objectFit: 'contain' as const },
    ],
    textKeys: ['footer_tagline', 'footer_cta_text', 'footer_attribution'],
  },
];

export default function ContentPage() {
  const queryClient = useQueryClient();
  const [activePage, setActivePage] = useState('home');
  const [saved, setSaved] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['admin-content', activePage],
    queryFn: () => adminContentApi.getPage(activePage),
  });
  const content: Record<string, string> = data?.data?.data?.content ?? {};

  // Reset edits when page tab changes
  useEffect(() => { setEdits({}); }, [activePage]);

  const merged = { ...content, ...edits };

  const updateMutation = useMutation({
    mutationFn: ({ page, key, value }: { page: string; key: string; value: string }) =>
      adminContentApi.update(page, key, value),
  });

  async function saveTextEdits() {
    try {
      await adminContentApi.bulkUpdate(activePage, edits);
    } catch {
      await Promise.all(
        Object.entries(edits).map(([key, value]) =>
          updateMutation.mutateAsync({ page: activePage, key, value }),
        ),
      );
    }
    queryClient.invalidateQueries({ queryKey: ['admin-content', activePage] });
    setEdits({});
    setSaved(activePage);
    setTimeout(() => setSaved(null), 2000);
  }

  function updateImageUrl(key: string, url: string) {
    setEdits((p) => ({ ...p, [key]: url }));
  }

  const pageConfig = TEXT_PAGES.find((p) => p.page === activePage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-cocoa flex items-center gap-2">
            <FileText className="w-6 h-6" aria-hidden="true" /> Website Content
          </h1>
          <p className="text-cocoa/40 text-sm mt-1">Edit public website copy and images. Changes are live immediately.</p>
        </div>
        <button
          onClick={saveTextEdits}
          disabled={Object.keys(edits).length === 0 || updateMutation.isPending}
          className="btn-primary text-sm"
          id="save-content-btn"
        >
          <Save className="w-4 h-4" />
          {updateMutation.isPending ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Page tabs */}
      <div className="flex gap-2 flex-wrap">
        {TEXT_PAGES.map(({ page, label }) => (
          <button
            key={page}
            id={`content-tab-${page}`}
            onClick={() => { setActivePage(page); setEdits({}); }}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all capitalize min-h-[44px] border ${
              activePage === page
                ? 'bg-brand-500 text-white border-brand-500 shadow-md shadow-brand-500/10'
                : 'border-admin-border text-cocoa/70 bg-white hover:text-brand-600 hover:border-brand-300 hover:bg-brand-50/60'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Text + Image pages ── */}
      {!isLoading && pageConfig && (
        <div className="space-y-4">
          {/* Image fields */}
          {pageConfig.imageKeys.length > 0 && (
            <div className="card space-y-4">
              <h2 className="font-semibold text-cocoa flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-brand-400" /> Page Images
              </h2>
              {/* Render image uploaders side by side on desktop */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pageConfig.imageKeys.map(({ key, label, aspect, darkPreview, objectFit }) => (
                  <ImageUploader
                    key={key}
                    id={`img-${key}`}
                    label={label}
                    aspectClass={aspect}
                    darkPreview={darkPreview}
                    objectFitClass={objectFit === 'contain' ? 'object-contain p-3' : 'object-cover'}
                    currentUrl={resolveImageUrl(merged[key]) || undefined}
                    onUploaded={(url) => updateImageUrl(key, url)}
                  />
                ))}
              </div>
              {pageConfig.imageKeys.some(({ key }) => edits[key] !== undefined) && (
                <p className="text-brand-500 text-xs font-medium">● Image changes pending — click Save Changes above to apply</p>
              )}
            </div>
          )}

          {/* Text fields */}
          {pageConfig.textKeys.map((key) => (
            <div key={key} className="card">
              <label htmlFor={`content-${key}`} className="label">
                {key.replace(/_/g, ' ').toUpperCase()}
              </label>
              {key.includes('text') || key.includes('intro') || key.includes('bio') || key.includes('desc') || key.includes('subheading') || key.includes('tagline') || key.includes('subtext') ? (
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
