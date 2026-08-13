# Calm Frontend Redesign — Design Spec

## Goal

Restyle the existing React + Chakra UI parking service frontend into a calmer,
more elegant visual language — soft neutral palette, muted accent colors,
more whitespace, consistent rounded corners/soft shadows, and a more legible
typeface. This is a **visual and layout refactor only**: no state management,
API integration, business logic, event handlers, or the Live Lot Map's
internal structure change.

## Current state (as found)

- `src/theme.js` (24 lines) — minimal: font family (`Syne` + `JetBrains Mono`
  loaded via Google Fonts `<link>` in `index.html`), global body bg/color, and
  `Button`/`Input` base style overrides. Not otherwise used for color.
- `src/App.jsx` (~1380 lines) — single-file dashboard (sidebar nav, topbar,
  per-role tabs, the "Live Lot Map" occupancy grid). Nearly all color comes
  from one local `const C = {...}` object referenced as `C.blue`, `C.text`,
  etc. throughout the JSX. Layout/spacing/shadows flow through a small set of
  shared sub-components: `Card`, `SLabel`, `Section`, `Field`, `AppBtn`,
  `ActionRow`, `StatusPill`, `VehicleTable`.
- `src/Login.jsx` (141 lines) — already structured as `Flex` (full-height,
  centered) → `Box` card (`boxShadow`, `borderRadius`, `maxW`) → `VStack
  spacing={4}` of `FormControl`s → submit `Button`. Colors are local hardcoded
  hex literals matching (but independent of) App.jsx's palette.
- `src/Checkout.jsx` (208 lines) — same pattern as Login: its own local `const
  C = {...}` (subset of the same hex values), same centered-card shape.
- There is **no geographic map library** anywhere in this repo (no Leaflet,
  no Google Maps). The only "map" is the **Live Lot Map** section inside
  `Dashboard` in `App.jsx` (~lines 1149–1239): a zone/slot occupancy grid
  rendered via `Card` → `Stack` → `SimpleGrid` of slot `Box`es. Confirmed with
  user this is the component that must not be structurally touched.
- Fonts are loaded via a Google Fonts `<link>` tag in `index.html` (no
  `@fontsource` package installed).

Because color and spacing already funnel through a small number of shared
constants/components, a calm re-theme can be achieved by editing those central
points rather than touching hundreds of individual call sites.

## Non-goals / constraints

- No changes to state, props, event handlers, API calls (`parkingApi.js`),
  WebSocket logic, routing, or the Live Lot Map's DOM structure/props/logic.
- No new dependencies unless unavoidable (font swap uses the existing Google
  Fonts `<link>` mechanism already in place, not a new package).
- Maintain WCAG AA contrast (≥4.5:1 for body text, ≥3:1 for large
  text/icons) for every re-themed color pairing.
- Prefer Chakra theme + style props over custom CSS.

## File-touch map

| File | Change type |
|---|---|
| `src/theme.js` | Edit — typography, global styles, component default props (Button/Input/Select/Modal/Textarea radius + focus ring), documented shadow convention |
| `src/theme/palette.js` | **New** — single shared calm palette object, replacing the three duplicated `C` objects |
| `src/App.jsx` | Edit — import shared palette instead of local `C`; increase padding/spacing on shared sub-components (`Card`, `Field`, `ActionRow`, sidebar/topbar/page-gutter containers) and Login's card. Live Lot Map block itself (~1149–1239) is not directly edited — it inherits the new look via `Card`/`C`. |
| `src/Login.jsx` | Edit — import shared palette; keep existing `Flex`→`Box card`→`VStack` structure; bump card padding/spacing; round corners up slightly |
| `src/Checkout.jsx` | Edit — import shared palette instead of local `C`; same cosmetic treatment as Login (structure unchanged) |
| `index.html` | Edit — swap Google Fonts `<link>` from Syne to Inter; keep JetBrains Mono |

## Typography

- `theme.fonts.heading` and `theme.fonts.body` → `"'Inter', system-ui,
  sans-serif"`. `theme.fonts.mono` stays `"'JetBrains Mono', monospace"`
  (used for slot codes/vehicle numbers — a deliberate detail worth keeping).
- `index.html`'s font `<link>` updated to fetch Inter (weights 400/500/
  600/700/800) alongside the existing JetBrains Mono weights.
- `styles.global.body`: `lineHeight: "tall"`, base font size unchanged at the
  Chakra default (16px) — no component should render body copy below ~13px
  (existing small metadata text such as timestamps may stay at the current
  ~10-11px since it's supplementary, not primary reading content).
- Apply fonts only via the theme — no per-component `fontFamily` overrides
  except `Checkout.jsx`'s existing inline `fontFamily="'Inter', ..."` on its
  root `Flex`, which becomes redundant and should be removed once the theme
  sets it globally.

## Shared palette (`src/theme/palette.js`)

Same keys as today's three `C` objects (union of all keys used across
App.jsx/Login.jsx/Checkout.jsx) so every call site keeps working unchanged
after the import swap. Values move from vivid/cool to muted/warm-neutral:

| role | current | new (calm) |
|---|---|---|
| bg | `#f0f3f8` | `#F7F6F3` |
| surface | `#ffffff` | `#ffffff` |
| faint | `#f7f8fb` | `#F1EFEA` |
| border | `#e4e7f0` | `#E3E1DA` |
| borderFocus | `#bdc3d8` / `#c8ccd8` | `#B9C2C7` |
| text | `#0f1623` | `#2B2E33` |
| sub | `#4b5568` | `#5B5F66` |
| muted | `#8a92a8` | `#8B8F96` |
| sidebar | `#0f1623` | `#262A33` |
| sidebarSub | `#1c2540` | `#2E323D` |
| sidebarLine | `#253045` | `#3A3E48` |
| sidebarMuted | `#5a6480` | `#8A8E97` |
| sidebarText | `#c8d0e4` | `#D9DADD` |
| blue (primary) | `#2563eb` | `#4A6C91` |
| blueSoft | `#eff6ff` | `#EEF2F6` |
| teal | `#0d9488` | `#3F8579` |
| tealSoft | `#f0fdfa` | `#EEF7F5` |
| amber | `#d97706` | `#A8763E` |
| amberSoft | `#fffbeb` | `#FBF3EA` |
| indigo | `#6366f1` | `#6669A0` |
| indigoSoft | `#eef2ff` | `#F0F0F7` |
| green | `#16a34a` | `#5C8F6D` |
| greenSoft | `#f0fdf4` | `#F0F5F1` |
| gray | `#6b7280` | `#767B85` |
| graySoft | `#f9fafb` | `#F5F5F3` |
| red | `#dc2626` | `#B15850` |
| redSoft | `#fef2f2` | `#FBF0EE` |

Every text/icon-bearing accent (`blue`, `teal`, `amber`, `indigo`, `green`,
`red`, `gray`) must be verified against `surface`/`bg` for ≥4.5:1 contrast
during implementation before being finalized — the hex values above are a
first-draft direction, not final-locked numbers; small adjustments to hit
contrast targets are expected and fine.

`STATUS` and `ZONES` in `App.jsx` reference `C.blue`/`C.green`/etc. directly
and need no structural change — they pick up the new tones automatically
through the shared import.

## Component defaults (`theme.js`)

- `Button`: keep `fontWeight: 700`, change `borderRadius` to Chakra's `"lg"`
  token-driven value for consistency with Input/Select.
- `Input`, `Select`, `Textarea`: default `borderRadius: "lg"`,
  `focusBorderColor` set to the new muted `borderFocus`/`blue` tone (replacing
  the current bright-blue focus ring used ad hoc in Login.jsx/App.jsx).
- `Modal`: `dialog` base style gets `borderRadius: "xl"` to match the rest of
  the app (currently uses Chakra's default ~6px radius).
- Shadow convention (documented, not necessarily a new theme token, since
  existing code uses literal `boxShadow` strings): resting cards use `"0 1px
  3px rgba(0,0,0,0.04)"`, elevated/floating surfaces (login card, checkout
  card, modals) use `"0 4px 16px rgba(0,0,0,0.06)"`. Existing literal
  `boxShadow` strings in `App.jsx`/`Login.jsx`/`Checkout.jsx` are normalized
  to these two values instead of the current mix of slightly different rgba
  strings.

## Layout / whitespace changes

No structural JSX changes — only padding/spacing prop values increase by
roughly one Chakra spacing step:

- `Card` (App.jsx sub-component): `p={{ base: 5, md: 6 }}` → `p={{ base: 6,
  md: 8 }}`.
- `Login.jsx` card: `p={8}` → `p={10}`, logo/title block `mb={8}` → `mb={10}`,
  card `borderRadius="16px"` → `borderRadius="2xl"`.
- `Checkout.jsx` card: `p={6}` → `p={8}`, header block `mb={6}` → `mb={8}`.
- Dashboard's sidebar/topbar/page-gutter container padding increased by one
  step where currently tight (exact values finalized during implementation by
  reading the surrounding container props, since they weren't enumerated line
  by line in this spec).
- `Field`, `ActionRow`, `VehicleTable` row padding get a modest bump
  (~2px/one Chakra spacing unit) consistent with the rest.

The Live Lot Map grid's own internal slot-cell sizing (`h="44px"`,
`spacing={1.5}` in the `SimpleGrid`) is **not** touched — only the `Card` it
sits inside changes padding, per the "cosmetic wrapper only" constraint.

## Login page

Structure stays exactly as today (`Flex` → `Box` card → `form` → `VStack
spacing={4}` → `FormControl`s → `Button`). Only style props and imported
color values change:

- Card padding/radius per above.
- All hardcoded hex colors (`#2563eb`, `#f0f3f8`, `#0f1623`, `#e4e7f0`, etc.)
  replaced with the shared palette's `blue`, `bg`, `text`, `border`.
- Input `_focus` styling uses the new muted focus ring instead of the current
  bright blue box-shadow glow.
- Form fields, validation (`isRequired`), and `handleSubmit` logic are
  byte-for-byte unchanged.

## Verification plan

Since this is a pure visual/layout refactor with no state or API changes:

1. Run `npm run dev` and visually check each route: `/login` (both sign-in
   and sign-up modes), `/advisor`, `/valet`, `/admin` (all sub-tabs
   including Analytics and Pending Signups), and `/checkout/:visitId` in its
   loading/error/AwaitingPayment/RequestedCheckout/Ready/CheckedOut states.
2. Confirm the Live Lot Map renders identically in structure/behavior
   (hover states, slot click title tooltips, zone counts) — only colors/
   surrounding Card padding should visibly differ.
3. Spot-check contrast of the new muted accent colors against their
   backgrounds (dev tools contrast checker) for at least the primary text/
   icon pairings (`text` on `bg`/`surface`, each accent color on `surface`
   and on its own `*Soft` tint).
4. Confirm no console errors/warnings introduced (e.g. missing font, broken
   import path for the new palette module).
5. No automated test suite exists for the frontend currently; this remains
   manual/visual verification only.
