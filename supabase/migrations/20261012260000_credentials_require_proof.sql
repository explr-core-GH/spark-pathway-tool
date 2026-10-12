-- A credential or seal on the passport must link to proof (issuer page,
-- certificate, badge, or transcript). Existing rows without a link get a
-- placeholder so the constraint can be added; the UI now requires the link.
update public.credentials
  set evidence_url = 'https://explrpathways.org/student/credentials#proof-needed'
  where evidence_url is null or length(trim(evidence_url)) = 0;

alter table public.credentials drop constraint if exists credentials_evidence_required;
alter table public.credentials
  add constraint credentials_evidence_required
  check (evidence_url is not null and length(trim(evidence_url)) > 0);

notify pgrst, 'reload schema';
