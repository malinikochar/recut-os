-- Reference pgTAP / SQL verification suite for Supabase RLS and atomic plan commit
begin;

-- Verify RLS is enabled and forced on all 6 ReCut OS tables
do $$
declare
  v_unprotected integer;
begin
  select count(*)
    into v_unprotected
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname in ('materials', 'stock_items', 'jobs', 'job_parts', 'plans', 'plan_sheets')
     and (c.relrowsecurity is distinct from true or c.relforcerowsecurity is distinct from true);

  if v_unprotected > 0 then
    raise exception 'Expected all 6 public tables to have RLS enabled and forced, found % unprotected.', v_unprotected;
  end if;
end;
$$;

rollback;
