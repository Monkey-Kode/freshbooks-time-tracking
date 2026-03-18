# FreshBooks Timer Raycast Extension

## Goal

Create a Raycast extension that lets me start/stop FreshBooks time tracking without using a mouse. I have carpal tunnel and need a keyboard-only solution.

## Context

I'm a developer who uses FreshBooks for time tracking. Currently I have to:

1. Navigate to https://my.freshbooks.com/#/time-tracking/
2. Click "Start Timer" button to start
3. When stopping, fill out a form with client/project, service, and notes
4. Click "Log Time" to save

This is painful with carpal tunnel and breaks my flow.

## Requirements

### Core Features

1. **Quick toggle timer** - Single hotkey (cmd+shift+t) to start/stop timer
2. **Start timer with details** - Command that shows form like FreshBooks widget:
   - Client dropdown (optional)
   - Project dropdown (optional, filtered by selected client)
   - Service dropdown (optional)
   - Notes text area ("What are you working on?")
3. **Stop timer with details** - Command that shows same form, pre-filled with current timer data
4. **Timer status** - Quick command to check if timer is running and for how long

### Technical Requirements

- Use Raycast's built-in OAuth support (they handle the OAuth flow)
- All dropdowns should fetch data dynamically from FreshBooks API
- Cache API responses for performance (1 hour TTL)
- Show elapsed time when stopping timer
- Provide visual feedback (HUD for quick actions, toasts for errors)

## FreshBooks API Information

Base URL: `https://api.freshbooks.com`

Key endpoints you'll need:

- `GET /auth/api/v1/users/me` - Get user info including business_id and account_id
- `GET /timetracking/business/{business_id}/time_entries` - List time entries
- `POST /timetracking/business/{business_id}/time_entries` - Start timer
- `PUT /timetracking/business/{business_id}/time_entries/{id}` - Stop/update timer
- `GET /accounting/account/{account_id}/users/clients` - Get clients list
- `GET /projects/business/{business_id}/projects` - Get projects list
- `GET /accounting/account/{account_id}/projects/services` - Get services list

OAuth setup:

- Authorization URL: `https://auth.freshbooks.com/oauth/authorize`
- Token URL: `https://api.freshbooks.com/auth/oauth/token`
- Scopes: `user:profile:read user:time_entries:read user:time_entries:write user:clients:read user:projects:read`

API Docs: https://www.freshbooks.com/api/
use context to review docs `freshbooks-api`

## Implementation Notes

- A timer without a `duration` field is currently running
- Projects can be filtered by client_id query parameter
- When stopping a timer, calculate duration from `started_at` timestamp
- Use Raycast's Form component for the widget-like interface
- Use Raycast's Cache API to store clients/projects/services

## Success Criteria

- I can press cmd+shift+t to instantly toggle my timer
- I can start a timer with full details if needed
- I can stop a timer and add/modify details before logging
- All interactions are keyboard-only
- Forms load quickly with cached data
- Clear feedback on all actions

## Getting Started

1. Create new Raycast extension with OAuth template
2. Set up FreshBooks OAuth app at https://my.freshbooks.com/#/developer
3. Configure OAuth in extension
4. Implement API client
5. Build commands in this order:
   - Toggle timer (simplest)
   - Timer status
   - Start with form
   - Stop with form

Focus on getting the basic toggle working first, then add the forms.
