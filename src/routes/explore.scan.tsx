import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ScanLine } from "lucide-react";
import { SiteHeader } from "@/components/passport";
import { SiteFooter } from "@/components/SiteFooter";

/**
 * /explore/scan — scan a passport card with the laptop camera. Uses the
 * browser's BarcodeDetector where available (Chrome, Edge, Chromebooks).
 * The card's QR encodes /go/<token>; on a hit we simply navigate there.
 */
export const Route = createFileRoute("/explore/scan")({
  head: () => ({ meta: [{ title: "Scan your passport card — EXPLR Pathways" }] }),
  component: Scan,
});

type DetectorCtor = new (opts: { formats: string[] }) => {
  detect(src: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
};

function Scan() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<"starting" | "scanning" | "unsupported" | "denied" | "found">(
    "starting",
  );

  useEffect(() => {
    const Detector = (globalThis as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      setState("unsupported");
      return;
    }
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    const detector = new Detector({ formats: ["qr_code"] });

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
      } catch {
        setState("denied");
        return;
      }
      const v = videoRef.current;
      if (!v || stopped) return;
      v.srcObject = stream;
      await v.play();
      setState("scanning");
      const tick = async () => {
        if (stopped) return;
        try {
          const codes = await detector.detect(v);
          const hit = codes
            .map((c) => c.rawValue)
            .find((raw) => /\/go\/[A-Za-z0-9_-]{16,}/.test(raw));
          if (hit) {
            const token = hit.match(/\/go\/([A-Za-z0-9_-]{16,})/)![1];
            setState("found");
            stopped = true;
            navigate({ to: "/go/$token", params: { token } });
            return;
          }
        } catch {
          // keep scanning
        }
        raf = requestAnimationFrame(() => setTimeout(tick, 150));
      };
      tick();
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink-900" data-density="explore">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[900px] flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <Link
          to="/explore"
          className="inline-flex min-h-[44px] items-center gap-2 text-ink-700 hover:text-green-deep"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden /> Back
        </Link>
        <p className="eyebrow mt-6 text-green">Students · grades 4-8</p>
        <div className="mt-3 flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] border border-mint-soft bg-mint-tint text-green-deep">
            <ScanLine className="h-6 w-6" strokeWidth={2} aria-hidden />
          </span>
          <p className="font-mono text-[12px] font-medium uppercase tracking-[0.08em] text-green">
            Scan your passport card
          </p>
        </div>
        <h1 className="display mt-2">Hold your card up.</h1>
        <div className="mt-8 overflow-hidden rounded-[var(--radius-card)] border-2 border-line bg-ink-900 shadow-card">
          <video
            ref={videoRef}
            className="aspect-video w-full object-cover"
            muted
            playsInline
            aria-label="Camera preview"
          />
        </div>
        <p className="mt-4 text-lg text-ink-700" aria-live="polite">
          {state === "starting" && "Starting the camera…"}
          {state === "scanning" && "Looking for the square code on your card…"}
          {state === "found" && "Got it! Opening your passport…"}
          {state === "denied" &&
            "The camera is off. Ask your instructor to allow the camera, or use your class code instead."}
          {state === "unsupported" &&
            "This browser can't scan cards. Scan the card with a phone camera instead, or use your class code."}
        </p>
        <Link to="/explore" className="btn-ghost mt-6">
          Use my class code instead
        </Link>
      </main>
      <SiteFooter className="mt-10" />
    </div>
  );
}
