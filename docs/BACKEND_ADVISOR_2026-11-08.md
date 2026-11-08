# November 8 backend advisor remediation

The attached report listed 68 findings. A fresh production scan before changes reported 76, including 42 callable SECURITY DEFINER warnings. Historical messaging RPCs were already revoked, and the previous connection pressure warning did not recur.

Applied the two migrations on the isolated FBLA backend, exercised the authenticated and guest APIs, and then applied them to production. They remove owner execution from nine routines, remove guest grants on internal authorization helpers, restrict direct notification updates to the read timestamp, and add explicit deny policies to the retained messaging archive. The unused full-text index was removed because site search uses substring matching. The blocked-user foreign key now has an index to avoid scanning the archive during referential checks.

The fresh post-migration scan reported 51 findings, with no suppressions added:

- 27 SECURITY DEFINER entries for guarded admin and membership transitions, private roster projections, public review projection, device-token registration, and policy helpers that prevent recursive RLS. These stay privileged because changing them to caller privileges would require exposing protected writes or private rows. Their existing paths are pinned, and guests cannot execute the internal permission helpers.
- Five intentional SELECT-only tables: profiles, membership, claims, club admins, and the audit trail. Client roles must not directly write these records.
- Two index suggestions on the Canvas URL predicate and notification type exclusion. Existing indexes serve announcement lookup by club and notification lookup by user; indexing the whole URL or low-selectivity excluded types was not justified by these findings.
- Seventeen zero-scan indexes retained for foreign keys, inbox reads, and moderation queues. A zero scan count alone does not establish that they are redundant.

Production guest search and events were confirmed after the migration. Connection usage measured 9 of 40 after rollout. The advisor reported that its slow-query rule did not run successfully; this scan does not establish that there are no slow queries.
