import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const OPP_PREFIX = "opp:";

const RUBRIC_LABELS: Record<string, string> = {
  attendance: "attendance and punctuality",
  professionalism: "professionalism and attitude",
  communication: "communication skills",
  teamwork: "teamwork and collaboration",
  directions_safety: "following directions and workplace safety",
  initiative: "initiative and work ethic",
  quality: "quality of work",
};

export type LetterInput = {
  internshipRef: string;
  studentId: string;
  evaluatorId: string;
};

export type GeneratedLetter = {
  studentName: string;
  internshipName: string;
  evaluatorName: string;
  bodyParagraphs: string[];
  error?: string;
};

async function draftLetter(args: {
  studentName: string;
  internshipName: string;
  evaluatorName: string;
  strengths: string[];
  notes: string | null;
  recommend: boolean;
}): Promise<string[]> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");

  const prompt = `Write a warm, professional letter of recommendation body (no salutation, no signature — those are added separately) for a high school intern based on their summer internship at Cleveland State University (CSU) through the EXPLR program.

Student first name: ${args.studentName}
Internship program: ${args.internshipName}
Evaluating supervisor: ${args.evaluatorName}
Willing to recommend: ${args.recommend ? "Yes" : "Reservedly"}
Top-rated strengths (5 out of 5 or 4 out of 5): ${args.strengths.length ? args.strengths.join("; ") : "consistent effort across job-skill areas"}
Supervisor notes: ${args.notes ?? "(none)"}

Requirements:
- 3 short paragraphs, plain prose, no bullet lists, no headers.
- Paragraph 1: introduce the student, the internship program, and CSU / EXPLR context.
- Paragraph 2: highlight the strongest 2–3 job-skill strengths using specific language (draw from supervisor notes when available). Be genuine, not gushy.
- Paragraph 3: state the recommendation and invite the reader to reach out for more information.
- No placeholders like [Name]. Use the student's first name only.
- Do not fabricate specific achievements not implied by the strengths or notes.
- Output ONLY the letter body paragraphs separated by a single blank line. No preamble.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({
      model: "google/gemini-3.6-flash",
      messages: [
        {
          role: "system",
          content:
            "You draft concise, credible recommendation letters for high school interns. Never invent facts.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI gateway ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim() ?? "";
  return content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export const generateRecommendationLetters = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { items: LetterInput[] }) => {
      if (!input || !Array.isArray(input.items) || input.items.length === 0) {
        throw new Error("Select at least one intern");
      }
      if (input.items.length > 40) {
        throw new Error("Please generate 40 or fewer letters at a time");
      }
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Admin check
    const { data: adminRow } = await supabase
      .from("admins")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (!adminRow) throw new Error("Forbidden: admin only");

    const results: GeneratedLetter[] = [];

    // Preload lookup sets
    const studentIds = [...new Set(data.items.map((i) => i.studentId))];
    const evaluatorIds = [...new Set(data.items.map((i) => i.evaluatorId))];
    const refs = [...new Set(data.items.map((i) => i.internshipRef))];

    const [studentsRes, educatorsRes, internshipsRes] = await Promise.all([
      supabase.from("students").select("id, first_name").in("id", studentIds),
      supabase.from("educators").select("id, full_name").in("id", evaluatorIds),
      supabase
        .from("internships")
        .select("slug, name")
        .in("slug", refs.filter((r) => !r.startsWith(OPP_PREFIX))),
    ]);

    const studentName: Record<string, string> = {};
    for (const s of studentsRes.data ?? []) studentName[s.id] = s.first_name ?? "Student";
    const educatorName: Record<string, string> = {};
    for (const e of educatorsRes.data ?? []) educatorName[e.id] = e.full_name ?? "Supervisor";
    const internshipName: Record<string, string> = {};
    for (const i of internshipsRes.data ?? []) internshipName[i.slug] = i.name ?? i.slug;

    // Opportunity-based internships
    const oppIds = refs
      .filter((r) => r.startsWith(OPP_PREFIX))
      .map((r) => r.slice(OPP_PREFIX.length));
    if (oppIds.length) {
      const { data: opps } = await (supabase.from as unknown as (n: string) => any)(
        "opportunities",
      )
        .select("id, name")
        .in("id", oppIds);
      for (const o of (opps ?? []) as Array<{ id: string; name: string | null }>) {
        internshipName[`${OPP_PREFIX}${o.id}`] = o.name ?? "Internship";
      }
    }

    for (const item of data.items) {
      const sName = studentName[item.studentId] ?? "Student";
      const iName = internshipName[item.internshipRef] ?? item.internshipRef;
      const eName = educatorName[item.evaluatorId] ?? "Supervisor";

      try {
        const { data: evalRow, error: evalErr } = await (
          supabase.from as unknown as (n: string) => any
        )("internship_evaluations")
          .select("rubric, recommend, notes")
          .eq("internship_ref", item.internshipRef)
          .eq("student_id", item.studentId)
          .eq("evaluator_id", item.evaluatorId)
          .maybeSingle();

        if (evalErr) throw new Error(evalErr.message);
        if (!evalRow) throw new Error("No evaluation found");

        const rubric = (evalRow.rubric ?? {}) as Record<string, number>;
        const strengths = Object.entries(rubric)
          .filter(([, v]) => v >= 4)
          .sort((a, b) => b[1] - a[1])
          .map(([k]) => RUBRIC_LABELS[k] ?? k);

        const paragraphs = await draftLetter({
          studentName: sName,
          internshipName: iName,
          evaluatorName: eName,
          strengths,
          notes: (evalRow.notes ?? null) as string | null,
          recommend: Boolean(evalRow.recommend),
        });

        results.push({
          studentName: sName,
          internshipName: iName,
          evaluatorName: eName,
          bodyParagraphs: paragraphs,
        });
      } catch (err) {
        results.push({
          studentName: sName,
          internshipName: iName,
          evaluatorName: eName,
          bodyParagraphs: [],
          error: err instanceof Error ? err.message : "Failed to draft letter",
        });
      }
    }

    return { letters: results };
  });
