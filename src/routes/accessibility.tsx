import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, H2, List } from "@/components/LegalPage";

export const Route = createFileRoute("/accessibility")({
  head: () => ({
    meta: [
      { title: "WCAG 2.2 compliance — EXPLR Pathways" },
      {
        name: "description",
        content:
          "EXPLR Pathways is built to WCAG 2.2 Level AA. How we test, what to expect, and how to get help or report a barrier.",
      },
    ],
  }),
  component: () => (
    <LegalPage
      eyebrow="Accessibility"
      title="WCAG 2.2 compliance statement"
      effective="October 12, 2026"
    >
      <p>
        EXPLR Pathways is used by students from grade 4 up, their families, instructors, and partner
        organizations. We want every one of them to be able to use it, with any device and any
        assistive technology. Our target is the Web Content Accessibility Guidelines (WCAG) 2.2 at
        Level AA.
      </p>

      <H2>What we do</H2>
      <List
        items={[
          "Every page works with a keyboard alone: a skip link to the content, a visible focus ring, no keyboard traps, and nothing that needs a drag gesture.",
          "Text keeps a contrast ratio of at least 4.5:1, controls and focus rings at least 3:1, and no meaning is carried by color alone.",
          "Every control is at least 24 by 24 pixels and most are 44 pixels tall, with labels, names, and states exposed to screen readers.",
          "Forms label every field, mark required fields, announce errors, allow paste and password managers, and never ask you to retype something you already entered in the same flow.",
          "Sign-in never requires solving a puzzle or remembering a password you cannot paste. Grade 4-8 students use a picture sign-in, and every student can use a QR passport card instead.",
          "Animation respects your reduced-motion setting, and nothing moves or updates on a timer you cannot pause.",
          "Text can be resized to 200 percent and pages reflow to a 320 pixel wide screen without side-scrolling.",
          "Pages have a logical heading structure, landmarks, and a title that says where you are.",
        ]}
      />

      <H2>How we test</H2>
      <p>
        Every public page is scanned with the axe-core engine against the WCAG 2.2 AA rule set on
        each change, and any failure blocks the release. Signed-in pages are reviewed in code
        against the same criteria and checked with a keyboard and a screen reader. The built-in
        accessibility toolbar on every page lets you enlarge text, raise contrast, and have the page
        read aloud.
      </p>

      <H2>Known limitations</H2>
      <List
        items={[
          "PDF exports (resume, hours log, Readiness Seal evidence, Student Success Plan) are generated in the browser and are tagged as plain text documents; use the on-screen version with a screen reader when you can.",
          "The camera sign-in for passport cards needs a working camera; the class-code and picture sign-in does the same job without one.",
          "Illustrations are decorative and are hidden from assistive technology.",
        ]}
      />

      <H2 id="help">Help and feedback</H2>
      <p>
        If you hit a barrier, or need any part of EXPLR Pathways in a different format, email{" "}
        <a href="mailto:support@explr.cc" className="ink-link">
          support@explr.cc
        </a>
        . Tell us the page, what you were trying to do, and the device and assistive technology you
        use. We aim to reply within five business days and to fix confirmed barriers in the next
        release.
      </p>
      <p>
        This statement is reviewed whenever the site changes substantially, and at least once a
        year.
      </p>
    </LegalPage>
  ),
});
