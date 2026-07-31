# Roshi UI/UX audit

Target: make Roshi approachable for a first request while keeping frequent
request, comparison, and inspection workflows fast. The visual direction is a
restrained, information-dense desktop tool in the spirit of Cursor and Codex:
clear hierarchy, progressive disclosure, keyboard access, and minimal chrome.

## Design principles

- Put the next valid action in view and explain why unavailable actions are
  blocked.
- Keep the default path small; reveal protocol and diagnostic controls when
  they are needed.
- Preserve context and drafts so experimentation feels safe.
- Make every repeated workflow available from the keyboard.
- Prefer quiet status text, compact badges, and clear focus states over modal
  interruption.

## Phase 1 — foundations and first-request safety

Status: complete in `43e305c`.

- [x] Remove collapsed sidebar content from keyboard and accessibility
      navigation, and restore focus to the visible sidebar control.
- [x] Prevent request and eval toolbar collisions at compact widths.
- [x] Deep-link onboarding actions to the relevant provider, API-key, and model
      controls.
- [x] Explain disabled send actions to pointer and keyboard users.
- [x] Increase undersized high-frequency controls and small toolbar text.
- [x] Persist open request tabs and unsent composer drafts locally.
- [x] Show quiet local draft save status and restore the workspace on launch.

## Phase 2 — simpler setup and configuration

Status: checkpoint committed; compact browser verification remains open under
the completion gates.

- [x] Put the API key and essential provider identity first.
- [x] Move protocol, endpoint, authentication, and custom-header fields behind
      an explicit advanced-settings disclosure.
- [x] Keep advanced settings discoverable and automatically reveal existing
      non-default connection configuration.
- [x] Adapt Settings navigation and provider form layout for compact windows.
- [x] Preserve a fast, fully editable path for custom-provider power users.

## Phase 3 — power-user command flow

Status: pending.

- [ ] Add direct shortcuts for creating, closing, duplicating, and switching
      request tabs.
- [ ] Make the tab strip follow roving-tabindex keyboard semantics.
- [ ] Show unavailable command-palette actions as disabled with a reason rather
      than silently closing the palette.
- [ ] Add command keywords so providers, models, and common actions are easy to
      find by intent.
- [ ] Keep the shortcut reference synchronized with implemented commands.

## Phase 4 — response feedback and accessibility finish

Status: pending.

- [ ] Prevent response metadata and inspection tabs from colliding at compact
      widths.
- [ ] Present request state, HTTP status, latency, and token usage with a clear
      but quiet hierarchy.
- [ ] Keep response export available without crowding the primary reading
      surface.
- [ ] Audit remaining icon-only controls and interactive target sizes in the
      primary request, history, collection, and eval paths.
- [ ] Respect reduced-motion preferences for nonessential transitions and
      loading effects.

## Completion gates

- [ ] Typecheck, full test suite, and lint pass after every phase.
- [ ] Each phase receives its own commit.
- [ ] Desktop and compact-width browser checks show no horizontal overflow.
- [ ] Keyboard-only checks cover setup, tab navigation, commands, and sidebar
      collapse/restore.
- [ ] Final audit verifies every item above from current code and runtime state.
