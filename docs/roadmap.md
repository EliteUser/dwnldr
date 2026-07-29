# dwnldr Roadmap

Living plan after the feedback/logging hardening and Mantine migration. The app is now on Mantine, so this document is a deployment and future-update artifact rather than a migration checklist.

## Product Goal

A simple, personal-use tool for:

- browsing liked tracks from SoundCloud where the provider makes that practical
- resolving SoundCloud and YouTube track metadata from pasted URLs
- inspecting local MP3 files and editing metadata before export
- downloading or exporting a clean final MP3 with minimal friction
- syncing a local music folder so downloaded/moved tracks can be recognized in the Likes list

Core experience: configure a service, browse or paste a URL, edit what matters, download the result.

## Current State

### Done

- React client is fully migrated from Gravity UI to Mantine.
- Mantine theme, notifications, dropzones, tabs, accordions, buttons, inputs, loaders, and modals are the active UI layer.
- Gravity UI wrappers and imports have been removed from the active client surface.
- Backend routes have request-scoped logs, stable `evt` fields, expected-error normalization, upload size pushback, readiness checks, and temp cleanup hardening.
- Folder sync notifications update in place instead of creating duplicate toasts.
- Remote artwork proxying is bounded and logged.
- The app remains a single-user personal tool with a short download path.

### Keep Watching

- Mantine component specificity can make old app-owned styles ineffective. Keep SCSS modules focused on layout, spacing, and truly app-specific polish.
- Avoid adding broad CSS overrides for Mantine internals unless the component API cannot express the need.
- Keep file upload limits and server validation aligned between client hints and server enforcement.
- Keep download progress/cancellation behavior intact whenever touching `/api/download`, local meta export, or streaming helpers.
- Test on Android over a trusted HTTPS origin when working on File System Access or install/PWA behavior.

## Current Priorities

- Keep the app deployable and easy to diagnose.
- Preserve the short "paste URL -> edit if needed -> download" flow.
- Keep Mantine styling simple: prefer component props/theme defaults over bespoke CSS.
- Maintain safe upload, artwork, metadata, download, and cleanup behavior.
- Add only small app-shell improvements that help personal mobile use, such as installability.

## Later

- Evolve Likes into a broader Services surface if provider browsing becomes a priority.
- Add provider browsing only where a provider has a stable and acceptable integration path.
- Consider code-splitting if the client bundle warning becomes a practical issue.

## Deferred

- Large service/provider expansion work.
- YouTube liked/history browsing unless a stable and acceptable integration path is chosen.
- Format or bitrate selection, because MP3 at best quality covers the current use case.
- Download-option-heavy UX or batch tooling.
- Multi-user features, hosted account systems, or native desktop packaging.

## Principles

- Simplicity wins over configurability.
- Refactors must create clearer boundaries for future work.
- UI orchestrates workflows; business logic lives in services and hooks.
- Adding a new provider should remain contained: provider service, provider routes, provider registry entry, and client adapter.
- Shared UI components and media helpers should not require rewrites for each provider.
- Prefer mature Mantine components over custom components when they cover the use case well.
- Avoid increasing dependence on fragile third-party behaviors.
- Each phase must leave the app deployable.

## Technical Direction

### Feedback and Observability

The app should be easy to understand while using it and easy to diagnose when something fails.

Client feedback should cover:

- clear loading, success, empty, cancellation, and error states for every user action
- actionable notifications for important outcomes, not noisy toasts for routine state changes
- consistent validation messages for URL input, metadata fields, artwork uploads, local MP3 uploads, provider configuration, and folder sync
- progress visibility for long-running work such as metadata resolution, downloads, file rewriting, and folder sync
- cancellation behavior that explains what happened and leaves the UI recoverable
- browser capability failures with clear fallback guidance

Server logging should cover:

- stable event names through `evt`
- request-scoped context through the logger infrastructure
- provider resolution, provider failures, download lifecycle, metadata writing, artwork processing, cleanup, health, and readiness
- enough detail for diagnosis without logging secrets, full user-provided payloads, or noisy internal data
- consistent expected-error handling through `HttpError`

### Mantine Styling Guidelines

Mantine is the active client UI library. Future UI updates should assume Mantine first.

Use Mantine for:

- buttons, tabs, accordions, modals, drawers, notifications, inputs, textareas, loaders, dropzones, avatars, badges, and layout primitives
- component-level defaults that belong in `theme.ts`
- accessible interaction behavior that Mantine already provides

Use SCSS modules for:

- page and feature layout
- scroll containers, virtualized list shells, responsive grids, and sticky/overlay positioning
- app-specific empty states, artwork previews, crop surfaces, and track-row states
- small visual polish that cannot be expressed cleanly through Mantine props

Avoid:

- resurrecting Gravity UI tokens, imports, or wrappers
- broad `:global` styling of Mantine internals
- `!important` unless it is isolated, documented by context, and clearly necessary
- page-level CSS that fights Mantine component props

### Mobile and PWA

The app is used on Android and should remain comfortable as an installed web app.

Baseline expectations:

- app manifest exists and uses `display: standalone`
- install icons are local assets
- browser chrome is hidden when launched from the installed app icon
- service worker remains minimal unless offline behavior is intentionally designed
- mobile layout keeps text and action surfaces usable without horizontal overflow

### Services Surface

Services remains the latest planned product phase. It should build on the provider architecture without forcing broad provider expansion before the app needs it.

Goal:

- evolve Likes into a multi-provider browsing surface
- drive available service views through provider capabilities
- keep SoundCloud favorites as the first real collection adapter
- add a YouTube placeholder only if liked/history browsing still lacks a stable integration path
- support per-provider configuration from Settings
- keep folder sync integration shared rather than owned by Services

Done when:

- SoundCloud likes are browsed through provider-agnostic Services UI.
- Additional providers can plug into Services through adapters and capabilities.
- YouTube collection browsing is either implemented through a chosen stable path or explicitly stubbed as unavailable.

## Roadmap

### Phase 1: Stabilize and Deploy

Goal: keep the current Mantine app safe, observable, and deployable.

Tasks:

- Keep backend validation, upload limits, logging, readiness, and cleanup behavior covered by tests.
- Keep frontend user feedback consistent across Likes, Download, Meta, Settings, and folder sync.
- Keep PWA installability working for Android personal use.
- Remove stale CSS and old migration leftovers as they are discovered.
- Verify `pnpm check` before deployment.

Done when:

- Health and readiness endpoints are reliable.
- Download and metadata export flows are safe for normal and oversized inputs.
- The client builds cleanly and remains installable.
- No obsolete Gravity UI artifacts remain in active code.

### Phase 2: Services Tab

Goal: evolve Likes into a multi-provider browsing surface when that becomes the next product priority.

Tasks:

- Rename and restructure the Likes tab into a Services tab.
- Build a provider selector driven by provider capabilities.
- Build a provider-agnostic track list.
- Migrate SoundCloud favorites to the Services pattern as the first real collection adapter.
- Add a YouTube placeholder only if liked/history browsing does not have a stable integration path yet.
- Support per-provider configuration from Settings.
- Keep folder sync integration shared rather than owned by Services.
- Add tests for provider capability selection, unsupported provider collections, and SoundCloud favorites behavior.

Done when:

- SoundCloud likes are browsed through provider-agnostic Services UI.
- Additional providers can plug into Services through adapters and capabilities.
- YouTube collection browsing is either implemented through a chosen stable path or explicitly stubbed as unavailable.

## Execution Order

1. **Phase 1** - Stabilize and Deploy
2. **Phase 2** - Services Tab

## Working Rules

- Keep the default user path short and obvious.
- Prefer Mantine components over custom UI when the library covers the interaction well.
- Keep SCSS modules for app-specific layout and styling.
- Adding a new provider should be contained and predictable, not a cross-cutting rewrite.
- Avoid adding dependencies unless they clearly reduce long-term complexity.
- Each refactor must leave the app deployable.
- Do not treat provider integrations as equal until their real API and authentication constraints are understood.
