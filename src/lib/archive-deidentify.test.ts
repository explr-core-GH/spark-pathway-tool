import { describe, expect, it } from "vitest";
import {
  Pseudonymizer,
  ageBand,
  deidentifyRow,
  deidentifyTable,
  isDroppedColumn,
  serializeRow,
  sheetName,
} from "./archive-deidentify";

const EXPORT_DATE = new Date("2026-10-12T12:00:00Z");
const STUDENT_A = "11111111-1111-4111-8111-111111111111";
const STUDENT_B = "22222222-2222-4222-8222-222222222222";
const EDUCATOR = "33333333-3333-4333-8333-333333333333";
const SESSION = "44444444-4444-4444-8444-444444444444";

describe("Pseudonymizer", () => {
  it("hands out stable sequential tokens per person kind", () => {
    const p = new Pseudonymizer();
    expect(p.student(STUDENT_A)).toBe("S-0001");
    expect(p.student(STUDENT_B)).toBe("S-0002");
    expect(p.student(STUDENT_A)).toBe("S-0001");
    expect(p.adult(EDUCATOR)).toBe("A-0001");
    expect(p.counts).toEqual({ students: 2, adults: 1 });
  });
});

describe("deidentifyRow", () => {
  it("keeps the same pseudonym for a student across tables", () => {
    const p = new Pseudonymizer();
    const student = deidentifyRow(
      "students",
      { id: STUDENT_A, first_name: "Ada", last_name: "Lovelace", grade: 7 },
      p,
      EXPORT_DATE,
    );
    const session = deidentifyRow(
      "assessment_sessions",
      { id: SESSION, student_id: STUDENT_A, status: "complete" },
      p,
      EXPORT_DATE,
    );
    const response = deidentifyRow(
      "assessment_responses",
      { id: "r1", session_id: SESSION, student_id: STUDENT_A, value: 3 },
      p,
      EXPORT_DATE,
    );
    expect(student.id).toBe("S-0001");
    expect(session.student_id).toBe("S-0001");
    expect(response.student_id).toBe("S-0001");
    // Non-person uuids are untouched.
    expect(session.id).toBe(SESSION);
    expect(response.session_id).toBe(SESSION);
    // Other data survives.
    expect(student.grade).toBe(7);
    expect(session.status).toBe("complete");
  });

  it("uses the adult sequence for educators, admins and *_by columns", () => {
    const p = new Pseudonymizer();
    const edu = deidentifyRow(
      "educators",
      { id: EDUCATOR, full_name: "Grace Hopper", approved: true },
      p,
      EXPORT_DATE,
    );
    const cls = deidentifyRow(
      "classes",
      { id: "c1", educator_id: EDUCATOR, created_by: EDUCATOR, name: "Period 3" },
      p,
      EXPORT_DATE,
    );
    const admin = deidentifyRow("admins", { id: EDUCATOR }, p, EXPORT_DATE);
    expect(edu.id).toBe("A-0001");
    expect(cls.educator_id).toBe("A-0001");
    expect(cls.created_by).toBe("A-0001");
    expect(admin.id).toBe("A-0001");
    expect(cls.id).toBe("c1");
    expect(cls.name).toBe("Period 3");
  });

  it("nulls dropped identifier columns", () => {
    const p = new Pseudonymizer();
    const row = deidentifyRow(
      "camp_student_logins",
      {
        id: "l1",
        child_name: "Sam",
        parent_email: "p@example.org",
        parent_phone: "555-0100",
        emergency_phone: "555-0101",
        username: "sam42",
        password_plain: "otter-7",
        classroom: "Room 4",
        child_age: 11,
      },
      p,
      EXPORT_DATE,
    );
    expect(row.child_name).toBeNull();
    expect(row.parent_email).toBeNull();
    expect(row.parent_phone).toBeNull();
    expect(row.emergency_phone).toBeNull();
    expect(row.username).toBeNull();
    expect(row.password_plain).toBeNull();
    expect(row.classroom).toBe("Room 4");
    expect(row.child_age).toBe(11);
  });

  it("replaces date of birth with an age band and leaves null alone", () => {
    const p = new Pseudonymizer();
    const a = deidentifyRow(
      "students",
      { id: STUDENT_A, date_of_birth: "2013-09-01" },
      p,
      EXPORT_DATE,
    );
    const b = deidentifyRow("students", { id: STUDENT_B, date_of_birth: null }, p, EXPORT_DATE);
    const c = deidentifyRow("explr_registrations", { id: "x", dob: "2013-12-25" }, p, EXPORT_DATE);
    expect(a.date_of_birth).toBe("age 13");
    expect(b.date_of_birth).toBeNull();
    expect(c.dob).toBe("age 12");
  });

  it("leaves null / empty person ids as they are", () => {
    const p = new Pseudonymizer();
    const row = deidentifyRow(
      "camp_student_logins",
      { id: "l1", student_id: null, child_name: "x" },
      p,
      EXPORT_DATE,
    );
    expect(row.student_id).toBeNull();
    expect(p.counts.students).toBe(0);
  });
});

describe("deidentifyTable", () => {
  it("reports which columns were dropped, pseudonymized, banded and left unscrubbed", () => {
    const p = new Pseudonymizer();
    const res = deidentifyTable(
      "students",
      [
        { id: STUDENT_A, first_name: "Ada", date_of_birth: "2012-01-01", notes: "Met Ada's mom" },
        { id: STUDENT_B, first_name: "Bo", date_of_birth: null, notes: null },
      ],
      p,
      EXPORT_DATE,
    );
    expect(res.rows.map((r) => r.id)).toEqual(["S-0001", "S-0002"]);
    expect(res.dropped).toEqual(["first_name"]);
    expect(res.pseudonymized).toEqual(["id"]);
    expect(res.banded).toEqual(["date_of_birth"]);
    expect(res.unscrubbed).toEqual(["notes"]);
    expect(res.rows[0].notes).toBe("Met Ada's mom");
  });
});

describe("helpers", () => {
  it("ageBand computes whole years on the export date", () => {
    expect(ageBand("2013-10-12", EXPORT_DATE)).toBe("age 13");
    expect(ageBand("2013-10-13", EXPORT_DATE)).toBe("age 12");
    expect(ageBand("not a date", EXPORT_DATE)).toBeNull();
    expect(ageBand(null, EXPORT_DATE)).toBeNull();
  });

  it("isDroppedColumn matches the list and any *_phone column", () => {
    expect(isDroppedColumn("email")).toBe(true);
    expect(isDroppedColumn("guardian_phone")).toBe(true);
    expect(isDroppedColumn("grade")).toBe(false);
    expect(isDroppedColumn("session_id")).toBe(false);
  });

  it("serializeRow stringifies jsonb values only", () => {
    const row = serializeRow({
      id: "x",
      responses: { q1: 3, q2: [1, 2] },
      tags: ["a", "b"],
      score: 4.5,
      done: true,
      nothing: null,
    });
    expect(row.responses).toBe('{"q1":3,"q2":[1,2]}');
    expect(row.tags).toBe('["a","b"]');
    expect(row.score).toBe(4.5);
    expect(row.done).toBe(true);
    expect(row.nothing).toBeNull();
  });

  it("sheetName truncates to 31 chars and keeps names unique", () => {
    const used = new Set<string>();
    expect(sheetName("internship_interest_completions", used)).toBe(
      "internship_interest_completions",
    );
    expect(sheetName("internship_interest_completions", used)).toBe(
      "internship_interest_completio~2",
    );
    expect(sheetName("students", used)).toBe("students");
  });
});
