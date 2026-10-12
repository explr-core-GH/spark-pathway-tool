import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, H2, List } from "@/components/LegalPage";

const DESC =
  "How EXPLR Pathways collects, uses, protects, and deletes student, instructor, and organization data under Ohio and federal student privacy law.";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — EXPLR Pathways" },
      { name: "description", content: DESC },
      { property: "og:title", content: "Privacy Policy — EXPLR Pathways" },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage eyebrow="Privacy" title="Privacy Policy" effective="October 2, 2026">
      <p className="lead">
        EXPLR Pathways is a career-interest assessment for Cleveland K-12 students, run by EXPLR, a
        partnership of Cleveland State University and MAGNET. We collect the minimum needed to
        produce a useful interest profile, and we handle student data under Ohio and federal student
        privacy law.
      </p>

      <H2>What we collect</H2>
      <p>
        <strong>Students.</strong> Your first name, grade level, your answers to the assessment, and
        the Holland code we calculate from them. If you create an account, your email address. We do
        not ask for your last name, home address, phone number, or date of birth. If your instructor
        assigns one, we also keep your answers to the STEM efficacy survey (including written
        answers and optional background questions such as grade, gender, and race or ethnicity). If
        you are in a camp or internship, we keep which program you are in, the username and password
        your program gave you, and your program progress. If you apply for an internship, we keep
        your application answers, the internships you picked, and the decision. If you complete an
        internship, we keep your supervisor's ratings, comments, whether they recommend you, and any
        recommendation letter we prepare for you. While you are signed in, we record which page you
        are on and when you were last active so your instructor can help you in real time.
      </p>
      <p>
        <strong>Parents and guardians.</strong> When you register a child for an EXPLR camp, we
        receive your child's name and age and your name, email, and phone number so we can set up
        the camp roster and student sign-in.
      </p>
      <p>
        <strong>Instructors and program leaders.</strong> Your name, email, school or organization,
        and role. We use these to verify you before granting access to rosters and student profiles.
        We also keep your program type, the grade levels you teach, and your approximate roster
        size.
      </p>
      <p>
        <strong>Organizations.</strong> If your organization lists opportunities, we keep its name,
        website, logo, and a contact name and email, plus the contact details students give when
        they sign up for your opportunity.
      </p>
      <p>
        <strong>Everyone.</strong> Our hosting providers keep standard technical logs (IP address,
        browser, pages visited) for security and debugging. We do not use advertising trackers or
        analytics cookies.
      </p>

      <H2>Students under 13</H2>
      <p>
        Students under 13 use EXPLR Pathways through their school. The school provides consent on
        the parent's behalf, as the Children's Online Privacy Protection Act (COPPA) allows for
        educational tools. We do not knowingly collect information from a child under 13 outside a
        school program. If that has happened, email support@explr.cc and we will delete it.
      </p>

      <H2>How we use student data</H2>
      <p>Only to:</p>
      <List
        items={[
          "Produce the student's career-interest report",
          "Match the student to EXPLR programs (camps, robotics, internships) by grade and interest",
          "Show approved instructors aggregate, program-level results for their students",
        ]}
      />
      <p>
        We never sell student data, share it with advertisers, use it for targeted advertising, or
        build profiles for any purpose other than the student's own report.
      </p>

      <H2>Who can see student data</H2>
      <List
        items={[
          "The student",
          "Approved instructors at the student's school or program, for their own students",
          "EXPLR staff who maintain the tool, under confidentiality obligations",
          "Cleveland State University and MAGNET for program administration and grant reporting, in aggregate wherever possible",
          "Authorities when the law requires it or a person's safety is at risk",
        ]}
      />
      <p>
        When a school district uses EXPLR Pathways under a contract, that district owns the records
        created under it. Camp registrations, attendance, and rosters are different: parents
        register for camps directly with EXPLR, so those are EXPLR program records under this
        policy, not district records. See our{" "}
        <Link to="/student-data" className="ink-link">
          Student Data Privacy Statement
        </Link>
        .
      </p>

      <H2>Deletion</H2>
      <p>
        Student records are scheduled for deletion 24 months after they are created. Students,
        parents, or schools may ask for earlier deletion at any time by emailing support@explr.cc;
        we complete it within 30 days. Records belonging to a district under contract are returned
        or destroyed as the contract requires, and within 90 days of the contract's end.
      </p>

      <H2>Security</H2>
      <p>
        Data is encrypted in transit and at rest. Access is role-based: students see only their own
        results, instructors see only their own students. EXPLR staff and interns with database
        access sign confidentiality agreements. If a breach affects student data, we notify affected
        schools promptly with everything they need to meet Ohio's breach-notice law (R.C. 1347.12).
      </p>

      <H2>Services we rely on</H2>
      <List
        items={[
          "Lovable — app hosting — request logs, app content.",
          "Supabase — database and sign-in — account and assessment data.",
        ]}
      />
      <p>No other third party receives student data.</p>

      <H2>Your rights</H2>
      <p>
        Students and parents can see, correct, or delete their data by emailing support@explr.cc.
        Parents of students in a district program may also exercise FERPA rights through the school.
        Instructors and organizations can update or close their accounts the same way.
      </p>

      <H2>Changes</H2>
      <p>
        We will post changes here with a new effective date and notify partner schools of material
        changes affecting student data.
      </p>

      <H2>Contact</H2>
      <p>support@explr.cc · EXPLR, [MAILING ADDRESS], Cleveland, Ohio</p>
    </LegalPage>
  );
}
