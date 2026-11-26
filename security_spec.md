# CareerPilot AI — Firestore Security Specification

## Data Invariants
1. **Strict Ownership**: Every `users/{userId}`, `resumes/{resumeId}`, `interviews/{interviewId}`, and `jobPreps/{prepId}` document belongs exclusively to the authenticated `request.auth.uid`.
2. **PII Isolation**: User profile documents containing email addresses may never be listed or read by any other user.
3. **Immutable Audit Fields**: `userId`/`uid` and `createdAt` may never be changed after creation, and timestamps must equal `request.time`.
4. **Terminal State Integrity**: Once an interview reaches `status == 'completed'`, its questions, scores, and final report are locked against client tampering (only deletion by owner is permitted).
5. **Bounded Payloads**: Document IDs must match `^[a-zA-Z0-9_-]+$` (`<= 128` chars), and all strings/lists have strict upper bounds to prevent resource exhaustion.

## Dirty Dozen Adversarial Payloads (Expected: PERMISSION_DENIED)
1. Unauthenticated read/write to `/resumes/{id}`.
2. Creating `/users/{otherUid}` where `uid != request.auth.uid`.
3. Listing `/users` collection to scrape user emails.
4. Creating a resume with `userId` set to another user's UID.
5. Updating a resume with a shadow field (`isAdmin: true`).
6. Updating a resume to mutate `createdAt` or `userId`.
7. Creating a resume with a 2KB malformed document ID.
8. Listing `/resumes` without filtering `userId == request.auth.uid`.
9. Creating an interview with `status: 'completed'` directly or with `turns` exceeding 30 items.
10. Modifying an interview after `status == 'completed'` to inflate `overallScore` to 100.
11. Reading another user's `/interviews/{id}` or `/jobPreps/{id}` by document ID.
12. Spoofing `createdAt` or `updatedAt` with a client-supplied past/future timestamp instead of `request.time`.
