-- ============================================================================
-- Loan Manager — schema
-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- Safe to re-run: every statement is idempotent.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- projects — the top-level grouping. All data is sorted by project.
-- ---------------------------------------------------------------------------
create table if not exists projects (
    id          uuid primary key default gen_random_uuid(),
    name        text        not null,
    description text,
    status      text        not null default 'active'
                            check (status in ('active', 'completed', 'archived')),
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

-- Migration for databases created before start_date/end_date were dropped.
alter table projects drop column if exists start_date;
alter table projects drop column if exists end_date;

-- ---------------------------------------------------------------------------
-- Migration: items move from a shared catalogue to per-project records with
-- Type/Model/Status/Location taken from user-managed lookup lists, and units
-- are folded into the more general "locations" concept (a location can be a
-- borrowing unit, a warehouse, etc). This drops the old shapes of these
-- tables. At the time this migration was written the only data affected was
-- disposable demo/test rows, never real loan history.
-- ---------------------------------------------------------------------------
drop table if exists feedback cascade;
drop table if exists loans cascade;
drop table if exists items cascade;
drop table if exists units cascade;

-- ---------------------------------------------------------------------------
-- item_types / item_models / item_statuses — the option lists behind the
-- Type / Model / Status dropdowns on an item. Managed from the Settings page.
-- A model belongs to exactly one type, so picking a type narrows the model
-- dropdown to that type's models.
-- ---------------------------------------------------------------------------
create table if not exists item_types (
    id         uuid primary key default gen_random_uuid(),
    name       text        not null unique,
    created_at timestamptz not null default now()
);

create table if not exists item_models (
    id         uuid primary key default gen_random_uuid(),
    type_id    uuid        not null references item_types(id) on delete restrict,
    name       text        not null,
    created_at timestamptz not null default now(),
    unique (type_id, name)
);

create table if not exists item_statuses (
    id         uuid primary key default gen_random_uuid(),
    name       text        not null unique,
    created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- locations — everywhere an item or loan can point to: a borrowing unit
-- (kind='יחידה', grouped by category/brigade/battalion), a warehouse, or
-- anywhere else. Replaces the old standalone "units" table. Managed from
-- Settings.
--
-- category is the outermost grouping (סדיר קחצ״ר, כלל צה״לי, בא״חים, …).
-- It is not decoration: the same brigade can sit under two categories —
-- 1- גולני, 35- צנחנים, 84- גבעתי, 900- כפיר, 933- נחל and הנדסה קרבית
-- each appear twice — so (category, brigade, battalion) is what actually
-- identifies a unit, and brigade alone does not.
-- ---------------------------------------------------------------------------
create table if not exists locations (
    id            uuid primary key default gen_random_uuid(),
    name          text        not null,
    kind          text,
    category      text,
    brigade       text,
    battalion     text,
    contact_name  text,
    contact_phone text,
    notes         text,
    created_at    timestamptz not null default now()
);

-- Migration for databases created before locations.category existed.
alter table locations add column if not exists category text;

-- ---------------------------------------------------------------------------
-- contacts — named people at a location who can sign for a loan. A location
-- can have any number of them; unlike locations.contact_name/contact_phone
-- (a single freeform "who to call" note), these are the individually
-- selectable people the loans.signer_contact_id below points at.
-- ---------------------------------------------------------------------------
create table if not exists contacts (
    id              uuid primary key default gen_random_uuid(),
    location_id     uuid        not null references locations(id) on delete cascade,
    full_name       text        not null,
    personal_number text        not null,
    phone           text        not null,
    role            text,
    created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- items — one row per physical item, owned by exactly one project (no more
-- shared catalogue). Category (item_types)/Status/Location are required;
-- model is optional — an item can be linked straight to its category with
-- no model picked. Only the serial number is freeform.
-- ---------------------------------------------------------------------------
create table if not exists items (
    id          uuid primary key default gen_random_uuid(),
    project_id  uuid        not null references projects(id)      on delete cascade,
    type_id     uuid        not null references item_types(id)    on delete restrict,
    model_id    uuid        references item_models(id)            on delete restrict,
    serial_id   text,
    status_id   uuid        not null references item_statuses(id) on delete restrict,
    location_id uuid        not null references locations(id)     on delete restrict,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

-- Migration for databases created before items.model_id became optional.
alter table items alter column model_id drop not null;

-- ---------------------------------------------------------------------------
-- loans — "item X was loaned to location Y under project Z", with dates +
-- status. This is a separate transactional record from the item's own
-- status/location fields above, which the item carries independent of any
-- specific loan.
-- ---------------------------------------------------------------------------
create table if not exists loans (
    id                uuid primary key default gen_random_uuid(),
    project_id        uuid        not null references projects(id)  on delete cascade,
    item_id           uuid        not null references items(id)     on delete cascade,
    location_id       uuid        not null references locations(id) on delete restrict,
    quantity          integer     not null default 1 check (quantity > 0),
    status            text        not null default 'loaned'
                                  check (status in ('loaned', 'returned', 'lost')),
    loaned_at         timestamptz not null default now(),
    returned_at       timestamptz,
    notes             text,
    signer_contact_id uuid        references contacts(id) on delete restrict,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

-- Migration: the loan's signer moved from four freeform text fields to a
-- reference to one of the unit's contacts (see the contacts table above).
alter table loans drop column if exists signer_name;
alter table loans drop column if exists signer_personal_number;
alter table loans drop column if exists signer_phone;
alter table loans drop column if exists signer_role;
alter table loans add column if not exists signer_contact_id uuid references contacts(id) on delete restrict;

-- ---------------------------------------------------------------------------
-- feedback — what the borrowing location said, and when they said it.
-- loan_id is nullable: feedback may be about one specific loaned item, or
-- about the project as a whole.
-- ---------------------------------------------------------------------------
create table if not exists feedback (
    id          uuid primary key default gen_random_uuid(),
    project_id  uuid        not null references projects(id)  on delete cascade,
    loan_id     uuid        references loans(id) on delete cascade,
    location_id uuid        not null references locations(id) on delete restrict,
    rating      integer     check (rating between 1 and 5),
    content     text        not null,
    feedback_at timestamptz not null default now(),
    created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes for the read paths the UI actually uses.
-- ---------------------------------------------------------------------------
create index if not exists item_models_type_id_idx  on item_models(type_id);
create index if not exists items_project_id_idx     on items(project_id);
create index if not exists items_type_id_idx        on items(type_id);
create index if not exists items_model_id_idx       on items(model_id);
create index if not exists items_status_id_idx      on items(status_id);
create index if not exists items_location_id_idx    on items(location_id);
create index if not exists contacts_location_id_idx on contacts(location_id);
create index if not exists loans_project_id_idx     on loans(project_id);
create index if not exists loans_location_id_idx    on loans(location_id);
create index if not exists loans_item_id_idx        on loans(item_id);
create index if not exists loans_status_idx         on loans(status);
create index if not exists loans_signer_contact_id_idx on loans(signer_contact_id);
create index if not exists feedback_project_id_idx  on feedback(project_id);
create index if not exists feedback_location_id_idx on feedback(location_id);
create index if not exists feedback_loan_id_idx     on feedback(loan_id);
create index if not exists feedback_at_idx          on feedback(feedback_at desc);

-- ---------------------------------------------------------------------------
-- Keep updated_at honest.
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists projects_set_updated_at on projects;
create trigger projects_set_updated_at
    before update on projects
    for each row execute function set_updated_at();

drop trigger if exists items_set_updated_at on items;
create trigger items_set_updated_at
    before update on items
    for each row execute function set_updated_at();

drop trigger if exists loans_set_updated_at on loans;
create trigger loans_set_updated_at
    before update on loans
    for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security.
--
-- RLS is ENABLED with no policies, which denies all access through the public
-- `anon` key. The FastAPI backend connects with the `service_role` key, which
-- bypasses RLS entirely. Net effect: the database is only reachable through
-- our own API, never straight from a browser.
--
-- When real auth is added later, this is where the per-user policies go.
-- ---------------------------------------------------------------------------
alter table projects      enable row level security;
alter table item_types    enable row level security;
alter table item_models   enable row level security;
alter table item_statuses enable row level security;
alter table locations     enable row level security;
alter table contacts      enable row level security;
alter table items         enable row level security;
alter table loans         enable row level security;
alter table feedback      enable row level security;

-- ---------------------------------------------------------------------------
-- users — who may sign in, managed from the Settings → משתמשים screen.
--
-- Replaces the two credential pairs that used to be hardcoded in the frontend
-- bundle. Only the hash is stored (see backend/app/security.py); the plaintext
-- password never reaches the database, and the API never returns the hash.
--
-- `role` is a label the UI shows, not an enforced permission: the API has no
-- session of its own yet, so it cannot tell an admin's request from anyone
-- else's. `is_active` *is* enforced — a disabled user is refused at sign-in.
-- ---------------------------------------------------------------------------
create table if not exists users (
    id            uuid primary key default gen_random_uuid(),
    username      text        not null unique,
    full_name     text,
    role          text        not null default 'user'
                              check (role in ('admin', 'user')),
    is_active     boolean     not null default true,
    password_hash text        not null,
    last_login_at timestamptz,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- activity_log — one row per change made through the API, written by the
-- middleware in backend/app/activity.py rather than by each router.
--
-- `action` and `entity` are stable keys ("create", "locations", …) that the
-- frontend renders as Hebrew; `actor` and `label` are *snapshots* of the
-- username and of the record's name at the time, deliberately not foreign
-- keys — the log must still read correctly after the row it describes is
-- deleted or the user who did it is renamed.
-- ---------------------------------------------------------------------------
create table if not exists activity_log (
    id         uuid primary key default gen_random_uuid(),
    actor      text,
    action     text        not null,
    entity     text        not null,
    entity_id  uuid,
    label      text,
    created_at timestamptz not null default now()
);

create index if not exists activity_log_created_at_idx on activity_log(created_at desc);
create index if not exists activity_log_actor_idx      on activity_log(actor);

drop trigger if exists users_set_updated_at on users;
create trigger users_set_updated_at
    before update on users
    for each row execute function set_updated_at();

alter table users        enable row level security;
alter table activity_log enable row level security;
