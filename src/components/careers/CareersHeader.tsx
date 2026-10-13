import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { PortalHeader, SiteHeader, type PortalLink } from "@/components/passport";

const STUDENT_LINKS: PortalLink[] = [
  { label: "My passport", to: "/student" },
  { label: "Opportunities", to: "/opportunities" },
  { label: "Careers", to: "/careers" },
  { label: "Families", to: "/student/pathway", search: { tab: "families" } },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = (t: string): any => (supabase.from as unknown as (n: string) => any)(t);

/** Is the signed-in user a student? (Public careers pages serve everyone.) */
export function useViewer() {
  const { user, loading } = useSession();
  const [isStudent, setIsStudent] = useState(false);
  useEffect(() => {
    if (!user) {
      setIsStudent(false);
      return;
    }
    let active = true;
    sb("students")
      .select("id")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }: { data: { id: string } | null }) => active && setIsStudent(!!data));
    return () => {
      active = false;
    };
  }, [user]);
  return { user, loading, isStudent };
}

/** Public visitors get the site header; signed-in students get the passport portal header. */
export function CareersHeader({ signedIn, isStudent }: { signedIn: boolean; isStudent: boolean }) {
  if (!signedIn) return <SiteHeader />;
  return (
    <PortalHeader
      role={isStudent ? "Student" : undefined}
      links={isStudent ? STUDENT_LINKS : []}
      signedIn
    />
  );
}
