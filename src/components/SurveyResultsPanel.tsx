import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ALL_CONSTRUCTS, getConstruct, getScale, type ConstructId } from "@/lib/explr-stem";
import { scoreConstruct, type ItemResponseValue } from "@/lib/explr-stem/scoring";

/**
 * SurveyResultsPanel — a student's own STEM (S-STEM) survey results.
 *
 * Scores are computed CLIENT-SIDE from the student's own survey_item_responses
 * (RLS-restricted to their rows) using the validated scoreConstruct() — NOT the
 * survey_scale_scores view, which as a plain view could bypass RLS. Retrospective
 * surveys carry before/after in one sitting; a matched pre + post show as growth.
 */

const sb = (table: string): any => (supabase.from as unknown as (n: string) => any)(table);

type RespRow = {
  id: string;
  assignment_id: string;
  survey_type: string;
  administration: string;
  completed_at: string;
};
type ItemRow = {
  survey_response_id: string;
  item_id: string;
  value_now: number | null;
  value_then: number | null;
  skipped: boolean;
};
type ConstructScore = { id: ConstructId; name: string; max: number; before: number | null; after: number | null };
type ResultCard = {
  key: string;
  title: string;
  growth: boolean;
  beforeLabel?: string;
  afterLabel: string;
  scores: ConstructScore[];
};

const ADMIN_LABEL: Record<string, string> = {
  pre: "Start of program",
  post: "End of program",
  retrospective: "Before & after",
};

function meansFromItems(items: ItemRow[], which: "now" | "then"): Record<string, number | null> {
  const byId: Record<string, ItemResponseValue> = {};
  for (const it of items) {
    byId[it.item_id] = { value: which === "now" ? it.value_now : it.value_then, skipped: it.skipped };
  }
  const out: Record<string, number | null> = {};
  for (const cid of ALL_CONSTRUCTS) out[cid] = scoreConstruct(getConstruct(cid).items, byId);
  return out;
}

export function SurveyResultsPanel({ studentId }: { studentId: string }) {
  const [cards, setCards] = useState<ResultCard[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: resp } = await sb("survey_responses")
        .select("id, assignment_id, survey_type, administration, completed_at")
        .eq("student_id", studentId)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: true });
      const responses = (resp ?? []) as RespRow[];
      if (responses.length === 0) {
        if (!cancelled) setCards([]);
        return;
      }
      const aids = [...new Set(responses.map((r) => r.assignment_id))];
      const rids = responses.map((r) => r.id);
      const [{ data: asg }, { data: items }] = await Promise.all([
        sb("survey_assignments").select("id, title, unit_ref").in("id", aids),
        sb("survey_item_responses")
          .select("survey_response_id, item_id, value_now, value_then, skipped")
          .in("survey_response_id", rids),
      ]);
      if (cancelled) return;

      const meta: Record<string, { title: string; unitRef: string }> = {};
      for (const a of (asg ?? []) as Array<{ id: string; title: string; unit_ref: string }>) {
        meta[a.id] = { title: a.title, unitRef: a.unit_ref };
      }
      const itemsByResp: Record<string, ItemRow[]> = {};
      for (const it of (items ?? []) as ItemRow[]) (itemsByResp[it.survey_response_id] ??= []).push(it);

      // Group a pre + post (or a retrospective) for the same program together.
      const groups: Record<string, RespRow[]> = {};
      for (const r of responses) {
        const ur = meta[r.assignment_id]?.unitRef ?? r.assignment_id;
        (groups[`${r.survey_type}::${ur}`] ??= []).push(r);
      }

      const out: ResultCard[] = [];
      for (const [key, rs] of Object.entries(groups)) {
        const title = meta[rs[0].assignment_id]?.title ?? "STEM survey";
        const retro = rs.find((r) => r.administration === "retrospective");
        const pre = rs.find((r) => r.administration === "pre");
        const post = rs.find((r) => r.administration === "post");

        let before: Record<string, number | null> | null = null;
        let after: Record<string, number | null> | null = null;
        let growth = false;
        let beforeLabel: string | undefined;
        let afterLabel = "Result";

        if (retro) {
          before = meansFromItems(itemsByResp[retro.id] ?? [], "then");
          after = meansFromItems(itemsByResp[retro.id] ?? [], "now");
          growth = true;
          beforeLabel = "Before";
          afterLabel = "After";
        } else if (pre && post) {
          before = meansFromItems(itemsByResp[pre.id] ?? [], "now");
          after = meansFromItems(itemsByResp[post.id] ?? [], "now");
          growth = true;
          beforeLabel = "Start";
          afterLabel = "End";
        } else {
          const only = post ?? pre ?? rs[0];
          after = meansFromItems(itemsByResp[only.id] ?? [], "now");
          afterLabel = ADMIN_LABEL[only.administration] ?? "Result";
        }

        const scores: ConstructScore[] = [];
        for (const cid of ALL_CONSTRUCTS) {
          const b = before?.[cid] ?? null;
          const a = after?.[cid] ?? null;
          if (b == null && a == null) continue;
          scores.push({ id: cid, name: getConstruct(cid).name, max: getScale(getConstruct(cid).scale).max, before: b, after: a });
        }
        if (scores.length > 0) out.push({ key, title, growth, beforeLabel, afterLabel, scores });
      }
      if (!cancelled) setCards(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  if (cards === null) return <p className="mt-3 text-sm text-charcoal-400">Loading survey results…</p>;
  if (cards.length === 0) {
    return (
      <p className="mt-3 text-sm text-charcoal-500">
        No STEM survey results yet — they&rsquo;ll appear here once a survey is finished.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-6">
      {cards.map((card) => (
        <div key={card.key} className="border border-charcoal-100 p-5">
          <p className="font-medium">{card.title}</p>
          <p className="mt-1 text-xs text-charcoal-500">
            {card.growth ? `${card.beforeLabel} → ${card.afterLabel}` : card.afterLabel} ·
            higher means more confidence / interest
          </p>
          <ul className="mt-4 space-y-3">
            {card.scores.map((s) => (
              <li key={s.id}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span>{s.name}</span>
                  <span className="tabular-nums text-charcoal-500">
                    {card.growth && s.before != null ? (
                      <>
                        {s.before.toFixed(1)} →{" "}
                        <span className="font-medium text-ink">{s.after?.toFixed(1) ?? "—"}</span> / {s.max}
                      </>
                    ) : (
                      <>{s.after?.toFixed(1) ?? "—"} / {s.max}</>
                    )}
                  </span>
                </div>
                <div className="relative mt-1 h-1.5 bg-charcoal-100">
                  {card.growth && s.before != null && (
                    <div
                      className="absolute left-0 top-0 h-1.5 bg-charcoal-300"
                      style={{ width: `${Math.min(100, (s.before / s.max) * 100)}%` }}
                    />
                  )}
                  <div
                    className="absolute left-0 top-0 h-1.5"
                    style={{ width: `${Math.min(100, ((s.after ?? 0) / s.max) * 100)}%`, background: "var(--color-explr-500)" }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
