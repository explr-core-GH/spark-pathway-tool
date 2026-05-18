import { useState } from "react";

/**
 * SlideViewer — renders a slide deck or document stored in the
 * Supabase Storage "curriculum" bucket at curriculum/<slug>/<file>.
 *
 * Strategy by file extension:
 *   .pptx / .ppt / .docx / .xlsx → Microsoft Office Online Viewer iframe.
 *     The viewer fetches the file by URL and renders read-only slides.
 *     Requires the file to be publicly accessible, which the bucket is.
 *   .pdf → native <embed> render (every browser handles this).
 *   anything else → fallback "Open file" link.
 *
 * The "Open in new tab" link is always shown so educators can pop the
 * deck out / present from it directly.
 */

const SUPABASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
  process.env.SUPABASE_URL ||
  "";

function publicUrl(slug: string, file: string): string {
  // encodeURIComponent on each path segment so spaces / parens in filenames
  // (lots of legacy decks have them) become %20 / %28 etc.
  const path = `${encodeURIComponent(slug)}/${encodeURIComponent(file)}`;
  return `${SUPABASE_URL}/storage/v1/object/public/curriculum/${path}`;
}

function ext(file: string): string {
  const dot = file.lastIndexOf(".");
  return dot === -1 ? "" : file.slice(dot + 1).toLowerCase();
}

type Props = { slug: string; file: string };

export function SlideViewer({ slug, file }: Props) {
  const [errored, setErrored] = useState(false);
  const url = publicUrl(slug, file);
  const e = ext(file);

  const isOffice = ["pptx", "ppt", "docx", "doc", "xlsx", "xls"].includes(e);
  const isPdf = e === "pdf";

  // SSR safety — viewers need a window. The viewer iframe URLs are stable
  // anyway, but reading import.meta.env / running embeds only makes sense
  // on the client.
  if (typeof window === "undefined" || !SUPABASE_URL) {
    return (
      <FallbackCard slug={slug} file={file} url={url}>
        Preview unavailable during initial render.
      </FallbackCard>
    );
  }

  if (errored) {
    return (
      <FallbackCard slug={slug} file={file} url={url}>
        The preview failed to load — the file may not be uploaded yet.
      </FallbackCard>
    );
  }

  if (isOffice) {
    const src = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
      url,
    )}`;
    return (
      <div className="border border-charcoal-200 bg-white">
        <div className="flex items-baseline justify-between border-b border-charcoal-100 px-3 py-2">
          <p className="text-xs text-charcoal-500 truncate">{file}</p>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="ink-link text-xs"
          >
            Open in new tab ↗
          </a>
        </div>
        <iframe
          src={src}
          title={`${slug} — ${file}`}
          className="block h-[640px] w-full border-0"
          onError={() => setErrored(true)}
          allowFullScreen
        />
      </div>
    );
  }

  if (isPdf) {
    return (
      <div className="border border-charcoal-200 bg-white">
        <div className="flex items-baseline justify-between border-b border-charcoal-100 px-3 py-2">
          <p className="text-xs text-charcoal-500 truncate">{file}</p>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="ink-link text-xs"
          >
            Open in new tab ↗
          </a>
        </div>
        <embed
          src={url}
          type="application/pdf"
          className="block h-[640px] w-full"
        />
      </div>
    );
  }

  // Unknown filetype — show download card.
  return (
    <FallbackCard slug={slug} file={file} url={url}>
      No inline preview for .{e} files.
    </FallbackCard>
  );
}

function FallbackCard({
  slug: _slug,
  file,
  url,
  children,
}: {
  slug: string;
  file: string;
  url: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-charcoal-200 bg-charcoal-50 px-6 py-12 text-center">
      <p className="eyebrow mb-2">Slide deck</p>
      <p className="font-medium text-ink">{file}</p>
      <p className="mt-2 text-xs text-charcoal-500">{children}</p>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="btn-ink mt-6 inline-block text-xs"
      >
        Download / Open ↗
      </a>
    </div>
  );
}
