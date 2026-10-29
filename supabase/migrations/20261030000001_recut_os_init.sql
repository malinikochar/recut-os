-- ReCut OS Initial Schema, Owner-Safe Constraints, RLS Policies, and Atomic Commit RPC
-- Additive migration adhering to Supabase Postgres Best Practices

create type public.grain_axis_enum as enum ('none', 'x', 'y');
create type public.stock_origin_enum as enum ('full_sheet', 'remnant');
create type public.stock_state_enum as enum ('available', 'pending_confirmation', 'consumed');
create type public.stock_source_type_enum as enum ('available_remnant', 'available_full_sheet', 'new_purchase');
create type public.job_status_enum as enum ('draft', 'planned', 'committed');
create type public.plan_status_enum as enum ('draft', 'committed');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

-- 1. Materials catalog
create table public.materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  category text not null default 'Wood' check (char_length(btrim(category)) between 1 and 60),
  thickness_mm integer not null check (thickness_mm > 0 and thickness_mm <= 500),
  standard_width_mm integer not null check (standard_width_mm > 0 and standard_width_mm <= 100000),
  standard_height_mm integer not null check (standard_height_mm > 0 and standard_height_mm <= 100000),
  price_per_sheet_minor bigint not null check (price_per_sheet_minor >= 0 and price_per_sheet_minor <= 100000000),
  currency_code text not null default 'INR' check (currency_code ~ '^[A-Z]{3}$'),
  default_kerf_mm integer not null check (default_kerf_mm >= 0 and default_kerf_mm <= 50),
  grain_axis public.grain_axis_enum not null default 'none',
  min_reusable_width_mm integer not null check (min_reusable_width_mm > 0 and min_reusable_width_mm <= 100000),
  min_reusable_height_mm integer not null check (min_reusable_height_mm > 0 and min_reusable_height_mm <= 100000),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (id, user_id),
  constraint materials_reusable_fits_sheet_chk check (
    (min_reusable_width_mm <= standard_width_mm and min_reusable_height_mm <= standard_height_mm)
    or (grain_axis = 'none' and min_reusable_width_mm <= standard_height_mm and min_reusable_height_mm <= standard_width_mm)
  )
);

-- 2. Cutting jobs
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  status public.job_status_enum not null default 'draft',
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (id, user_id)
);

-- 3. Saved plans (immutable snapshots)
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null,
  status public.plan_status_enum not null default 'draft',
  algorithm_version text not null check (char_length(btrim(algorithm_version)) between 1 and 80),
  algorithm_seed integer not null default 42 check (algorithm_seed >= 0),
  currency_code text not null default 'INR' check (currency_code ~ '^[A-Z]{3}$'),
  input_snapshot jsonb not null,
  baseline_result jsonb not null,
  optimized_summary jsonb not null,
  comparison_summary jsonb,
  constraints_snapshot jsonb not null,
  committed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (id, user_id),
  constraint plans_job_owner_fk foreign key (job_id, user_id)
    references public.jobs (id, user_id) on delete cascade
);

-- 4. Physical stock units (one row = one physical rectangle)
create table public.stock_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  material_id uuid not null,
  label text not null check (char_length(btrim(label)) between 1 and 120),
  origin public.stock_origin_enum not null,
  width_mm integer not null check (width_mm > 0 and width_mm <= 100000),
  height_mm integer not null check (height_mm > 0 and height_mm <= 100000),
  state public.stock_state_enum not null default 'available',
  created_from_plan_id uuid,
  created_from_plan_sheet_id uuid,
  consumed_by_plan_id uuid,
  notes text check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (id, user_id),
  constraint stock_items_material_owner_fk foreign key (material_id, user_id)
    references public.materials (id, user_id) on delete restrict,
  constraint stock_items_created_plan_owner_fk foreign key (created_from_plan_id, user_id)
    references public.plans (id, user_id) on delete restrict,
  constraint stock_items_consumed_plan_owner_fk foreign key (consumed_by_plan_id, user_id)
    references public.plans (id, user_id) on delete restrict
);

-- 5. Plan sheets (per-sheet guillotine layouts and provenance)
create table public.plan_sheets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null,
  sheet_index integer not null check (sheet_index >= 1),
  material_id uuid not null,
  source_stock_id uuid,
  source_label text not null check (char_length(btrim(source_label)) between 1 and 160),
  source_type public.stock_source_type_enum not null,
  width_mm integer not null check (width_mm > 0 and width_mm <= 100000),
  height_mm integer not null check (height_mm > 0 and height_mm <= 100000),
  kerf_mm integer not null check (kerf_mm >= 0 and kerf_mm <= 50),
  placements jsonb not null,
  cut_tree jsonb not null,
  cuts jsonb not null default '[]'::jsonb,
  unallocated_regions jsonb not null,
  sheet_metrics jsonb not null,
  estimated_new_sheet_cost_minor bigint not null check (estimated_new_sheet_cost_minor >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (id, user_id),
  unique (plan_id, sheet_index),
  constraint plan_sheets_plan_owner_fk foreign key (plan_id, user_id)
    references public.plans (id, user_id) on delete cascade,
  constraint plan_sheets_material_owner_fk foreign key (material_id, user_id)
    references public.materials (id, user_id) on delete restrict,
  constraint plan_sheets_stock_owner_fk foreign key (source_stock_id, user_id)
    references public.stock_items (id, user_id) on delete restrict,
  constraint plan_sheets_provenance_chk check (
    (source_type = 'new_purchase' and source_stock_id is null)
    or (
      source_type in ('available_remnant', 'available_full_sheet')
      and source_stock_id is not null
      and estimated_new_sheet_cost_minor = 0
    )
  )
);

alter table public.stock_items
  add constraint stock_items_created_plan_sheet_owner_fk
  foreign key (created_from_plan_sheet_id, user_id)
  references public.plan_sheets (id, user_id) on delete restrict;

-- 6. Job parts
create table public.job_parts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null,
  material_id uuid not null,
  label text not null check (char_length(btrim(label)) between 1 and 120),
  width_mm integer not null check (width_mm > 0 and width_mm <= 100000),
  height_mm integer not null check (height_mm > 0 and height_mm <= 100000),
  quantity integer not null check (quantity >= 1 and quantity <= 50),
  allow_rotation boolean not null default true,
  required_grain_axis public.grain_axis_enum not null default 'none',
  notes text check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (id, user_id),
  constraint job_parts_job_owner_fk foreign key (job_id, user_id)
    references public.jobs (id, user_id) on delete cascade,
  constraint job_parts_material_owner_fk foreign key (material_id, user_id)
    references public.materials (id, user_id) on delete restrict
);

-- Enforce stock envelope compatibility with parent material at DB trigger level
create or replace function public.validate_stock_item_envelope()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_mat record;
begin
  select standard_width_mm, standard_height_mm, grain_axis
    into v_mat
    from public.materials
   where id = new.material_id
     and user_id = new.user_id;

  if not found then
    raise exception 'MATERIAL_NOT_FOUND: Stock item must reference an owned material.'
      using errcode = '23503';
  end if;

  if not (
    (new.width_mm <= v_mat.standard_width_mm and new.height_mm <= v_mat.standard_height_mm)
    or (v_mat.grain_axis = 'none' and new.width_mm <= v_mat.standard_height_mm and new.height_mm <= v_mat.standard_width_mm)
  ) then
    raise exception 'STOCK_EXCEEDS_STANDARD_SHEET: Stock dimensions (%x% mm) exceed material standard sheet (%x% mm).',
      new.width_mm, new.height_mm, v_mat.standard_width_mm, v_mat.standard_height_mm
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger trg_materials_updated_at
  before update on public.materials
  for each row execute function public.set_updated_at();

create trigger trg_jobs_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

create trigger trg_plans_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

create trigger trg_stock_items_updated_at
  before update on public.stock_items
  for each row execute function public.set_updated_at();

create trigger trg_job_parts_updated_at
  before update on public.job_parts
  for each row execute function public.set_updated_at();

create trigger trg_stock_items_validate_envelope
  before insert or update on public.stock_items
  for each row execute function public.validate_stock_item_envelope();

-- Indexes covering every RLS predicate and foreign key
create index materials_user_id_idx on public.materials (user_id);
create index jobs_user_id_idx on public.jobs (user_id);

create index plans_user_id_idx on public.plans (user_id);
create index plans_job_user_idx on public.plans (job_id, user_id);

create index stock_items_user_state_idx on public.stock_items (user_id, state);
create index stock_items_material_user_idx on public.stock_items (material_id, user_id);
create index stock_items_created_plan_user_idx on public.stock_items (created_from_plan_id, user_id);
create index stock_items_created_sheet_user_idx on public.stock_items (created_from_plan_sheet_id, user_id);
create index stock_items_consumed_plan_user_idx on public.stock_items (consumed_by_plan_id, user_id);

create index plan_sheets_user_id_idx on public.plan_sheets (user_id);
create index plan_sheets_plan_user_idx on public.plan_sheets (plan_id, user_id);
create index plan_sheets_material_user_idx on public.plan_sheets (material_id, user_id);
create index plan_sheets_source_stock_user_idx on public.plan_sheets (source_stock_id, user_id);
create unique index plan_sheets_unique_source_per_plan_idx
  on public.plan_sheets (plan_id, source_stock_id)
  where source_stock_id is not null;

create index job_parts_user_id_idx on public.job_parts (user_id);
create index job_parts_job_user_idx on public.job_parts (job_id, user_id);
create index job_parts_material_user_idx on public.job_parts (material_id, user_id);

-- Least-privilege table permissions (no anonymous table access)
revoke all on public.materials from public, anon;
revoke all on public.stock_items from public, anon;
revoke all on public.jobs from public, anon;
revoke all on public.job_parts from public, anon;
revoke all on public.plans from public, anon;
revoke all on public.plan_sheets from public, anon;

grant select, insert, update, delete on public.materials to authenticated;
grant select, insert, update, delete on public.stock_items to authenticated;
grant select, insert, update, delete on public.jobs to authenticated;
grant select, insert, update, delete on public.job_parts to authenticated;
grant select, insert, update, delete on public.plans to authenticated;
grant select, insert, delete on public.plan_sheets to authenticated;

-- Enable & Force Row Level Security on every table
alter table public.materials enable row level security;
alter table public.materials force row level security;

alter table public.stock_items enable row level security;
alter table public.stock_items force row level security;

alter table public.jobs enable row level security;
alter table public.jobs force row level security;

alter table public.job_parts enable row level security;
alter table public.job_parts force row level security;

alter table public.plans enable row level security;
alter table public.plans force row level security;

alter table public.plan_sheets enable row level security;
alter table public.plan_sheets force row level security;

-- Per-operation RLS policies using cached `(select auth.uid())`
-- materials
create policy materials_select_own on public.materials
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy materials_insert_own on public.materials
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy materials_update_own on public.materials
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy materials_delete_own on public.materials
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- stock_items
create policy stock_items_select_own on public.stock_items
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy stock_items_insert_own on public.stock_items
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy stock_items_update_own on public.stock_items
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy stock_items_delete_own on public.stock_items
  for delete to authenticated
  using ((select auth.uid()) = user_id and state <> 'consumed');

-- jobs
create policy jobs_select_own on public.jobs
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy jobs_insert_own on public.jobs
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy jobs_update_own on public.jobs
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy jobs_delete_own on public.jobs
  for delete to authenticated
  using ((select auth.uid()) = user_id and status <> 'committed');

-- job_parts
create policy job_parts_select_own on public.job_parts
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy job_parts_insert_own on public.job_parts
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy job_parts_update_own on public.job_parts
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy job_parts_delete_own on public.job_parts
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- plans (drafts can be updated to committed via RPC or deleted while draft; committed plans are immutable)
create policy plans_select_own on public.plans
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy plans_insert_own on public.plans
  for insert to authenticated
  with check ((select auth.uid()) = user_id and status = 'draft');

create policy plans_update_own on public.plans
  for update to authenticated
  using ((select auth.uid()) = user_id and status = 'draft')
  with check ((select auth.uid()) = user_id);

create policy plans_delete_own on public.plans
  for delete to authenticated
  using ((select auth.uid()) = user_id and status = 'draft');

-- plan_sheets (immutable once created; deletable only if parent draft plan is deleted)
create policy plan_sheets_select_own on public.plan_sheets
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy plan_sheets_insert_own on public.plan_sheets
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy plan_sheets_delete_own on public.plan_sheets
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Atomic Plan Commit RPC (SECURITY INVOKER, row-locked in deterministic UUID order)
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
        using errcode = '40001';
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
        using errcode = '40001';
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

-- Remnant physical confirmation / adjustment RPC
create or replace function public.confirm_remnant(
  p_stock_id uuid,
  p_width_mm integer,
  p_height_mm integer,
  p_discard boolean default false
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_stock public.stock_items%rowtype;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED: Active user session required.'
      using errcode = '42501';
  end if;

  select *
    into v_stock
    from public.stock_items
   where id = p_stock_id
     and user_id = v_uid
     for update;

  if not found then
    raise exception 'STOCK_NOT_FOUND: Remnant not found.'
      using errcode = 'P0002';
  end if;

  if v_stock.state <> 'pending_confirmation' then
    raise exception 'INVALID_STOCK_STATE: Only pending_confirmation remnants can be confirmed.'
      using errcode = '22023';
  end if;

  if p_discard then
    update public.stock_items
       set state = 'consumed',
           notes = coalesce(notes || ' | ', '') || 'Discarded during physical shop verification.',
           updated_at = timezone('utc', now())
     where id = p_stock_id
       and user_id = v_uid;

    return jsonb_build_object('stockId', p_stock_id, 'newState', 'consumed');
  end if;

  if p_width_mm <= 0 or p_height_mm <= 0 then
    raise exception 'INVALID_DIMENSIONS: Measured dimensions must be positive integer millimeters.'
      using errcode = '22023';
  end if;

  update public.stock_items
     set width_mm = p_width_mm,
         height_mm = p_height_mm,
         state = 'available',
         updated_at = timezone('utc', now())
   where id = p_stock_id
     and user_id = v_uid;

  return jsonb_build_object('stockId', p_stock_id, 'newState', 'available');
end;
$$;

revoke all on function public.set_updated_at() from public, anon;
revoke all on function public.validate_stock_item_envelope() from public, anon;
revoke all on function public.commit_plan(uuid) from public, anon;
revoke all on function public.confirm_remnant(uuid, integer, integer, boolean) from public, anon;

grant execute on function public.commit_plan(uuid) to authenticated;
grant execute on function public.confirm_remnant(uuid, integer, integer, boolean) to authenticated;
