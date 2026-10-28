import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, List } from "@/components/LegalPage";

const DESC =
  "How EXPLR Pathways meets Ohio Senate Bill 29 (R.C. 3319.325–3319.327) as a technology provider for school districts.";

export const Route = createFileRoute("/student-data")({
  head: () => ({
    meta: [
      { title: "Student Data Privacy Statement (Ohio SB 29) — EXPLR Pathways" },
      { name: "description", content: DESC },
      { property: "og:title", content: "Student Data Privacy Statement — EXPLR Pathways" },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StudentDataPage,
});

function StudentDataPage() {
  return (
    <LegalPage eyebrow="Ohio Senate Bill 29" title="Student Data Privacy Statement">
      <p className="lead">
        When a school district uses EXPLR Pathways under a contract, EXPLR is a "technology
        provider" under Ohio Revised Code 3319.325–3319.327 (Senate Bill 29, effective October 24,
        2024). For every district we work with:
      </p>
      <List
        items={[
          <>
            <strong>The district owns the records it creates with us.</strong> Student names, grade
            levels, dates of birth, class rosters, assessment responses, and Holland codes created
            under the contract are the district's educational records, not EXPLR's. The same goes
            for survey answers (including written answers and optional background questions),
            checkpoints and Student Success Plans, experiences and supervisor ratings logged through
            a district program, internship applications, recommendation letters, and records of when
            students were active in the tool.
          </>,
          <>
            <strong>Camp records are EXPLR's, not the district's.</strong> Camp registrations,
            attendance, rosters, and camp sign-in cards come from EXPLR's own camp registration
            platform, where a parent or guardian registers their child directly with EXPLR. Those
            are EXPLR program records held under that parent's registration and our{" "}
            <Link to="/privacy" className="ink-link">
              privacy policy
            </Link>
            , not a district's records under Senate Bill 29, even when the same child also uses
            Pathways through a district contract. They are never shared with a district without the
            parent's consent.
          </>,
          <>
            <strong>Limited use.</strong> We use them only to produce student reports, match
            students to programs, and show the district's instructors aggregate results. We do not
            sell, share, or disseminate them, use them for advertising, or build student profiles
            for any other purpose. We may use de-identified aggregate data to maintain and improve
            the tool.
          </>,
          <>
            <strong>Return or destruction.</strong> When the contract ends we return or destroy the
            district's records within 90 days, or sooner if the contract requires, and certify that
            we did. Independent of any contract, all student records are scheduled for deletion 24
            months after creation.
          </>,
          <>
            <strong>Access controls.</strong> Only EXPLR staff and interns who maintain the tool can
            access student records, under signed confidentiality agreements and FERPA training.
          </>,
          <>
            <strong>Security.</strong> Encryption in transit and at rest, role-based access, and the
            safeguards in our{" "}
            <Link to="/privacy" className="ink-link">
              Privacy Policy
            </Link>
            .
          </>,
          <>
            <strong>Breach notice.</strong> If a breach affects a district's records, we give the
            district everything it needs to meet R.C. 1347.12, promptly after discovery.
          </>,
          <>
            <strong>No device monitoring.</strong> EXPLR Pathways does not track location, access
            cameras or microphones, or monitor keystrokes or browsing on school-issued devices.
          </>,
          <>
            <strong>Contract inspection.</strong> Parents and eligible students may review our
            contract with their district by contacting the district.
          </>,
        ]}
      />
      <p>
        We will sign the Ohio Student Data Privacy Agreement (SDPC NDPA) with any district that
        prefers it. Questions: [CONTACT EMAIL].
      </p>
    </LegalPage>
  );
}
