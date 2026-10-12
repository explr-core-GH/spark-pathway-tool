import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AssessmentPhotosPanel } from "@/components/AssessmentPhotosPanel";
import { SurveyAdminPanel } from "./instructor.admin.surveys";

export const Route = createFileRoute("/instructor/admin/assessments")({
  head: () => ({ meta: [{ title: "Assessments & surveys — Admin" }] }),
  component: AssessmentsAdmin,
});

type Tab = "surveys" | "photos";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "surveys", label: "STEM surveys" },
  { id: "photos", label: "Question photos" },
];

function AssessmentsAdmin() {
  const [tab, setTab] = useState<Tab>("surveys");

  return (
    <main className="mx-auto max-w-[1312px] px-4 py-10 sm:px-6 lg:px-8">
      <p className="eyebrow">Admin</p>
      <h1 className="display mt-2">Assessments &amp; surveys</h1>

      {/* Tabs */}
      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex min-h-[44px] items-center rounded-full border px-4 text-sm font-medium transition-colors ${
              tab === t.id
                ? "border-ink-900 bg-ink-900 text-paper"
                : "border-line-strong text-ink-700 hover:border-ink-900 hover:text-ink-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {tab === "surveys" && <SurveyAdminPanel />}
        {tab === "photos" && <AssessmentPhotosPanel />}
      </div>
    </main>
  );
}
