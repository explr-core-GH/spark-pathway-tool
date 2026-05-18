// Roster shared types + helpers. Safe for client and server.

export type RosterUnitType = "camp" | "internship";

export type RosterStudent = {
  name: string;
  grade?: number | string;
  email?: string;
  notes?: string;
};

export type Roster = {
  unitType: RosterUnitType;
  unitSlug: string;
  students: RosterStudent[];
  updatedBy: string | null;
  updatedAt: string | null;
};

// Best-effort CSV / line-list parser. Each non-empty line is one student.
// First field = name. Optional fields = grade, email — comma-separated.
export function parseRosterText(input: string): RosterStudent[] {
  const out: RosterStudent[] = [];
  const lines = input.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const parts = line.split(",").map((p) => p.trim());
    const name = parts[0];
    if (!name) continue;
    const student: RosterStudent = { name };
    for (let i = 1; i < parts.length; i++) {
      const p = parts[i];
      if (!p) continue;
      if (/^\d+$/.test(p) && Number(p) >= 1 && Number(p) <= 12) {
        student.grade = Number(p);
      } else if (p.includes("@")) {
        student.email = p;
      } else if (!student.notes) {
        student.notes = p;
      } else {
        student.notes += `, ${p}`;
      }
    }
    out.push(student);
  }
  return out;
}

export function stringifyRoster(students: RosterStudent[]): string {
  return students
    .map((s) =>
      [s.name, s.grade ?? "", s.email ?? "", s.notes ?? ""]
        .filter(Boolean)
        .join(", "),
    )
    .join("\n");
}
