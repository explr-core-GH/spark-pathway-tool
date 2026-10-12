import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, H2 } from "@/components/LegalPage";

const DESC =
  "The terms for using EXPLR Pathways, the Cleveland career-interest assessment run by Cleveland State University and MAGNET.";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — EXPLR Pathways" },
      { name: "description", content: DESC },
      { property: "og:title", content: "Terms of Service — EXPLR Pathways" },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage eyebrow="Terms" title="Terms of Service" effective="October 2, 2026">
      <p className="lead">
        EXPLR Pathways (spark-pathway-tool.lovable.app and any EXPLR domain that points here) is run
        by EXPLR, a partnership of Cleveland State University and MAGNET. By using it you agree to
        these terms.
      </p>

      <H2>1. Who can use it</H2>
      <p>
        Students in grades 4–12 in Cleveland-area schools and EXPLR programs; educators and program
        leaders we have approved; and anyone browsing the public pages. Students under 13 may use
        the assessment only through their school. Students under 18 using it outside a school
        program need a parent or guardian's permission.
      </p>

      <H2>2. Accounts</H2>
      <p>
        Use your own account and keep your sign-in private. Instructor and organization accounts are
        granted only after we verify you, and only for your own students or program. Tell us at
        [CONTACT EMAIL] if you think an account has been misused. We may close accounts that are
        inactive, shared, or used against these terms.
      </p>

      <H2>3. What the assessment is</H2>
      <p>
        The RIASEC assessment gives you a starting point for exploring interests. It is not a
        diagnosis, a prediction, or a verdict about what you can or should do. Instructors should
        use results as one input alongside their own judgment.
      </p>

      <H2>4. Acceptable use</H2>
      <p>
        Do not take the assessment as someone else, share another student's results, try to access
        data that is not yours, scrape the site, or probe its security. Instructors may use student
        profiles only for educational purposes within their school or program and may not export or
        share them outside it.
      </p>

      <H2>5. Program materials</H2>
      <p>
        Lesson resources and program materials provided to approved instructors are owned by EXPLR,
        Cleveland State University, or their licensors. You may use them with your own students and
        programs. You may not sell them, post them publicly, or remove EXPLR attribution. Materials
        marked with an open license may be used under that license.
      </p>

      <H2>6. Student data</H2>
      <p>
        Our{" "}
        <Link to="/privacy" className="ink-link">
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link to="/student-data" className="ink-link">
          Student Data Privacy Statement
        </Link>{" "}
        govern how student data is handled. Where a school district has a written agreement with
        EXPLR, that agreement controls for its students.
      </p>

      <H2>7. Availability</H2>
      <p>
        We may change or pause the tool for maintenance or improvement. We will try to give schools
        notice before any change that affects an active program.
      </p>

      <H2>8. Disclaimer and liability</H2>
      <p>
        The site is provided "as is" without warranties. To the extent Ohio law allows, EXPLR,
        Cleveland State University, MAGNET, and their staff are not liable for indirect or
        consequential damages arising from use of the site. Nothing here waives the sovereign
        immunity of the State of Ohio or Cleveland State University.
      </p>

      <H2>9. Governing law</H2>
      <p>
        Ohio law governs. Claims against Cleveland State University go to the Ohio Court of Claims;
        other disputes go to the courts of Cuyahoga County, Ohio.
      </p>

      <H2>10. Changes</H2>
      <p>Updated terms will be posted here with a new effective date.</p>

      <H2>11. Contact</H2>
      <p>[CONTACT EMAIL] · EXPLR, [MAILING ADDRESS], Cleveland, Ohio</p>
    </LegalPage>
  );
}
