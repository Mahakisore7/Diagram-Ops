# ADR-0013: The activity log is best-effort and expires after 90 days

**Status:** Accepted

## Context
An enterprise user expects to see who signed in to their account (including failed attempts), when their password changed, and what happened to their diagrams. Recording that adds a database write to the hot path of login and every diagram mutation.

## Decision
`activityService.record()` writes an `ActivityEvent` after the primary action succeeds, swallows (and logs) its own failures so it can never fail the user's request, and the collection carries a MongoDB TTL index that deletes events older than 90 days.

## Alternatives considered
- **Transactional audit (write event and action atomically).** Correct for compliance-grade auditing, but requires a replica set for multi-document transactions and makes a logging outage an availability outage for login.
- **Ship events to an external log pipeline only (CloudWatch/ELK).** Better for operators, but users could not see their own history in the app; this can be added later alongside the in-app log.
- **Keep events forever.** Unbounded growth for data whose value decays quickly; 90 days covers the "was that me?" question it exists to answer.

## Consequences
Login and diagram operations stay available even if the activity write fails, at the cost of an occasional missing event — acceptable for a user-facing security feed, not for a regulatory audit trail. Failed sign-ins are recorded against the account only when the email exists, while the HTTP response stays identical for unknown emails, so the log adds no account-enumeration signal. Deleting an account deletes its events.
