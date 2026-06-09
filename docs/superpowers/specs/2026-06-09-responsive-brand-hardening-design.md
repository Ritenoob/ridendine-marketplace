# Responsive Brand Hardening Design

## Goal

Fix the responsive issues found in production and make the official RideNDine logo visually consistent across the app family.

## Scope

- Chef mobile dashboard header must not create horizontal page overflow at phone widths.
- Driver authenticated navigation must not send valid users to a missing `/dashboard` route.
- Customer web must allow its current remote marketplace imagery and Vercel analytics script without browser console CSP blocks.
- The shared logo component must align with the official attached RideNDine mark: teal `RideN`, orange `Dine`, and the official compact icon asset where the icon variant is used.
- Add a repeatable production responsive smoke script that checks Customer, Ops, Chef, and Driver at mobile and desktop widths.

## Architecture

This phase is intentionally small and uses existing app boundaries. Layout changes stay in the Chef header. Driver route hardening stays in Driver app routing and login redirect normalization. Customer CSP changes stay in the web app Next config. Responsive proof lives in a reusable `scripts/smoke` Playwright script with a Node test for route definitions and audit thresholds.

## Design Details

### Brand

The existing `apps/*/public/logo.png` and `logo-icon.png` assets already match the attached logo. The shared `Logo` component will keep its API, but the icon variant will render the app-local `/logo-icon.png` inside the SVG wrapper, and the wordmark color order will match the official mark.

### Chef Mobile Header

The Chef header currently lets the right-side notification/avatar group push beyond the viewport. The fix constrains the header with `min-w-0`, reduces mobile gaps, hides the mobile wordmark on narrow screens in favor of the compact official icon, and makes the right control group fit within the viewport.

### Driver Home

The Driver app does not have a `/dashboard` route, but older links and smoke tests can still point there. Add a `/dashboard` compatibility page that redirects to `/`, and normalize login redirects so only safe same-origin paths are used.

### Customer CSP

The customer homepage uses Unsplash images and Vercel analytics assets in production. The CSP will explicitly allow `images.unsplash.com` for images and `va.vercel-scripts.com` plus Vercel insights endpoints for scripts/connects.

### Responsive Smoke

The smoke script will launch Chromium, test `390x844` and `1440x900`, optionally log into protected apps with seeded credentials, inspect horizontal overflow, and fail on missing headings, browser error pages, unexpected 404s, or meaningful overflow. Decorative offscreen background elements will not count when page scroll width remains within viewport.

## Verification

- Node test for responsive smoke configuration and Driver redirect safety.
- Driver focused tests for redirect normalization and `/dashboard` compatibility.
- Chef focused tests for mobile header class contract.
- Full app lint/typecheck where impacted.
- Production smoke after Vercel deployment.

## Self-Review

- No placeholders.
- Scope is limited to responsive, brand, route, and CSP hardening.
- Each failure found in the production audit has a direct fix and verification path.
