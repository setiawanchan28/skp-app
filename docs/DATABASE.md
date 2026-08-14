# Database Schema Specification

# Mamang Racing --- Pikiran Ngebut, Laporan Tetap Rapi.

**Database:** PostgreSQL / Supabase\
**Version:** 1.0 baseline\
**Purpose:** metadata, application state, authorization state, and
references to Google Drive resources.

------------------------------------------------------------------------

# 1. Database Principles

Supabase SHALL NOT be the primary storage for user documents.

The database stores:

-   user profile;
-   activities;
-   activity-specific data;
-   people encountered;
-   documentation metadata;
-   Google Drive IDs;
-   PDF metadata;
-   generation state;
-   soft-delete state;
-   Drive connection state;
-   audit metadata.

The database SHALL NOT store the actual PDF/photo/document binary as the
normal storage path.

------------------------------------------------------------------------

# 2. Logical Model

``` text
auth.users
    |
    v
profiles
    |
    v
activities
    |
    +--------------------+
    |                    |
    v                    v
activity_people      activity_documents
                         |
                         v
                    drive_files

activities
    |
    v
activity_drive_resources

profiles
    |
    v
drive_connections
```

------------------------------------------------------------------------

# 3. Tables

## 3.1 profiles

Stores user-specific application profile.

  Column       Type            Null Description
  ------------ ------------- ------ ---------------------
  id           uuid              NO FK to auth.users.id
  full_name    text              NO User full name
  position     text              NO Job position
  nip          text              NO NIP
  created_at   timestamptz       NO Creation timestamp
  updated_at   timestamptz       NO Last update

### Constraints

``` text
PRIMARY KEY (id)
FOREIGN KEY (id) REFERENCES auth.users(id)
```

NIP should be normalized before comparison according to the final BPS
business rule.

------------------------------------------------------------------------

# 4. activities

Central activity table.

  Column            Type                Null Description
  ----------------- ----------------- ------ ------------------------------------------
  id                uuid                  NO Activity ID
  user_id           uuid                  NO Owner
  activity_type     activity_type         NO PD / Non-PD
  name              text                  NO Activity name
  normalized_name   text                  NO Case-insensitive normalized name
  start_date        date                  NO First activity date
  end_date          date                  NO Last activity date
  start_time        time                  NO Start time
  end_time          time                  NO End time
  destination       text                 YES PD destination
  letter_number     text                 YES PD letter number
  spd_number        text                 YES PD SPD number
  description       text                 YES Final user-approved activity description
  status            activity_status       NO DRAFT/READY/GENERATED/TRASHED
  generated_at      timestamptz          YES First successful generation
  created_at        timestamptz           NO Creation timestamp
  updated_at        timestamptz           NO Update timestamp
  deleted_at        timestamptz          YES Soft delete timestamp

------------------------------------------------------------------------

# 5. Enumerations

## activity_type

``` sql
CREATE TYPE activity_type AS ENUM (
  'PERJALANAN_DINAS',
  'NON_PERJALANAN_DINAS'
);
```

## activity_status

``` sql
CREATE TYPE activity_status AS ENUM (
  'DRAFT',
  'READY',
  'GENERATED',
  'TRASHED'
);
```

------------------------------------------------------------------------

# 6. Activity Constraints

## 6.1 Date

``` sql
CHECK (end_date >= start_date)
```

## 6.2 Time

For single-day activities:

``` sql
CHECK (
  start_date <> end_date
  OR end_time >= start_time
)
```

This permits an overnight/multi-day activity while still enforcing
sensible single-day times.

## 6.3 Name

The application SHALL maintain:

``` text
normalized_name
```

generated consistently by one normalization function.

Recommended normalization:

``` text
trim
→ Unicode normalization if supported
→ collapse repeated whitespace
→ lower case
```

The exact normalization implementation should be shared between server
and database.

------------------------------------------------------------------------

# 7. Case-insensitive Name Collision

The recommended business rule is:

> A user cannot create two active activities with the same normalized
> name.

Example:

``` text
Rapat Koordinasi
rapat koordinasi
 RAPAT KOORDINASI
```

all collide.

A partial unique index is recommended:

``` sql
CREATE UNIQUE INDEX uq_active_activity_name
ON activities (user_id, normalized_name)
WHERE deleted_at IS NULL;
```

If product requirements later determine that the same activity name is
valid for different years, the uniqueness key can be changed to include
a year/business scope. This should be a deliberate migration, not an
implicit behavior.

------------------------------------------------------------------------

# 8. PD-specific Validation

PD fields:

``` text
destination
letter_number
spd_number
```

are nullable at database level because the table also stores Non-PD.

Application-level validation SHALL require them when:

``` text
activity_type = PERJALANAN_DINAS
```

A PostgreSQL CHECK constraint can additionally enforce the invariant:

``` sql
CHECK (
  activity_type = 'NON_PERJALANAN_DINAS'
  OR (
    nullif(trim(destination), '') IS NOT NULL
    AND nullif(trim(letter_number), '') IS NOT NULL
    AND nullif(trim(spd_number), '') IS NOT NULL
  )
)
```

------------------------------------------------------------------------

# 9. activity_people

Stores people encountered during an activity.

  Column        Type            Null
  ------------- ------------- ------
  id            uuid              NO
  activity_id   uuid              NO
  person_name   text              NO
  position      text              NO
  sort_order    integer           NO
  created_at    timestamptz       NO
  updated_at    timestamptz       NO

Relationship:

``` text
activities 1 ─── N activity_people
```

------------------------------------------------------------------------

# 10. activity_documents

Metadata for uploaded documentation.

  Column               Type                   Null Description
  -------------------- -------------------- ------ ---------------------------
  id                   uuid                     NO Document ID
  activity_id          uuid                     NO Activity
  documentation_date   date                     NO Actual documentation date
  original_filename    text                     NO Original user filename
  mime_type            text                     NO MIME
  file_size_bytes      bigint                  YES Original size
  kind                 documentation_kind       NO PHOTO/DOCUMENT/OTHER
  drive_file_id        text                     NO Google Drive file ID
  drive_name           text                     NO Actual Drive filename
  sort_order           integer                 YES PDF ordering
  created_at           timestamptz              NO Upload timestamp
  updated_at           timestamptz              NO Last update

------------------------------------------------------------------------

# 11. documentation_kind

``` sql
CREATE TYPE documentation_kind AS ENUM (
  'PHOTO',
  'DOCUMENT',
  'OTHER'
);
```

------------------------------------------------------------------------

# 12. Documentation Date Constraint

Documentation date SHALL normally satisfy:

``` text
activity.start_date <= documentation_date <= activity.end_date
```

This can be enforced through application logic because PostgreSQL CHECK
constraints should not depend on another row/table query.

If strict database-level enforcement is required, use a trigger.

------------------------------------------------------------------------

# 13. Photo Limit

Business rule:

> Maximum 6 photos per activity per documentation date.

Recommended database protection:

``` sql
CREATE OR REPLACE FUNCTION enforce_photo_limit()
RETURNS trigger AS $$
DECLARE
  photo_count integer;
BEGIN
  IF NEW.kind = 'PHOTO' THEN
    SELECT count(*)
      INTO photo_count
    FROM activity_documents
    WHERE activity_id = NEW.activity_id
      AND documentation_date = NEW.documentation_date
      AND kind = 'PHOTO'
      AND id <> COALESCE(NEW.id, gen_random_uuid());

    IF photo_count >= 6 THEN
      RAISE EXCEPTION 'Maximum 6 photos per activity per date';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

The implementation should be made concurrency-safe. A naive count
trigger alone may allow races when two uploads occur simultaneously.

Therefore the production implementation should use an atomic
locking/counter strategy or transactional advisory lock.

------------------------------------------------------------------------

# 14. drive_connections

Stores application metadata for Google Drive authorization.

  ---------------------------------------------------------------------------------------------------------
  Column                   Type                                       Null Description
  ------------------------ ------------------------- --------------------- --------------------------------
  id                       uuid                                         NO Connection ID

  user_id                  uuid                                         NO Owner

  google_account_subject   text                                         NO Google account subject
                                                                           identifier

  status                   drive_connection_status                      NO ACTIVE/REAUTH_REQUIRED/REVOKED

  token_secret_ref         text                                        YES Reference to encrypted secret
                                                                           storage

  scopes                   text\[\]                                     NO Granted scopes

  last_verified_at         timestamptz                                 YES Last successful verification

  created_at               timestamptz                                  NO Creation

  updated_at               timestamptz                                  NO Update
  ---------------------------------------------------------------------------------------------------------

### Security rule

Raw access/refresh tokens SHOULD NOT be stored as plaintext application
data.

Preferred architecture:

``` text
database
   |
   └── token_secret_ref
              |
              v
        encrypted secret
```

The encryption key/secret must be outside the database schema and
managed as deployment secret material.

------------------------------------------------------------------------

# 15. drive_connection_status

``` sql
CREATE TYPE drive_connection_status AS ENUM (
  'ACTIVE',
  'REAUTH_REQUIRED',
  'REVOKED'
);
```

------------------------------------------------------------------------

# 16. drive_resources

Tracks Google Drive folders and files.

  ----------------------------------------------------------------------------------------------------------------
  Column            Type                                   Null Description
  ----------------- --------------------- --------------------- --------------------------------------------------
  id                uuid                                     NO Internal resource ID

  user_id           uuid                                     NO Owner

  activity_id       uuid                                    YES Related activity

  resource_type     drive_resource_type                      NO ROOT/YEAR/MONTH/ACTIVITY/PDF/DOCUMENTATION/TRASH

  drive_file_id     text                                     NO Google Drive ID

  drive_parent_id   text                                    YES Parent Drive ID

  drive_name        text                                     NO Current name

  mime_type         text                                    YES MIME

  web_view_url      text                                    YES Last known link

  is_deleted        boolean                                  NO Resource state

  created_at        timestamptz                              NO Created

  updated_at        timestamptz                              NO Updated
  ----------------------------------------------------------------------------------------------------------------

------------------------------------------------------------------------

# 17. drive_resource_type

``` sql
CREATE TYPE drive_resource_type AS ENUM (
  'ROOT',
  'YEAR',
  'MONTH',
  'ACTIVITY',
  'PDF',
  'DOCUMENTATION',
  'TRASH'
);
```

------------------------------------------------------------------------

# 18. Resource Relationships

Example:

``` text
ROOT
└── YEAR
    └── MONTH
        └── ACTIVITY
            ├── PDF
            ├── DOCUMENTATION
            ├── DOCUMENTATION
            └── ...
```

The database should retain Drive IDs so the application does not need to
find resources only by filename.

------------------------------------------------------------------------

# 19. activity_generations

Recommended table for PDF generation history/idempotency.

  Column              Type                  Null
  ------------------- ------------------- ------
  id                  uuid                    NO
  activity_id         uuid                    NO
  idempotency_key     text                    NO
  generation_number   integer                 NO
  pdf_drive_file_id   text                   YES
  status              generation_status       NO
  content_hash        text                   YES
  error_code          text                   YES
  error_message       text                   YES
  started_at          timestamptz             NO
  completed_at        timestamptz            YES

This is preferable to trying to infer generation state only from
`activities.generated_at`.

------------------------------------------------------------------------

# 20. generation_status

``` sql
CREATE TYPE generation_status AS ENUM (
  'PROCESSING',
  'SUCCESS',
  'FAILED'
);
```

------------------------------------------------------------------------

# 21. Generation Idempotency

A generation request should carry an idempotency key.

Recommended unique constraint:

``` sql
CREATE UNIQUE INDEX uq_generation_idempotency
ON activity_generations (activity_id, idempotency_key);
```

This prevents repeated requests from creating multiple PDFs.

------------------------------------------------------------------------

# 22. activity_audit_log

Recommended for sensitive state transitions.

  Column        Type            Null
  ------------- ------------- ------
  id            uuid              NO
  user_id       uuid              NO
  activity_id   uuid             YES
  action        text              NO
  metadata      jsonb            YES
  created_at    timestamptz       NO

Examples:

``` text
ACTIVITY_CREATED
ACTIVITY_UPDATED
AI_PROCESSED
PDF_GENERATION_STARTED
PDF_GENERATED
FORCE_CHANGE
DRIVE_REAUTHORIZED
ACTIVITY_TRASHED
ACTIVITY_RESTORED
ACTIVITY_PERMANENTLY_DELETED
```

Audit metadata must never contain access tokens or secrets.

------------------------------------------------------------------------

# 23. Recommended Indexes

``` sql
CREATE INDEX idx_activities_user_date
ON activities (user_id, start_date DESC);

CREATE INDEX idx_activities_user_status
ON activities (user_id, status);

CREATE INDEX idx_activity_people_activity
ON activity_people (activity_id);

CREATE INDEX idx_activity_documents_activity_date
ON activity_documents (activity_id, documentation_date);

CREATE INDEX idx_drive_resources_activity
ON drive_resources (activity_id);

CREATE INDEX idx_drive_resources_user
ON drive_resources (user_id);

CREATE INDEX idx_generation_activity
ON activity_generations (activity_id);

CREATE INDEX idx_audit_activity
ON activity_audit_log (activity_id, created_at DESC);
```

------------------------------------------------------------------------

# 24. Foreign Keys

Recommended:

``` text
profiles.id
    -> auth.users.id

activities.user_id
    -> auth.users.id

activity_people.activity_id
    -> activities.id

activity_documents.activity_id
    -> activities.id

drive_connections.user_id
    -> auth.users.id

drive_resources.user_id
    -> auth.users.id

drive_resources.activity_id
    -> activities.id

activity_generations.activity_id
    -> activities.id

activity_audit_log.user_id
    -> auth.users.id

activity_audit_log.activity_id
    -> activities.id
```

Use `ON DELETE CASCADE` carefully. In particular, permanent deletion of
an activity should be an explicit application workflow rather than an
accidental consequence of deleting a user.

------------------------------------------------------------------------

# 25. Row Level Security

RLS SHALL be enabled on all user-owned tables.

Conceptual policy:

``` sql
auth.uid() = user_id
```

For tables without a direct `user_id`, ownership is resolved through the
parent activity.

Example for `activity_people`:

``` text
activity_people.activity_id
        ↓
activities.user_id
        ↓
auth.uid()
```

Admin SHALL NOT receive a blanket policy allowing report content access.

Administrative statistics should use separate aggregate-safe
functions/views where necessary.

------------------------------------------------------------------------

# 26. User Isolation

The following attack must fail:

``` http
GET /activities/USER_B_ACTIVITY_ID
```

when the authenticated user is USER_A.

It must fail even if:

-   the ID is known;
-   the ID is guessed;
-   the user manipulates the request;
-   the UI is bypassed.

------------------------------------------------------------------------

# 27. Generated State

`activities.generated_at IS NOT NULL` can be used as a historical
indicator.

However, the authoritative lifecycle should be:

``` text
status = GENERATED
```

after successful generation.

A generated activity must never be downgraded to DRAFT simply because a
PDF update failed.

------------------------------------------------------------------------

# 28. Locking Data

The database SHALL enforce immutable identity after first generation.

Recommended server-side update rule:

``` text
if activity.status = GENERATED
and request is normal update
then reject changes to:
  name
  start_date
  end_date
  start_time
  end_time
  spd_number
```

Force Change must use a separate privileged application operation with
explicit confirmation.

------------------------------------------------------------------------

# 29. Soft Delete

Soft delete:

``` text
status = TRASHED
deleted_at = now()
```

Normal queries:

``` text
WHERE status <> 'TRASHED'
```

Restore:

``` text
status = previous_active_state
deleted_at = NULL
```

Because the previous state may have been DRAFT/READY/GENERATED, a
production implementation may store `previous_status`.

Recommended addition:

``` text
previous_status activity_status NULL
```

------------------------------------------------------------------------

# 30. Permanent Delete

Permanent deletion SHALL:

1.  require explicit user confirmation;
2.  verify ownership;
3.  handle Drive resources according to the approved deletion policy;
4.  remove database records only after the Drive operation reaches the
    intended state;
5.  record an audit event before final removal where technically
    possible.

The system SHALL not claim that a Drive file was permanently deleted if
Google Drive did not confirm the operation.

------------------------------------------------------------------------

# 31. Drive Naming Metadata

The database should retain:

``` text
activity.start_date
activity.name
activity_documents.documentation_date
original_filename
drive_name
```

The Drive name is a materialized representation of the naming rule, not
the primary business identity.

This means changing an activity name through Force Change must update
the relevant Drive resources and metadata together.

------------------------------------------------------------------------

# 32. Suggested SQL Foundation

``` sql
create extension if not exists pgcrypto;

create type activity_type as enum (
  'PERJALANAN_DINAS',
  'NON_PERJALANAN_DINAS'
);

create type activity_status as enum (
  'DRAFT',
  'READY',
  'GENERATED',
  'TRASHED'
);

create type documentation_kind as enum (
  'PHOTO',
  'DOCUMENT',
  'OTHER'
);

create table profiles (
  id uuid primary key references auth.users(id),
  full_name text not null,
  position text not null,
  nip text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  activity_type activity_type not null,
  name text not null,
  normalized_name text not null,
  start_date date not null,
  end_date date not null,
  start_time time not null,
  end_time time not null,
  destination text,
  letter_number text,
  spd_number text,
  description text,
  status activity_status not null default 'DRAFT',
  generated_at timestamptz,
  previous_status activity_status,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint activities_date_range_ck
    check (end_date >= start_date),

  constraint activities_single_day_time_ck
    check (
      start_date <> end_date
      or end_time >= start_time
    ),

  constraint activities_pd_fields_ck
    check (
      activity_type = 'NON_PERJALANAN_DINAS'
      or (
        nullif(trim(destination), '') is not null
        and nullif(trim(letter_number), '') is not null
        and nullif(trim(spd_number), '') is not null
      )
    )
);

create unique index uq_active_activity_name
on activities (user_id, normalized_name)
where deleted_at is null;

create table activity_people (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities(id) on delete cascade,
  person_name text not null,
  position text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table activity_documents (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities(id) on delete cascade,
  documentation_date date not null,
  original_filename text not null,
  mime_type text not null,
  file_size_bytes bigint,
  kind documentation_kind not null,
  drive_file_id text not null,
  drive_name text not null,
  sort_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_activities_user_date
on activities(user_id, start_date desc);

create index idx_activity_documents_activity_date
on activity_documents(activity_id, documentation_date);
```

The SQL above is the foundation, not the complete migration. The final
migration must be reconciled with the existing application's schema
before execution.

------------------------------------------------------------------------

# 33. Important Integration Rule

This database document describes the **target model**.

When integrating into an existing system:

1.  inspect existing tables;
2.  map existing fields;
3.  identify reusable tables;
4.  identify incompatible constraints;
5.  produce a migration plan;
6.  do not drop existing data;
7.  do not rename existing tables merely for aesthetic consistency;
8.  preserve existing functionality unless the change specification
    explicitly replaces it.

The existing database schema must be treated as an input to the
implementation plan, not assumed to match this document.
