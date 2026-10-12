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
    <main className="mx-auto max-w-6xl px-6 py-12">
      <p className="eyebrow">Admin</p>
      <h1 className="display mt-2">Assessments &amp; surveys</h1>

      {/* Tabs */}
      <div className="mt-6 flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`border-b-2 px-4 py-2 text-sm transition-colors ${
              tab === t.id ? "border-ink-900 text-ink-900" : "border-transparent text-ink-500"
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
