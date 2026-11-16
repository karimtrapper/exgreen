# Grusha website design

The approved type, layout and control reference is the existing [agent page](agents/index.html) and its final [styles](agents/styles.css). The home page uses a quieter light palette in its scoped [stylesheet](assets/css/home.css) and [semantic tokens](tokens.css). Shared navigation keeps its [tokens](assets/shared/tokens.css).

## Type and layout

- Display: local Roboto Condensed, weight 700, upright. Body and controls: local Manrope, weights 400–700.
- Content width: 1280 px. Outer padding: 36 px desktop, 20 px tablet, 16 px narrow mobile.
- Section space: 116 px desktop, 76 px mobile. Cards: 28 px radius. Buttons: 100 px pill, at least 44 px high.
- Page sections retain their IDs, calculator logic, contact routes, legal links and language links.

## Color roles

| Role | Token | Value |
| --- | --- | --- |
| Ink | `--home-ink` | `#111513` |
| Body | `--home-body` | `#28332D` |
| Primary action | `--home-blue` | `#2563EB` |
| Primary hover | `--home-blue-hover` | `#1D4ED8` |
| Link | `--home-green` | `#15803D` |
| Canvas | `--home-canvas` | `#F7F8F6` |
| Soft surface | `--home-soft` | `#F2F4F2` |
| Subtle green tint | `--home-tint` | `#EDF3EF` |
| Line | `--home-line` | `#E1E6E1` |
| White | `--home-white` | `#FFFFFF` |


The primary contact action opens a native dialog. Channel choice calls the existing contact routing with its original context, attribution, and Telegram bot contract.

## Service hierarchy and header

Service component titles are 36–40px desktop and 28–34px mobile; inner fact labels use Manrope70017px and ordinary 15px body rows. Section h2 sizing does not apply to component titles. Shared header contact is Manrope70014px,44px high with a 2px green outline; desktop-only, mobile contact lives in the menu. The hero has no trust-badge row.

## Rounded surfaces

- Large isolated panels on the home and agents pages use a 28–32 px radius. Small fact and FAQ rows use 16–20 px. Controls remain pills.
- The agents cabinet, earnings and final action sit on a neutral canvas with rounded white inner panels. The cabinet video keeps its original media and playback control.
- Home service facts, security facts, partner facts and FAQ answers use soft rounded rows. Financial definitions and tables retain their row structure.

## Section color rhythm

The home hero keeps its light architectural background and opaque white copy and calculator panels. White sections hold services, methods, cases and FAQ; pale blue supports the quiz; muted green supports security; warm cream supports the partner offer and footer. The contact panel is a rounded forest-green inset on a neutral section. The agents page alternates white content with pale green calculator/cabinet, pale blue methods/documents, and warm cream earnings. Its final CTA is a rounded forest-green inset. Action blue and link green retain their existing roles.

On the agents page, payment routes sit on a muted sage canvas. Freehold has a soft green grouped surface; Leasehold has a warm stone grouped surface. White route cards contain tinted, rounded financial rows with dark labels and values. Both groups keep the established 28–32 px geometry.
