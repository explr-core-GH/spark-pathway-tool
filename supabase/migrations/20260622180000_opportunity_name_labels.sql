-- Use type-appropriate labels for the opportunity name field instead of the
-- generic "Event name". Only touches rows still at the seeded default, so
-- admin-customized labels are preserved.

update public.opportunity_form_fields set label = 'Camp name'
  where field_key = 'name' and opportunity_type = 'camp' and label = 'Event name';
update public.opportunity_form_fields set label = 'Workshop name'
  where field_key = 'name' and opportunity_type = 'workshop' and label = 'Event name';
update public.opportunity_form_fields set label = 'Internship name'
  where field_key = 'name' and opportunity_type = 'internship' and label = 'Event name';
update public.opportunity_form_fields set label = 'Program name'
  where field_key = 'name' and opportunity_type = 'ongoing' and label = 'Event name';

notify pgrst, 'reload schema';
