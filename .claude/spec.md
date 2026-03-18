# Feature Specification: FreshBooks Timer Raycast Extension - Fix & Ship

## Status

- Ready for implementation

## Overview

Fix the broken OAuth flow and incorrect API endpoints in the existing FreshBooks timer Raycast extension so all 4 commands (toggle, start-with-form, stop-with-form, status) work end-to-end. The extension structure and UI are already built — this is a fix-and-ship effort, not a rebuild.

## Problem Statement

The extension is ~80% complete but completely non-functional because OAuth authentication fails with a 500 error on FreshBooks' authorization page. The auth code references Raycast-managed OAuth environment variables (`process.env.RAYCAST_OAUTH_CLIENT_ID`) that don't exist for custom OAuth providers like FreshBooks, sending an empty client_id. A secondary issue is the services endpoint hitting the wrong FreshBooks API path.

## Goals

- All 4 commands authenticate successfully and interact with the FreshBooks API
- User can start/stop timers with keyboard-only flow via Raycast
- Forms load cached client/project/service data from the correct endpoints

## Core Requirements

### Functional Requirements

- FR-001: OAuth flow MUST use the user's FreshBooks OAuth app credentials (client ID and secret from extension preferences) — not Raycast-managed env vars
- FR-002: Token exchange MUST include `code_verifier` (from PKCE `authorizationRequest`) alongside `client_id`, `client_secret`, and `redirect_uri`
- FR-003: Token refresh MUST work so the user doesn't have to re-authorize every session. On refresh failure or scope mismatch, clear stored tokens and re-trigger full auth flow.
- FR-004: OAuth scope MUST include `user:billable_items:read` (required for services endpoint) in addition to existing scopes
- FR-005: Toggle timer command MUST start a timer if none is running, or stop the running timer
- FR-006: Start timer form MUST allow selecting client, project (filtered by client), service, and notes before starting
- FR-007: Stop timer form MUST pre-fill with running timer's data and show elapsed time
- FR-008: Timer status MUST show running state, elapsed time, and associated metadata
- FR-009: Services dropdown MUST use the business services endpoint (`GET /comments/business/{businessId}/services`), not invoice items

### Non-Functional Requirements

- NFR-001: Dropdown data (clients, projects, services) MUST be cached with 1-hour TTL (already implemented)
- NFR-002: Client ID and secret MUST be stored in Raycast extension preferences, never hardcoded in source
- NFR-003: GET requests MUST omit `Content-Type` header. API POST/PUT requests (time entries, etc.) send `Content-Type: application/json`. OAuth token/refresh POST requests stay `application/x-www-form-urlencoded` (matching current pattern).

## Proposed Approach

### Auth Fix (primary)

**Preferences**: Replace all `process.env.RAYCAST_OAUTH_CLIENT_ID` / `process.env.RAYCAST_OAUTH_CLIENT_SECRET` references in `src/api/client.ts` with values read from Raycast extension preferences (`clientId`, `clientSecret`). Make both preferences **required** in `package.json` since the extension cannot function without them. Remove placeholder text implying Raycast-managed OAuth.

**Redirect URI**: Define a single shared constant `REDIRECT_URI = "https://raycast.com/redirect/extension"` and use it in all three places: (1) as `extraParameters.redirect_uri` in `authorizationRequest()`, (2) as `redirect_uri` in the authorization-code token exchange body, and (3) as `redirect_uri` in the refresh-token exchange body. Do not rely on `authRequest.redirectURI` — it may still be Raycast's default query-param form. The user must update their FreshBooks OAuth app's redirect URI from `https://raycast.com/redirect/oauth` to `https://raycast.com/redirect/extension`.

**PKCE + token exchange**: The existing `OAuth.PKCEClient` with `redirectMethod: Web` is the correct Raycast pattern. Keep PKCE. The token exchange (`POST /auth/oauth/token`) MUST include `code_verifier` (available from the auth request object) alongside `client_id`, `client_secret`, `redirect_uri`, and the authorization `code`. The current code at `client.ts:54` is missing `code_verifier` — this alone could cause token exchange failure even after fixing client_id.

**Scopes**: Add `user:billable_items:read` to the scope string (required for the services endpoint). Since adding scopes requires re-authorization, the `authorize()` method should detect scope mismatches on stored tokens and force re-auth when needed.

**Token refresh**: Implement refresh token exchange using FreshBooks' token endpoint with `grant_type=refresh_token`. Wire into `authorize()` so expired tokens are refreshed before making API calls. On refresh failure, clear stored tokens and re-trigger full auth flow. Persist the newest refresh token on every successful refresh.

**No non-PKCE fallback**: Do not implement a plain authorization code flow fallback. If FreshBooks rejects PKCE after these fixes, that's a separate investigation.

### Request Headers Fix

Split `getHeaders()` so that GET requests omit `Content-Type` while API POST/PUT requests include `Content-Type: application/json`. OAuth token/refresh POST requests remain `application/x-www-form-urlencoded` (already correct in the current code). FreshBooks' Projects and Time Tracking endpoints reject or misbehave with `Content-Type` on GET requests.

### Services Endpoint Fix

Change `src/api/client.ts:255` from `/accounting/account/{id}/items/items` to `GET /comments/business/{businessId}/services`. Update `ServicesResponse` type in `src/api/types.ts` to match the documented response shape (`services` array + `meta` object). Cache key remains the same.

### Project Filtering Fix

Do not rely on server-side `client_id` query parameter for project filtering — FreshBooks does not document this filter. Fetch all projects once, cache them under a single `PROJECTS` cache key (remove the per-client `projectsByClient` cache keys in `src/api/cache.ts`), and filter by `client_id` locally in the form components.

### Minor Fixes

- `timer-status.tsx:71-73`: Wire up "Stop Timer with Details" and "Start Timer with Details" actions to open the respective commands via `launchCommand`
- `client.ts:89`: Fine as-is for single business account (confirmed by user)

## User Stories

### Story 1: Quick Toggle

**As a** developer with carpal tunnel
**I want to** press a hotkey to instantly start or stop my FreshBooks timer
**So that** I can track time without leaving my keyboard or current context

**Acceptance Criteria:**

- [ ] Given no timer is running, when I invoke toggle-timer, then a new timer starts and I see a HUD confirmation
- [ ] Given a timer is running, when I invoke toggle-timer, then it stops, logs the duration, and I see a HUD confirmation
- [ ] Given I haven't authorized yet, when I invoke any command, then the OAuth flow opens, I authorize, and the command proceeds

### Story 2: Start with Details

**As a** developer
**I want to** start a timer pre-assigned to a client/project/service with notes
**So that** I don't have to fill in details later when stopping

**Acceptance Criteria:**

- [ ] Given I open start-timer, when I select a client, then the project dropdown filters to that client's projects
- [ ] Given I fill in all fields and submit, then a timer starts with those details attached

### Story 3: Stop with Details

**As a** developer
**I want to** stop my running timer and review/edit the details before logging
**So that** I can correct or add project/notes information

**Acceptance Criteria:**

- [ ] Given a timer is running, when I open stop-timer, then the form shows elapsed time and pre-fills existing data
- [ ] Given I modify fields and submit, then the timer stops and logs with the updated details
- [ ] Given no timer is running, when I open stop-timer, then I see a message saying no timer is running

### Story 4: Timer Status

**As a** developer
**I want to** quickly check if my timer is running and for how long
**So that** I can decide whether to stop or continue

**Acceptance Criteria:**

- [ ] Given a timer is running, when I open timer-status, then I see the elapsed time updating live and can stop it from there
- [ ] Given no timer is running, when I open timer-status, then I see "No Timer Running" and can start one

## Technical Constraints

- Must be a Raycast extension using `@raycast/api` (already set up)
- Must use FreshBooks REST API with OAuth 2.0 authorization code flow + PKCE
- Redirect URI must be `https://raycast.com/redirect/extension` (queryless — FreshBooks disallows query params in redirect URIs). **User action required**: update the redirect URI in FreshBooks developer app from `https://raycast.com/redirect/oauth` to `https://raycast.com/redirect/extension`.
- OAuth client credentials come from user's own FreshBooks developer app (client ID: already registered)
- OAuth scopes: `user:profile:read user:time_entries:read user:time_entries:write user:clients:read user:projects:read user:billable_items:read`
- Single business account — no business selector needed

## Scope Boundaries

### What This Is NOT

- Not a rebuild — the existing code structure, types, cache, hooks, and UI are preserved
- Not adding new commands beyond the 4 that already exist
- Not publishing to the Raycast store (personal use extension)
- Not supporting multiple FreshBooks business accounts
- Not adding manual time entry (only timer-based tracking)
- Not adding time entry history/listing

### Assumptions

- FreshBooks OAuth supports PKCE authorization code flow with `https://raycast.com/redirect/extension` as redirect URI (user must update this in their FreshBooks app settings)
- The user's FreshBooks account has clients, projects, and services data to populate the dropdowns
- Raycast's `OAuth.PKCEClient` handles the browser redirect dance and token storage; manual token exchange is done via fetch with code_verifier

## Critical Review

### Why This Approach

- The extension is already built — fixing auth, headers, and one endpoint gets it working. A rewrite would waste the existing work.
- The auth fix is surgical but thorough: wire up preferences, add code_verifier, add missing scope, fix redirect URI, add token refresh.
- Raycast's `OAuth.PKCEClient` is the standard pattern for custom OAuth — it handles the browser redirect dance and token storage.

### Weak Spots / Trade-offs

- FreshBooks PKCE support is assumed but not confirmed — if they reject code_challenge params, further investigation is needed (but no premature fallback)
- Token refresh timing is best-effort: if a refresh fails, tokens are cleared and the user re-authorizes
- Client-side duration calculation (`Date.now() - started_at`) could drift from FreshBooks' server time, but for time tracking this is acceptable
- Client-side project filtering means fetching all projects even when a client is selected — acceptable for typical account sizes

## Alternatives Considered

### Use Raycast-managed OAuth

- **Description**: Register FreshBooks as a Raycast-managed OAuth provider so `RAYCAST_OAUTH_CLIENT_ID` env vars exist
- **Why rejected**: Only Raycast can add managed providers. Not available for FreshBooks. The user's own OAuth app is the correct approach.

### Replace OAuth with API token

- **Description**: Use a FreshBooks personal access token instead of OAuth
- **Why rejected**: FreshBooks doesn't offer personal access tokens. OAuth is the only authentication method.

## Risks & Mitigations

| Risk                                                 | Likelihood | Impact | Mitigation                                                                                              |
| ---------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------- |
| FreshBooks rejects PKCE code_challenge params        | Low        | High   | Investigate PKCE-proxy or alternative flow — do NOT pre-build a non-PKCE fallback                       |
| Services endpoint response shape doesn't match types | Medium     | Medium | Test against real API, update `ServicesResponse` type to match actual response                           |
| Token refresh fails                                  | Low        | Medium | Clear stored tokens and re-trigger full auth flow on 401 or refresh failure                             |
| Old tokens missing new `billable_items:read` scope   | High       | Medium | Detect scope mismatch, clear tokens, force re-authorization with full scope set                         |

## User Action Required Before Testing

Update the FreshBooks OAuth app redirect URI at `my.freshbooks.com/#/developer` from:
- `https://raycast.com/redirect/oauth` to `https://raycast.com/redirect/extension`

## Acceptance Criteria

- [ ] OAuth flow completes without errors — user can authorize and get tokens
- [ ] Token exchange includes code_verifier and succeeds
- [ ] Token refresh works — user doesn't have to re-authorize on next Raycast launch
- [ ] Re-authorization is triggered when stored tokens lack `user:billable_items:read` scope
- [ ] Toggle timer starts and stops a timer via FreshBooks API
- [ ] Start timer form loads clients, projects, and services from correct endpoints
- [ ] Stop timer form shows running timer data and successfully logs time
- [ ] Timer status shows live elapsed time and "with details" actions launch the correct commands
- [ ] GET requests do not send Content-Type header
- [ ] All interactions are keyboard-only

## Open Questions

- Exact response shape of `GET /comments/business/{businessId}/services` — documented as `services` array + `meta`, but may need minor type adjustments after testing against real API

## Blockers

None. This spec is ready for implementation.
