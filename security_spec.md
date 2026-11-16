# Security Specification — Pharmacy Stock & Gmail Auth

## 1. Data Invariants
1. **Identity Integrity**: Every document under `/users/{userId}` and its subcollections (`/private/{docId}`, `/workspaces/{workspaceId}`) must have `data.uid == request.auth.uid` and `userId == request.auth.uid`.
2. **Verified Gmail Requirement**: All reads and writes to user profiles, private PII, and workspaces require `request.auth != null && request.auth.token.email_verified == true`.
3. **PII Isolation (Split Collection)**: Email addresses are stored exclusively in `/users/{userId}/private/info` and never in `/users/{userId}`.
4. **Master Gate**: Subcollections `/private/{docId}` and `/workspaces/{workspaceId}` verify parent existence via `exists(/databases/$(database)/documents/users/$(userId))` and `get(...).data.uid == request.auth.uid`.
5. **Immutable Anchors & Server Timestamps**: `uid` and `createdAt` are immutable after creation; `createdAt == request.time` on create and `updatedAt == request.time` on both create and update.
6. **Strict ID & Payload Boundaries**: All path variables are validated with `isValidId()`, strings enforce `.size()` bounds, and arrays in `workspaces` enforce `.size() <= MAX` and first-element type checks (`is map`).
7. **No Unrequested Listing**: `allow list: if false;` is enforced on all collections because the application reads known single-document paths via `getDoc()`.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated read/write**: `request.auth == null` attempting `get` or `create` on `/users/uid1`.
2. **Unverified email spoofing**: `request.auth.uid == 'uid1'` with `request.auth.token.email_verified == false` attempting `create` on `/users/uid1`.
3. **Cross-user read (PII leak)**: `uid2` attempting `get` on `/users/uid1/private/info`.
4. **Cross-user workspace write**: `uid2` attempting `update` on `/users/uid1/workspaces/default`.
5. **Identity spoofing on create**: `uid1` creating `/users/uid1` with `{ uid: 'uid2', ... }`.
6. **Ghost / Shadow field injection**: `uid1` creating `/users/uid1` with extra field `isAdmin: true` or `role: 'superadmin'`.
7. **Update-gap ghost key**: `uid1` updating `/users/uid1/workspaces/default` with an unallowed key `bypassQuota: true`.
8. **Client-forged timestamps**: `uid1` creating `/users/uid1` with `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time`.
9. **Immutable field mutation**: `uid1` updating `/users/uid1` and changing `createdAt` or `uid`.
10. **Path ID poisoning**: `uid1` requesting `/users/uid1/workspaces/invalid$id..with.dots` or >128 char ID.
11. **Denial-of-Wallet oversized string**: `uid1` writing `displayName` with 1,000 characters (limit 120) or `hospital` > 120 chars.
12. **Array poisoning / unbounded list**: `uid1` writing `products: ["not-a-map"]` or `products` exceeding 500 elements to `/users/uid1/workspaces/default`.
