-- Additive migration: use SQLSTATE P0001 (instead of 40001 serialization_failure)
-- for business-level STOCK_CONFLICT exceptions in public.commit_plan so PostgREST
-- returns HTTP 400 immediately instead of HTTP 503 (which postgrest-js retries).

create or replace function public.commit_plan(p_plan_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_plan public.plans%rowtype;
  v_job public.jobs%rowtype;
  v_expected_stock_count integer := 0;
  v_locked_available_count integer := 0;
  v_dimension_mismatch_count integer := 0;
  v_sheet record;
  v_region jsonb;
  v_created_remnants integer := 0;
  v_sheet_count integer := 0;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED: Active user session required.'
      using errcode = '42501';
  end if;

  -- Lock target plan row
  select *
    into v_plan
    from public.plans
   where id = p_plan_id
     and user_id = v_uid
     for update;

  if not found then
    raise exception 'PLAN_NOT_FOUND: Plan does not exist or belongs to another workshop.'
      using errcode = 'P0002';
  end if;

  if v_plan.status = 'committed' then
    raise exception 'PLAN_ALREADY_COMMITTED: This plan has already been committed.'
      using errcode = '23505';
  end if;

  -- Lock parent job row
  select *
    into v_job
    from public.jobs
   where id = v_plan.job_id
     and user_id = v_uid
     for update;

  if not found then
    raise exception 'JOB_NOT_FOUND: Parent job not found.'
      using errcode = 'P0002';
  end if;

  if v_job.status = 'committed' then
    raise exception 'JOB_ALREADY_COMMITTED: Another plan for this job has already been committed.'
      using errcode = '23505';
  end if;

  select count(*)
    into v_sheet_count
    from public.plan_sheets
   where plan_id = p_plan_id
     and user_id = v_uid;

  if v_sheet_count = 0 then
    raise exception 'EMPTY_PLAN: Cannot commit a plan with zero cutting sheets.'
      using errcode = '22023';
  end if;

  select count(distinct source_stock_id)
    into v_expected_stock_count
    from public.plan_sheets
   where plan_id = p_plan_id
     and user_id = v_uid
     and source_stock_id is not null;

  if v_expected_stock_count > 0 then
    -- Acquire row locks in deterministic UUID order to prevent deadlocks
    perform s.id
       from public.stock_items s
      where s.user_id = v_uid
        and s.id in (
          select ps.source_stock_id
            from public.plan_sheets ps
           where ps.plan_id = p_plan_id
             and ps.user_id = v_uid
             and ps.source_stock_id is not null
        )
      order by s.id
        for update;

    select count(*)
      into v_locked_available_count
      from public.stock_items s
     where s.user_id = v_uid
       and s.state = 'available'
       and s.id in (
         select ps.source_stock_id
           from public.plan_sheets ps
          where ps.plan_id = p_plan_id
            and ps.user_id = v_uid
            and ps.source_stock_id is not null
       );

    if v_locked_available_count <> v_expected_stock_count then
      raise exception 'STOCK_CONFLICT: One or more physical stock items allocated to this plan are no longer available. Generate a fresh plan.'
        using errcode = 'P0001';
    end if;

    select count(*)
      into v_dimension_mismatch_count
      from public.plan_sheets ps
      join public.stock_items s
        on s.id = ps.source_stock_id
       and s.user_id = ps.user_id
     where ps.plan_id = p_plan_id
       and ps.user_id = v_uid
       and (
         s.width_mm <> ps.width_mm
         or s.height_mm <> ps.height_mm
         or s.material_id <> ps.material_id
       );

    if v_dimension_mismatch_count > 0 then
      raise exception 'STOCK_CONFLICT: Physical stock dimensions changed after this plan was generated. Generate a fresh plan.'
        using errcode = 'P0001';
    end if;

    update public.stock_items s
       set state = 'consumed',
           consumed_by_plan_id = p_plan_id,
           updated_at = timezone('utc', now())
     where s.user_id = v_uid
       and s.id in (
         select ps.source_stock_id
           from public.plan_sheets ps
          where ps.plan_id = p_plan_id
            and ps.user_id = v_uid
            and ps.source_stock_id is not null
       );
  end if;

  -- Record qualifying residual rectangles as pending_confirmation remnants
  for v_sheet in
    select id, sheet_index, material_id, unallocated_regions
      from public.plan_sheets
     where plan_id = p_plan_id
       and user_id = v_uid
     order by sheet_index asc
  loop
    for v_region in
      select value
        from jsonb_array_elements(v_sheet.unallocated_regions)
    loop
      if coalesce((v_region->>'reusable')::boolean, false) = true then
        insert into public.stock_items (
          user_id,
          material_id,
          label,
          origin,
          width_mm,
          height_mm,
          state,
          created_from_plan_id,
          created_from_plan_sheet_id,
          notes
        ) values (
          v_uid,
          v_sheet.material_id,
          format(
            'Offcut S%s (%sx%s mm)',
            v_sheet.sheet_index,
            (v_region->>'widthMm')::integer,
            (v_region->>'heightMm')::integer
          ),
          'remnant',
          (v_region->>'widthMm')::integer,
          (v_region->>'heightMm')::integer,
          'pending_confirmation',
          p_plan_id,
          v_sheet.id,
          'Generated from committed plan; measure physically before confirming availability.'
        );
        v_created_remnants := v_created_remnants + 1;
      end if;
    end loop;
  end loop;

  update public.plans
     set status = 'committed',
         committed_at = timezone('utc', now()),
         updated_at = timezone('utc', now())
   where id = p_plan_id
     and user_id = v_uid;

  update public.jobs
     set status = 'committed',
         updated_at = timezone('utc', now())
   where id = v_plan.job_id
     and user_id = v_uid;

  return jsonb_build_object(
    'planId', p_plan_id,
    'jobId', v_plan.job_id,
    'consumedStockCount', v_expected_stock_count,
    'pendingRemnantsCreated', v_created_remnants
  );
end;
$$;

revoke all on function public.commit_plan(uuid) from public, anon;
grant execute on function public.commit_plan(uuid) to authenticated;
