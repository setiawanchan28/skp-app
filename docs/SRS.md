# Software Requirements Specification (SRS)

# Mamang Racing --- Pikiran Ngebut, Laporan Tetap Rapi.

**Dokumen:** Software Requirements Specification\
**Versi:** 1.0 baseline\
**Status:** Ready for implementation planning\
**Parent document:** PRD.md

------------------------------------------------------------------------

## 1. Scope

SRS ini menerjemahkan PRD menjadi perilaku sistem yang dapat diuji.

Sistem terdiri dari:

-   PWA frontend;
-   application backend/API;
-   Supabase database;
-   Google OAuth;
-   Google Drive API;
-   Gemini API;
-   PDF generation service.

------------------------------------------------------------------------

# 2. Actors

## 2.1 User

Dapat:

-   login;
-   mengelola profil;
-   membuat kegiatan;
-   mengedit kegiatan;
-   copy kegiatan;
-   upload dokumentasi;
-   meminta AI merapikan deskripsi;
-   generate PDF;
-   melihat daftar/calendar;
-   copy link;
-   print;
-   soft delete;
-   restore;
-   permanent delete;
-   reauthorize Google Drive.

## 2.2 Admin

Dapat:

-   melihat statistik;
-   melihat statistik penggunaan;
-   mengelola informasi operasional yang tidak membutuhkan akses isi
    laporan.

Tidak dapat:

-   membaca laporan;
-   membaca dokumentasi;
-   menghapus laporan user;
-   mengakses file Drive user melalui aplikasi.

------------------------------------------------------------------------

# 3. Functional Requirements

## AUTH-001 --- Google Login

System SHALL allow authentication using Google Account.

## AUTH-002 --- First Login Profile

On first successful login, if profile is incomplete, system SHALL
require:

-   full name;
-   position;
-   NIP.

## AUTH-003 --- Profile Update

User SHALL be able to update profile from Profile Settings.

## AUTH-004 --- Session

System SHALL maintain a continuous application session while
authentication remains valid.

## AUTH-005 --- Drive Authorization

Drive authorization SHALL be handled separately as required by Google
Drive API.

If Drive authorization is invalid/revoked, system SHALL request
reauthorization.

------------------------------------------------------------------------

# 4. Activity Requirements

## ACT-001 --- Activity Type

Every activity SHALL have exactly one:

``` text
PERJALANAN_DINAS
NON_PERJALANAN_DINAS
```

## ACT-002 --- Required Name

Activity name SHALL be required.

## ACT-003 --- Case-insensitive Name Collision

Activity name uniqueness/collision rules SHALL be evaluated
case-insensitively for the same user.

Example:

``` text
Rapat
rapat
RAPAT
```

must be treated as the same name for collision checking.

## ACT-004 --- Date Range

Every activity SHALL have:

``` text
start_date
end_date
```

Both required before generation.

Constraint:

``` text
end_date >= start_date
```

## ACT-005 --- Time

Activity SHALL support:

``` text
start_time
end_time
```

Time is required before generation.

Where applicable:

``` text
end_time >= start_time
```

For multi-day activities, time represents the activity's declared time
context; day-specific details can be represented in the activity
description/documentation metadata.

## ACT-006 --- Draft

A new activity SHALL initially have status:

``` text
DRAFT
```

## ACT-007 --- Ready

The system MAY indicate READY when minimum required fields have been
satisfied.

## ACT-008 --- Generated

After successful first PDF generation, activity status SHALL become:

``` text
GENERATED
```

Only after the PDF and required Drive metadata have been successfully
persisted.

------------------------------------------------------------------------

# 5. Perjalanan Dinas Requirements

## PD-001

PD activity SHALL require:

-   activity name;
-   start date;
-   end date;
-   start time;
-   end time;
-   destination;
-   letter number;
-   SPD number;
-   other required fields defined by final template.

## PD-002

PD SHALL support a list of people encountered.

Each entry SHALL contain at minimum:

-   name;
-   position.

## PD-003

People encountered SHALL support more than one record.

## PD-004

SPD number SHALL be required.

## PD-005

A PD activity SHALL have one primary SPD number.

## PD-006

The system SHALL reject duplicate SPD numbers according to the approved
uniqueness scope.

The final scope of uniqueness must match the existing system if the
existing system already establishes a broader business rule; the
implementation must not silently weaken an existing constraint.

------------------------------------------------------------------------

# 6. Non-PD Requirements

## NPD-001

Non-PD SHALL require:

-   activity name;
-   start date;
-   end date;
-   start time;
-   end time;
-   other fields required by final template.

## NPD-002

Non-PD SHALL support multi-day activities.

------------------------------------------------------------------------

# 7. Activity Copy

## COPY-001

User SHALL be able to copy an existing activity.

## COPY-002

Copy SHALL create a new activity.

## COPY-003

The following SHALL NOT be copied:

-   start date;
-   end date;
-   start time;
-   end time;
-   documentation;
-   generated PDF;
-   Drive file IDs.

## COPY-004

The copied activity SHALL start as DRAFT.

## COPY-005

User SHALL be required to enter dates and time before generation.

## COPY-006

Copied activity SHALL undergo the same collision validation as a newly
created activity.

------------------------------------------------------------------------

# 8. Documentation

## DOC-001

User SHALL be able to add documentation to an activity.

## DOC-002

Each documentation item SHALL have its own documentation date.

## DOC-003

Documentation date SHALL fall within the activity date range unless an
explicit business rule in the final template permits otherwise.

## DOC-004

Photos SHALL have a hard maximum of 6 per activity per documentation
date.

## DOC-005

The system SHALL reject the 7th photo for the same activity/date.

## DOC-006

The system SHALL explain the rejection:

> Maksimal 6 foto untuk satu kegiatan pada tanggal yang sama.

## DOC-007

There is no product-defined arbitrary file-count limit for non-photo
documentation, subject to technical/security limits.

## DOC-008

Original file name SHALL be retained after applying the naming prefix.

------------------------------------------------------------------------

# 9. Image Processing

## IMG-001

System SHALL detect image dimensions and orientation.

## IMG-002

System SHALL preserve aspect ratio.

## IMG-003

System SHALL support portrait and landscape images.

## IMG-004

System SHALL never stretch an image to fit the PDF.

## IMG-005

System SHALL resize/downscale images when required for PDF rendering.

## IMG-006

System SHALL use a safe maximum derived resolution for PDF rendering to
avoid excessive memory usage.

The exact pixel threshold is an implementation decision and SHALL be
documented in DESIGN.md.

## IMG-007

The original uploaded image SHALL not be destructively overwritten
merely to create a PDF derivative.

------------------------------------------------------------------------

# 10. AI Requirements

## AI-001

User SHALL explicitly trigger AI processing.

## AI-002

AI SHALL process the user-provided text/transcript.

## AI-003

AI output SHALL be presented to the user for review before being
committed as the final activity description.

## AI-004

AI SHALL produce formal, coherent, chronological text.

## AI-005

AI MAY improve normative/formal phrasing when supported by context.

## AI-006

AI SHALL NOT fabricate factual details.

## AI-007

AI SHALL NOT invent:

-   people;
-   positions;
-   dates;
-   times;
-   locations;
-   outcomes;
-   events.

## AI-008

AI SHALL not generate the PDF.

------------------------------------------------------------------------

# 11. Speech Requirements

## SPEECH-001

System SHALL provide speech input where browser/device speech
recognition is supported.

## SPEECH-002

Speech recognition result SHALL be treated as draft input.

## SPEECH-003

User SHALL be able to edit transcript before AI processing.

## SPEECH-004

User SHALL be able to edit AI output before saving.

## SPEECH-005

Speech feature SHALL degrade gracefully when browser speech recognition
is unavailable.

------------------------------------------------------------------------

# 12. PDF Requirements

## PDF-001

PDF generation SHALL be explicitly triggered by the user.

## PDF-002

System SHALL validate all required fields before generation.

## PDF-003

PDF layout SHALL follow the approved report template.

## PDF-004

Visual layout SHALL use the travel-report layout as the master style
while maintaining type-specific report structure.

## PDF-005

Documentation SHALL be the final section.

## PDF-006

For PD, the structure SHALL support:

1.  Keterangan Pelaksana Perjalanan Dinas
2.  Keterangan Perjalanan Dinas
3.  Daftar Petugas yang Ditemui
4.  Resume Perjalanan Dinas
5.  Dokumentasi

## PDF-007

For Non-PD, the structure SHALL support the corresponding activity
structure and end with Dokumentasi.

## PDF-008

The exact final labels and visual dimensions SHALL follow the approved
template file.

## PDF-009

First successful generation SHALL create the PDF file.

## PDF-010

Subsequent generation SHALL update/replace the same logical PDF file.

## PDF-011

Generation SHALL be idempotent.

A retry must not create unintended duplicate PDFs.

------------------------------------------------------------------------

# 13. Locking Requirements

## LOCK-001

Before first generation, user MAY edit activity identity.

## LOCK-002

After first successful generation, normal edit SHALL reject changes to:

-   activity name;
-   start date;
-   end date;
-   start time;
-   end time;
-   SPD number for PD.

## LOCK-003

The UI SHALL visibly indicate locked fields.

## LOCK-004

Server SHALL enforce locking.

Client-side disabled controls are insufficient.

------------------------------------------------------------------------

# 14. Force Change Requirements

## FORCE-001

User SHALL have an explicit "Ganti Paksa" option after generation.

## FORCE-002

System SHALL display a warning before executing Force Change.

## FORCE-003

System SHALL recommend delete-and-recreate as the safer normal workflow.

## FORCE-004

Force Change SHALL validate collision before modifying Drive resources.

## FORCE-005

If name/date changes affect Drive names, system SHALL rename the
affected resources.

## FORCE-006

Drive changes SHALL be performed as the final persistence step after
validation.

## FORCE-007

If Drive update fails, system SHALL report the failure and SHALL NOT
falsely report the activity as fully updated.

## FORCE-008

Force Change SHALL be auditable.

------------------------------------------------------------------------

# 15. Google Drive Requirements

## DRIVE-001

Application SHALL use Google Drive as primary file storage.

## DRIVE-002

Application SHALL create/use one application root folder:

``` text
Laporan Kegiatan
```

## DRIVE-003

If root folder does not exist, system SHALL create it.

## DRIVE-004

System SHALL create:

``` text
Laporan Kegiatan/YYYY/MM/
```

## DRIVE-005

System SHALL create an activity folder:

``` text
YYMMDD - Nama Kegiatan
```

## DRIVE-006

Folder and PDF date SHALL use activity start date.

## DRIVE-007

Documentation file date SHALL use actual documentation date.

## DRIVE-008

PDF name:

``` text
YYMMDD - Nama Kegiatan.pdf
```

## DRIVE-009

Documentation name:

``` text
YYMMDD - Nama Kegiatan - NamaAsliFile.ext
```

## DRIVE-010

File naming SHALL be deterministic.

## DRIVE-011

Filename sanitization SHALL prevent invalid Drive filename characters
and control characters.

## DRIVE-012

System SHALL store Drive IDs rather than relying only on file names.

## DRIVE-013

Application SHALL operate only inside its managed application folder.

## DRIVE-014

Application SHALL not browse unrelated user Drive content.

------------------------------------------------------------------------

# 16. PDF Sharing Requirements

## SHARE-001

After successful generation, system SHALL make the PDF accessible as:

``` text
Anyone with the link
Role: Viewer
```

## SHARE-002

System SHALL expose:

``` text
Copy Link
Print
```

## SHARE-003

Photo/documentation permissions SHALL NOT automatically inherit public
PDF sharing unless explicitly required.

------------------------------------------------------------------------

# 17. Delete/Restore Requirements

## DEL-001

Delete SHALL be soft delete.

## DEL-002

Soft-deleted activities SHALL not appear in the normal active
list/calendar.

## DEL-003

User SHALL be able to restore.

## DEL-004

User SHALL be able to permanently delete.

## DEL-005

Permanent delete SHALL require explicit confirmation.

## DEL-006

Application SHALL not silently recreate missing Drive files.

## DEL-007

If a Drive file is missing:

``` text
File tidak ditemukan di Google Drive.
```

shall be shown.

------------------------------------------------------------------------

# 18. Drive Authorization Failure

## AUTHDRIVE-001

If Drive returns authorization failure, system SHALL mark the connection
as requiring reauthorization.

## AUTHDRIVE-002

System SHALL show:

``` text
Aplikasi kehilangan akses ke Google Drive.
Silakan autentikasi ulang.
```

## AUTHDRIVE-003

System SHALL not silently create a new folder tree after authorization
failure.

------------------------------------------------------------------------

# 19. Dashboard Requirements

## DASH-001

User SHALL have list view.

## DASH-002

User SHALL have calendar view.

## DASH-003

List SHALL show at least:

-   activity name;
-   type;
-   date/range;
-   status;
-   documentation indicator;
-   PDF status.

## DASH-004

Calendar SHALL display multi-day activity across its date range.

------------------------------------------------------------------------

# 20. Privacy Requirements

## PRIV-001

User SHALL only access their own activities.

## PRIV-002

User SHALL not access another user's activity by changing IDs in
requests.

## PRIV-003

Database RLS SHALL enforce ownership.

## PRIV-004

Admin role SHALL not grant report-content access.

## PRIV-005

Google Drive file ownership remains with user.

------------------------------------------------------------------------

# 21. Validation Architecture

Validation SHALL exist at three levels:

``` text
UI validation
      ↓
Server/application validation
      ↓
Database constraints
```

UI validation improves UX.

Server validation is authoritative for business rules.

Database constraints protect integrity.

No critical business rule may exist only in frontend code.

------------------------------------------------------------------------

# 22. Concurrency

System SHALL account for:

-   two generate requests;
-   duplicate upload requests;
-   two tabs editing same activity;
-   repeated Force Change;
-   repeated restore/delete;
-   Drive API retry.

Critical operations SHALL use idempotency keys or equivalent locking
mechanisms.

------------------------------------------------------------------------

# 23. Error Handling

Errors SHALL be categorized:

1.  validation;
2.  authorization;
3.  Drive;
4.  AI;
5.  PDF;
6.  database;
7.  network;
8.  unexpected/internal.

User-facing errors SHALL be understandable.

Technical details SHALL be logged securely without secrets.

------------------------------------------------------------------------

# 24. Acceptance Criteria

A release is acceptable only when:

-   all critical requirements pass;
-   RLS prevents cross-user access;
-   database constraints reject invalid data;
-   Drive naming is deterministic;
-   duplicate PDF generation does not create unintended files;
-   photo limit is enforced per activity/date;
-   first generation locks identity;
-   Force Change requires explicit user action;
-   missing Drive files are reported rather than silently recreated;
-   Drive reauthorization works;
-   AI output requires user review;
-   PDF follows approved template;
-   public PDF link works as intended;
-   admin cannot read report contents.

------------------------------------------------------------------------

# 25. Non-Functional Requirements

## NFR-001 Security

Security SHALL be treated as a primary requirement, not post-release
hardening.

## NFR-002 Privacy

The application SHALL minimize storage of user documents outside Google
Drive.

## NFR-003 Availability

The application SHALL degrade gracefully when external services are
temporarily unavailable.

## NFR-004 Performance

Normal activity editing SHALL not require PDF generation.

## NFR-005 AI Cost

AI SHALL only run on explicit user request.

## NFR-006 Maintainability

Business rules SHALL be centralized and reused across UI/API.

## NFR-007 Auditability

Changes affecting generated reports or Drive resources SHALL be
timestamped.

## NFR-008 Accessibility

Core workflows SHALL be usable from desktop and mobile viewport sizes.

------------------------------------------------------------------------

# 26. Requirement Priority

### P0 --- Critical

-   authentication;
-   profile;
-   activity creation;
-   PD/Non-PD;
-   date/time;
-   validation;
-   Google Drive;
-   PDF generation;
-   locking;
-   RLS;
-   privacy.

### P1 --- High

-   speech input;
-   AI refinement;
-   copy activity;
-   calendar;
-   soft delete/restore;
-   Force Change.

### P2 --- Enhancement

-   advanced statistics;
-   advanced search/filter;
-   future automation.
