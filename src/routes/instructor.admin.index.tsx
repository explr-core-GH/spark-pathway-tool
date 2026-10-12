import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/instructor/admin/")({
  head: () => ({ meta: [{ title: "Admin — EXPLR" }] }),
  component: AdminHome,
});

type Educator = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  approved: boolean;
};

function AdminHome() {
  const [educators, setEducators] = useState<Educator[]>([]);

  function refresh() {
    supabase
      .from("educators")
      .select("id, full_name, email, role, approved")
      .order("created_at", { ascending: false })
      .then(({ data }) => setEducators((data as Educator[]) ?? []));
  }

  useEffect(() => {
    refresh();
  }, []);

  async function approve(id: string) {
    const { error } = await supabase.from("educators").update({ approved: true }).eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    refresh();
  }

  const pending = educators.filter((e) => !e.approved);
  const active = educators.filter((e) => e.approved);

  return (
    <main className="mx-auto max-w-[1312px] px-4 py-10 sm:px-6 lg:px-8">
      <p className="eyebrow">Admin</p>
      <h1 className="mt-2 font-display text-3xl font-bold">Operations</h1>
      <p className="lead mt-3 max-w-2xl">
        Approve new instructors, send invites, and jump into matching from one place.
      </p>

      <section className="mt-12">
        <h2 className="eyebrow mb-3">Pending approval · {pending.length}</h2>
        {pending.length === 0 ? (
          <p className="rounded-[var(--radius-card)] border border-line bg-paper-raised px-5 py-4 text-sm text-ink-500">
            No pending instructors.
          </p>
        ) : (
          <div className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-paper-raised">
            {pending.map((e) => (
              <div
                key={e.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 text-sm sm:grid sm:grid-cols-[1fr_1fr_auto]"
              >
                <span className="font-medium">{e.full_name}</span>
                <span className="text-ink-500">{e.email}</span>
                <button className="btn-ink text-xs" onClick={() => approve(e.id)}>
                  Approve
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="eyebrow mb-3">Invite instructors &amp; admins</h2>
        <p className="text-sm text-ink-700">
          Create and manage invite links on the dedicated{" "}
          <Link to="/instructor/admin/invites" className="ink-link">
            Invites page
          </Link>{" "}
          ·{" "}
          <Link to="/instructor/admin/matching" className="ink-link">
            Internship matching
          </Link>
          .
        </p>
      </section>

      <section className="mt-12">
        <h2 className="eyebrow mb-3">Active instructors · {active.length}</h2>
        <div className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-paper-raised">
          {active.map((e) => (
            <Link
              key={e.id}
              to="/instructor/admin/educators/$id"
              params={{ id: e.id }}
              className="flex min-h-[44px] flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm first:rounded-t-[var(--radius-card)] last:rounded-b-[var(--radius-card)] hover:bg-paper-sunken sm:grid sm:grid-cols-[1fr_1fr_120px_auto]"
            >
              <span className="font-medium">{e.full_name}</span>
              <span className="text-ink-500">{e.email}</span>
              <span className="text-xs text-ink-500">{e.role}</span>
              <span className="rounded-full bg-mint-tint px-2.5 py-0.5 text-xs font-medium text-green-deep">
                Approved
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
