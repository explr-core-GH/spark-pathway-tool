// Stub slide viewer. Real deck files will be uploaded to Supabase Storage
// at /curriculum/<slug>/<filename>.pptx and rendered via an embed later.

type Props = { slug: string; file: string };

export function SlideViewer({ slug, file }: Props) {
  return (
    <div className="border border-charcoal-200 bg-charcoal-50 px-6 py-12 text-center">
      <p className="eyebrow mb-2">Slide deck</p>
      <p className="font-medium text-ink">{file}</p>
      <p className="mt-2 text-xs text-charcoal-400">
        Preview coming soon · /curriculum/{slug}/{file}
      </p>
    </div>
  );
}
