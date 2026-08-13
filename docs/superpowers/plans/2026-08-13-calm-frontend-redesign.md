# Calm Frontend Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the React + Chakra UI parking service frontend (calm neutral palette, muted accents, more whitespace, consistent rounded corners/soft shadows, Inter typography) without changing any state, API integration, routing, or the Live Lot Map's internal structure.

**Architecture:** Colors and shared style values already funnel through one local `C` constant per file (`App.jsx`, `Checkout.jsx`) or hardcoded hex literals (`Login.jsx`). This plan extracts a single shared `src/theme/palette.js` module that all three files import, updates `src/theme.js` for typography/component defaults, and bumps padding/spacing/radius values on the small set of shared layout primitives (`Card`, `Field`, `ActionRow`, `VehicleTable`, sidebar/topbar/main containers) that most of the UI already routes through. No JSX structure, props, handlers, or state change anywhere.

**Tech Stack:** React 18, Chakra UI 2.8, Vite 5, react-router-dom 7, lucide-react icons.

## Global Constraints

- No changes to state, props, event handlers, API calls (`src/api/parkingApi.js`), WebSocket logic, or routing.
- The Live Lot Map block in `App.jsx` (~lines 1149–1239, inside `Dashboard`) is never directly edited — it inherits the new look only through the shared `Card` component and `C` palette values it already uses.
- No new npm dependencies. The font swap reuses the existing Google Fonts `<link>` mechanism already in `index.html`.
- Every re-themed color that renders as text/icon must hit ≥4.5:1 contrast against the background it's read on (verified below with the sRGB relative-luminance formula, not just eyeballed).
- Prefer Chakra theme + style props over custom CSS; no new CSS files.
- There is no frontend test runner configured in this repo (no jest/vitest/testing-library in `package.json`). Verification per task is: (1) `npm run build` to catch syntax/import errors, and (2) a specific manual visual check via `npm run dev`, per the design spec's Verification Plan (`docs/superpowers/specs/2026-08-13-calm-frontend-redesign-design.md`).

---

## Task 1: Shared palette module

**Files:**
- Create: `src/theme/palette.js`

**Interfaces:**
- Produces: `export const C = { bg, surface, faint, border, borderFocus, text, sub, muted, sidebar, sidebarSub, sidebarLine, sidebarMuted, sidebarText, blue, blueHover, blueSoft, teal, tealSoft, amber, amberSoft, indigo, indigoSoft, green, greenSoft, gray, graySoft, red, redSoft }` (all string hex values) — consumed by Tasks 2, 4, 5, 6.

This is the union of every key used by the current three local `C` objects (`App.jsx`, `Checkout.jsx`) plus `blueHover` (new — replaces the literal `"#1d4ed8"` hover color used today in `Login.jsx`/`Checkout.jsx`). Values are muted/desaturated versions of the originals, each checked below for ≥4.5:1 contrast against white using the WCAG relative-luminance formula (`L = 0.2126·R' + 0.7152·G' + 0.0722·B'` where each channel is linearized from sRGB; contrast `= (1.05) / (L + 0.05)` against white):

| key | value | contrast vs. white | passes AA (4.5:1)? |
|---|---|---|---|
| blue | `#4A6C91` | 5.47:1 | yes |
| teal | `#2F6B60` | 6.7:1 | yes |
| amber | `#8B6239` | 5.39:1 | yes |
| indigo | `#6669A0` | 5.13:1 | yes |
| green | `#4B7A5A` | 4.96:1 | yes |
| gray | `#6C7178` | 4.92:1 | yes |
| red | `#B15850` | 4.79:1 | yes |

- [ ] **Step 1: Create the palette file**

```js
// src/theme/palette.js

// Shared calm/muted color palette for the whole frontend (App, Login, Checkout).
// Every accent color below is checked to keep >=4.5:1 text contrast against white.
export const C = {
  bg: "#F7F6F3",
  surface: "#ffffff",
  faint: "#F1EFEA",
  border: "#E3E1DA",
  borderFocus: "#B9C2C7",

  text: "#2B2E33",
  sub: "#5B5F66",
  muted: "#8B8F96",

  sidebar: "#262A33",
  sidebarSub: "#2E323D",
  sidebarLine: "#3A3E48",
  sidebarMuted: "#8A8E97",
  sidebarText: "#D9DADD",

  blue: "#4A6C91", blueHover: "#3D5A79", blueSoft: "#EEF2F6",
  teal: "#2F6B60", tealSoft: "#EEF7F5",
  amber: "#8B6239", amberSoft: "#FBF3EA",
  indigo: "#6669A0", indigoSoft: "#F0F0F7",
  green: "#4B7A5A", greenSoft: "#F0F5F1",
  gray: "#6C7178", graySoft: "#F5F5F3",
  red: "#B15850", redSoft: "#FBF0EE",
};
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build`
Expected: build succeeds (this file isn't imported by anything yet, so this step just confirms there's no syntax error in the new file).

- [ ] **Step 3: Commit**

```bash
git add src/theme/palette.js
git commit -m "Add shared calm color palette module"
```

---

## Task 2: Update `src/theme.js` (typography, global styles, component defaults)

**Files:**
- Modify: `src/theme.js` (entire file, 24 lines)

**Interfaces:**
- Consumes: `C` from `./theme/palette.js` (Task 1).
- Produces: `export const theme` — same export name/shape as before, consumed unchanged by `src/main.jsx:5` (`import { theme } from "./theme.js"`). No change needed in `main.jsx`.

- [ ] **Step 1: Replace the theme file contents**

Replace the entire current contents of `src/theme.js`:

```js
import { extendTheme } from "@chakra-ui/react";
import { C } from "./theme/palette.js";

export const theme = extendTheme({
  fonts: {
    heading: "'Inter', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  styles: {
    global: {
      body: {
        bg: C.bg,
        color: C.text,
        lineHeight: "tall",
      },
    },
  },
  components: {
    Button: {
      baseStyle: { fontWeight: 700, borderRadius: "lg" },
    },
    Input: {
      defaultProps: { focusBorderColor: C.borderFocus },
      baseStyle: { field: { borderRadius: "lg" } },
    },
    Select: {
      baseStyle: { field: { borderRadius: "lg" } },
    },
    Modal: {
      baseStyle: {
        dialog: { borderRadius: "xl" },
      },
    },
  },
});
```

Note: `Textarea` is intentionally not overridden — it isn't used anywhere in this codebase (confirmed via grep), so there's nothing to visually verify. `Modal`'s override is included per the design spec but is currently inert too: `Modal`/`ModalContent`/etc. are imported in `App.jsx` but never rendered in JSX — leaving the override in is harmless and future-proof, matching the spec.

- [ ] **Step 2: Verify it builds**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Manual visual check**

Run: `npm run dev`, open the app in a browser.
Expected: page background is warm off-white (`#F7F6F3`) instead of the previous cool blue-gray, and any Chakra `Button`/`Input` renders with visibly rounded corners. (Most of the page will still show the *old* accent colors at this point — that's expected, since `App.jsx`/`Login.jsx`/`Checkout.jsx` haven't been migrated yet.)

- [ ] **Step 4: Commit**

```bash
git add src/theme.js
git commit -m "Update theme.js for Inter typography and calm global styles"
```

---

## Task 3: Swap font loading to Inter

**Files:**
- Modify: `index.html:6`

**Interfaces:** None (standalone `<link>` tag change).

- [ ] **Step 1: Replace the Google Fonts link**

Current line 6:

```html
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

Replace with:

```html
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build`
Expected: build succeeds (this is a static HTML change, so this mainly confirms nothing else broke).

- [ ] **Step 3: Manual visual check**

Run: `npm run dev`, open dev tools Network tab, reload.
Expected: a request to `fonts.googleapis.com` for `family=Inter...` succeeds (200), and rendered text visibly uses Inter (compare letterforms — Inter's lowercase "a" and "l" look different from Syne's more geometric/quirky letterforms) instead of Syne.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "Swap Google Fonts link from Syne to Inter"
```

---

## Task 4: Re-skin `App.jsx` — shared palette + structural whitespace bumps

**Files:**
- Modify: `src/App.jsx` (multiple locations, listed below)

**Interfaces:**
- Consumes: `C` from `./theme/palette.js` (Task 1), replacing the local `const C = {...}` (lines 20–43).
- Produces: no exported interface change — `Dashboard`, `Card`, `Field`, `ActionRow`, `VehicleTable`, etc. keep the same names/props/signatures used elsewhere in this file and by nothing outside it.

All edits below are style-value-only (colors, padding, spacing, radius) or literal-hex-to-palette-token swaps. No JSX element is added, removed, or reordered; no prop, handler, or state changes.

- [ ] **Step 1: Replace the local palette with the shared import**

Replace lines 15–16:

```js
import { parkingApi } from "./api/parkingApi.js";
import Login from "./Login.jsx";
```

with:

```js
import { parkingApi } from "./api/parkingApi.js";
import { C } from "./theme/palette.js";
import Login from "./Login.jsx";
```

Then delete the local palette block, lines 19–43:

```js
/* ─── Palette ────────────────────────────────────────────────── */
const C = {
  bg: "#f0f3f8",
  surface: "#ffffff",
  faint: "#f7f8fb",
  border: "#e4e7f0",
  borderFocus: "#bdc3d8",
  text: "#0f1623",
  sub: "#4b5568",
  muted: "#8a92a8",

  sidebar: "#0f1623",
  sidebarSub: "#1c2540",
  sidebarLine: "#253045",
  sidebarMuted: "#5a6480",
  sidebarText: "#c8d0e4",

  blue: "#2563eb", blueSoft: "#eff6ff",
  teal: "#0d9488", tealSoft: "#f0fdfa",
  amber: "#d97706", amberSoft: "#fffbeb",
  indigo: "#6366f1", indigoSoft: "#eef2ff",
  green: "#16a34a", greenSoft: "#f0fdf4",
  gray: "#6b7280", graySoft: "#f9fafb",
  red: "#dc2626", redSoft: "#fef2f2",
};
```

(i.e. remove those 25 lines entirely — `C` now comes from the import added above.)

- [ ] **Step 2: Soften the `RequestedCheckIn` status color**

In the `STATUS` map, replace:

```js
  RequestedCheckIn: { label: "Check-In Req", color: "#60a5fa", soft: "#eff6ff" }, // Light Blue
```

with:

```js
  RequestedCheckIn: { label: "Check-In Req", color: "#5F7B94", soft: C.blueSoft }, // Light Blue (muted)
```

(This keeps the original design intent of a *lighter* blue than `C.blue` for this one status, distinguishing it from `CheckedIn`, but replaces the previously vivid sky-blue literal with a muted tone and reuses the shared `blueSoft` tint instead of a duplicate literal.)

- [ ] **Step 3: Fix the sidebar brand gradient**

Replace:

```js
            <Flex w="32px" h="32px" borderRadius="9px"
              bg="linear-gradient(135deg,#2563eb,#6366f1)"
              align="center" justify="center" flexShrink={0}>
```

with:

```js
            <Flex w="32px" h="32px" borderRadius="9px"
              bg={`linear-gradient(135deg, ${C.blue}, ${C.indigo})`}
              align="center" justify="center" flexShrink={0}>
```

- [ ] **Step 4: Bump sidebar brand block padding**

Replace:

```js
        <Flex align="center" justify="space-between" px={5} py={5} borderBottom={`1px solid ${C.sidebarLine}`}>
```

with:

```js
        <Flex align="center" justify="space-between" px={6} py={6} borderBottom={`1px solid ${C.sidebarLine}`}>
```

- [ ] **Step 5: Bump sidebar nav block padding**

Replace:

```js
        <Box flex={1} px={3} pt={5}>
```

with:

```js
        <Box flex={1} px={4} pt={6}>
```

Replace:

```js
                <Flex key={item.key} as="button" w="full" align="center" gap={2.5}
                  px={3} py={2.5} borderRadius="8px"
```

with:

```js
                <Flex key={item.key} as="button" w="full" align="center" gap={2.5}
                  px={3.5} py={3} borderRadius="9px"
```

- [ ] **Step 6: Bump occupancy widget padding**

Replace:

```js
        <Box px={4} py={5} borderTop={`1px solid ${C.sidebarLine}`}>
```

with:

```js
        <Box px={5} py={6} borderTop={`1px solid ${C.sidebarLine}`}>
```

- [ ] **Step 7: Bump topbar padding and fix its literal border-color shadow**

Replace:

```js
        <Flex px={{ base: 5, md: 8 }} py={3.5} bg={C.surface}
          borderBottom={`1px solid ${C.border}`}
          align="center" justify="space-between"
          position="sticky" top={0} zIndex={10}
          boxShadow="0 1px 0 #e4e7f0">
```

with:

```js
        <Flex px={{ base: 6, md: 10 }} py={4.5} bg={C.surface}
          borderBottom={`1px solid ${C.border}`}
          align="center" justify="space-between"
          position="sticky" top={0} zIndex={10}
          boxShadow={`0 1px 0 ${C.border}`}>
```

- [ ] **Step 8: Bump main content container padding**

Replace:

```js
        <Box px={{ base: 5, md: 8 }} py={5}>
          <Stack spacing={4}>
```

with:

```js
        <Box px={{ base: 6, md: 10 }} py={7}>
          <Stack spacing={5}>
```

- [ ] **Step 9: Bump metric card spacing/padding**

Replace:

```js
            <SimpleGrid columns={{ base: 2, sm: 3, md: 5 }} spacing={3}>
```

with:

```js
            <SimpleGrid columns={{ base: 2, sm: 3, md: 5 }} spacing={4}>
```

Replace:

```js
                <Box key={c.label} bg={C.surface} border={`1px solid ${C.border}`}
                  borderTop={`3px solid ${c.color}`} borderRadius="12px" p={3}
```

with:

```js
                <Box key={c.label} bg={C.surface} border={`1px solid ${C.border}`}
                  borderTop={`3px solid ${c.color}`} borderRadius="14px" p={4}
```

- [ ] **Step 10: Bump split-dashboard grid gap and left-pane stack spacing**

Replace:

```js
            <Grid templateColumns={{ base: "1fr", xl: "1.15fr 0.85fr" }} gap={5} alignItems="start">
```

with:

```js
            <Grid templateColumns={{ base: "1fr", xl: "1.15fr 0.85fr" }} gap={6} alignItems="start">
```

Replace (the `Stack` immediately inside the left `GridItem`):

```js
              <GridItem>
                <Stack spacing={4}>
```

with:

```js
              <GridItem>
                <Stack spacing={5}>
```

- [ ] **Step 11: Bump the shared `Card` component's padding/radius**

Replace:

```js
function Card({ children }) {
  return (
    <Box bg={C.surface} border={`1px solid ${C.border}`} borderRadius="14px"
      p={{ base: 5, md: 6 }} boxShadow="0 1px 3px rgba(0,0,0,0.04)">
      {children}
    </Box>
  );
}
```

with:

```js
function Card({ children }) {
  return (
    <Box bg={C.surface} border={`1px solid ${C.border}`} borderRadius="16px"
      p={{ base: 6, md: 8 }} boxShadow="0 1px 3px rgba(0,0,0,0.04)">
      {children}
    </Box>
  );
}
```

This is the highest-leverage single change in the file: `Card` wraps the tabbed action panel *and* the Live Lot Map pane, so both pick up the new padding/radius without either being edited directly.

- [ ] **Step 12: Bump `Field`'s label spacing/input radius**

Replace:

```js
function Field({ label, required, ...props }) {
  return (
    <FormControl isRequired={required}>
      <FormLabel fontSize="11px" fontWeight="600" color={C.muted}
        letterSpacing="0.06em" mb={1.5}>{label}</FormLabel>
      <Input {...props} size="md" bg={C.surface} border={`1px solid ${C.border}`}
        borderRadius="9px" color={C.text} fontSize="13px"
        _placeholder={{ color: "#bec4d4" }}
        _focus={{ borderColor: C.borderFocus, boxShadow: "none" }}
        _hover={{ borderColor: C.borderFocus }} />
    </FormControl>
  );
}
```

with:

```js
function Field({ label, required, ...props }) {
  return (
    <FormControl isRequired={required}>
      <FormLabel fontSize="11px" fontWeight="600" color={C.muted}
        letterSpacing="0.06em" mb={2}>{label}</FormLabel>
      <Input {...props} size="md" bg={C.surface} border={`1px solid ${C.border}`}
        borderRadius="10px" color={C.text} fontSize="13px"
        _placeholder={{ color: "#bec4d4" }}
        _focus={{ borderColor: C.borderFocus, boxShadow: "none" }}
        _hover={{ borderColor: C.borderFocus }} />
    </FormControl>
  );
}
```

- [ ] **Step 13: Bump `ActionRow`'s padding/radius**

Replace:

```js
function ActionRow({ color, soft, icon, title, sub, loading, disabled, onClick }) {
  return (
    <Flex as="button" onClick={disabled ? undefined : onClick} disabled={loading || disabled}
      align="center" gap={3} px={4} py={3}
      bg={C.surface} borderRadius="10px" border={`1px solid ${C.border}`}
```

with:

```js
function ActionRow({ color, soft, icon, title, sub, loading, disabled, onClick }) {
  return (
    <Flex as="button" onClick={disabled ? undefined : onClick} disabled={loading || disabled}
      align="center" gap={3} px={5} py={3.5}
      bg={C.surface} borderRadius="12px" border={`1px solid ${C.border}`}
```

- [ ] **Step 14: Bump `VehicleTable`'s header/row padding**

Replace:

```js
      <Flex px={4} py={2.5} align="center" gap={2} bg={C.faint} borderBottom={`1px solid ${C.border}`}>
```

with:

```js
      <Flex px={5} py={3} align="center" gap={2} bg={C.faint} borderBottom={`1px solid ${C.border}`}>
```

Replace:

```js
        {visits.length === 0 ? (
          <Box px={4} py={5}>
            <Text fontSize="12px" color={C.muted}>No vehicles</Text>
          </Box>
        ) : visits.map((v, i) => (
          <Box key={v.id} px={4} py={2.5}
```

with:

```js
        {visits.length === 0 ? (
          <Box px={5} py={6}>
            <Text fontSize="12px" color={C.muted}>No vehicles</Text>
          </Box>
        ) : visits.map((v, i) => (
          <Box key={v.id} px={5} py={3}
```

- [ ] **Step 15: Verify it builds**

Run: `npm run build`
Expected: build succeeds with no unresolved `C` references (the old local `const C` is gone, so any spot still referencing an undefined `C` would now fail the build — that's the safety net confirming Step 1's removal was complete).

- [ ] **Step 16: Manual visual check**

Run: `npm run dev`, log in, and visit `/advisor`, `/valet`, and `/admin` (all sub-tabs, including Analytics and Pending Signups).
Expected:
- Sidebar is a softened charcoal (not near-black), main background is warm off-white, all accent colors (status pills, zone dots, metric card icons) read as muted/desaturated rather than vivid.
- Visibly more padding around the tabbed action panel, the metric cards, the sidebar nav items, and the topbar.
- The Live Lot Map pane (right side on `/admin` and other tabs where visible) shows the same zone/slot grid, same hover tooltips, same slot codes and counts as before — only its `Card` wrapper's padding/colors changed. Toggle a check-in/check-out action and confirm slots still update live exactly as before (no behavior change).

- [ ] **Step 17: Commit**

```bash
git add src/App.jsx
git commit -m "Re-skin App.jsx with shared calm palette and more whitespace"
```

---

## Task 5: Redesign `Login.jsx` colors/spacing (structure unchanged)

**Files:**
- Modify: `src/Login.jsx`

**Interfaces:**
- Consumes: `C` from `./theme/palette.js` (Task 1).
- Produces: no change — `export default function Login()` keeps the same signature, same `useState`/`handleSubmit` logic, same route usage in `App.jsx`.

- [ ] **Step 1: Add the palette import**

Replace line 5:

```js
import { parkingApi } from "./api/parkingApi";
```

with:

```js
import { parkingApi } from "./api/parkingApi";
import { C } from "./theme/palette.js";
```

- [ ] **Step 2: Replace the JSX return block**

The `handleSubmit` function and all state (lines 1–62) are unchanged. Replace the entire `return (...)` block (currently lines 64–141) with:

```jsx
  return (
    <Flex minH="100vh" bg={C.bg} align="center" justify="center" p={4}>
      <Box w="full" maxW="400px" bg={C.surface} borderRadius="2xl" boxShadow="0 4px 16px rgba(0,0,0,0.06)" p={10}>
        <Flex direction="column" align="center" mb={10}>
          <Flex w="48px" h="48px" borderRadius="12px" bg={`linear-gradient(135deg, ${C.blue}, ${C.indigo})`} align="center" justify="center" mb={4}>
            <Icon as={ParkingCircle} boxSize={6} color="white" />
          </Flex>
          <Text fontSize="24px" fontWeight="800" color={C.text}>ParkOps</Text>
          <Text fontSize="14px" color={C.muted} mt={1}>{isLogin ? "Sign in to your account" : "Request access"}</Text>
        </Flex>

        <form onSubmit={handleSubmit}>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel fontSize="12px" fontWeight="600" color={C.sub}>Username</FormLabel>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                bg={C.faint}
                border={`1px solid ${C.border}`}
                _focus={{ borderColor: C.blue, boxShadow: `0 0 0 1px ${C.blue}` }}
              />
            </FormControl>

            {!isLogin && (
              <FormControl isRequired>
                <FormLabel fontSize="12px" fontWeight="600" color={C.sub}>Email</FormLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email (for notifications)"
                  bg={C.faint}
                  border={`1px solid ${C.border}`}
                  _focus={{ borderColor: C.blue, boxShadow: `0 0 0 1px ${C.blue}` }}
                />
              </FormControl>
            )}

            <FormControl isRequired>
              <FormLabel fontSize="12px" fontWeight="600" color={C.sub}>Password</FormLabel>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                bg={C.faint}
                border={`1px solid ${C.border}`}
                _focus={{ borderColor: C.blue, boxShadow: `0 0 0 1px ${C.blue}` }}
              />
            </FormControl>

            <Button
              type="submit"
              w="full"
              h="44px"
              bg={C.blue}
              color="white"
              _hover={{ bg: C.blueHover }}
              isLoading={loading}
              mt={4}
            >
              {isLogin ? "Sign In" : "Sign Up"}
            </Button>
          </VStack>
        </form>

        <Flex justify="center" mt={6}>
          <Link fontSize="14px" color={C.blue} fontWeight="500" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </Link>
        </Flex>
      </Box>
    </Flex>
  );
}
```

Every field's `value`/`onChange`, the form's `onSubmit={handleSubmit}`, `isRequired`, and the sign-in/sign-up toggle logic are byte-for-byte identical to before — only style props and color literals changed (to `C.*` tokens) plus the two whitespace bumps from the spec (card `p={8}→{10}`, logo block `mb={8}→{10}`, card radius `16px→2xl`).

- [ ] **Step 3: Verify it builds**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Manual visual check**

Run: `npm run dev`, visit `/login`.
Expected: centered card on a warm off-white background, more breathing room above/below the logo and around the card edges, muted slate-blue accents instead of vivid blue. Toggle "Need an account? Sign up" and back — form still switches between sign-in/sign-up fields exactly as before. Submit with valid/invalid credentials and confirm the existing toast/error/navigation behavior is unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/Login.jsx
git commit -m "Restyle Login page with shared calm palette and more whitespace"
```

---

## Task 6: Update `Checkout.jsx` — shared palette + padding bump

**Files:**
- Modify: `src/Checkout.jsx`

**Interfaces:**
- Consumes: `C` from `./theme/palette.js` (Task 1), replacing the local `const C = {...}` (lines 7–11).
- Produces: no change — `export default function Checkout()` keeps the same signature; `fetchBill`/`handleRequestCheckout`/`handlePayment` are untouched.

- [ ] **Step 1: Replace the local palette with the shared import**

Replace lines 5–11:

```js
import { parkingApi } from "./api/parkingApi.js";

const C = {
  bg: "#f0f3f8", surface: "#ffffff", border: "#e4e7f0",
  text: "#0f1623", muted: "#8a92a8", blue: "#2563eb",
  green: "#16a34a", teal: "#0d9488", amber: "#d97706"
};
```

with:

```js
import { parkingApi } from "./api/parkingApi.js";
import { C } from "./theme/palette.js";
```

- [ ] **Step 2: Remove the now-redundant inline font family and bump the root `Flex`'s padding intent**

Replace (the "processing" `return`, currently around line 108–110):

```jsx
  return (
    <Flex minH="100vh" bg={C.bg} align="center" justify="center" p={4} fontFamily="'Inter', system-ui, sans-serif">
      <Box bg={C.surface} p={6} borderRadius="2xl" boxShadow="0 4px 20px rgba(0,0,0,0.05)" maxW="400px" w="full" border={`1px solid ${C.border}`}>
```

with:

```jsx
  return (
    <Flex minH="100vh" bg={C.bg} align="center" justify="center" p={4}>
      <Box bg={C.surface} p={8} borderRadius="2xl" boxShadow="0 4px 16px rgba(0,0,0,0.06)" maxW="400px" w="full" border={`1px solid ${C.border}`}>
```

(`fontFamily` is removed because `theme.js` now sets Inter globally via `theme.fonts.body`, so the per-component override is redundant per the design spec.)

- [ ] **Step 3: Bump the header block's bottom margin**

Replace:

```jsx
        <Flex align="center" gap={3} mb={6}>
```

with:

```jsx
        <Flex align="center" gap={3} mb={8}>
```

- [ ] **Step 4: Fix the literal payment-button hover color**

Replace:

```jsx
                  _hover={{ bg: "#1d4ed8" }}
```

with:

```jsx
                  _hover={{ bg: C.blueHover }}
```

- [ ] **Step 5: Verify it builds**

Run: `npm run build`
Expected: build succeeds with no unresolved `C` references.

- [ ] **Step 6: Manual visual check**

Run: `npm run dev`, navigate to `/checkout/:visitId` for a visit in each of its states (`AwaitingPayment`, `RequestedCheckout`, `Ready`, loading, error, and checked-out/success).
Expected: same card layout and same state-dependent content, more padding around the card and header, muted palette colors, and the "Pay ₹..." button still triggers `handlePayment` and shows the existing success toast/state transition unchanged.

- [ ] **Step 7: Commit**

```bash
git add src/Checkout.jsx
git commit -m "Restyle Checkout page with shared calm palette and more whitespace"
```

---

## Task 7: Full manual verification pass

**Files:** None (verification-only task; no code changes expected unless a defect is found, in which case fix it in the relevant file from Tasks 4–6 and re-run this task).

**Interfaces:** None.

- [ ] **Step 1: Run the full build**

Run: `npm run build`
Expected: succeeds with no warnings about missing modules/unused `C` imports.

- [ ] **Step 2: Walk every route per the spec's verification plan**

Run: `npm run dev`. Visit, in order:
1. `/login` — both sign-in and sign-up modes (toggle the link).
2. `/advisor` — all 4 sub-tabs (`Request Check-In`, `Request Check-Out`, `Add-On Services`, `Vehicle Tracker`).
3. `/valet` — both sub-tabs (`Visit Actions`, `Add-On Work`).
4. `/admin` — all 4 sub-tabs (`Live Vehicle Data`, `Vehicle Tracker`, `Analytics Dashboard`, `Pending Signups`).
5. `/checkout/:visitId` — for a visit in `AwaitingPayment`, `RequestedCheckout`, `Ready`, and checked-out states (use existing seed data or create a visit via the Check-In flow, then progress it through valet actions to reach each state).

Expected at each: consistent warm-neutral background, muted accent colors, visibly more padding than before, rounded corners, and — critically — identical behavior to before the redesign (every button/toggle/form still does what it did).

- [ ] **Step 3: Confirm the Live Lot Map is unchanged structurally**

On `/admin` (or any tab where it's visible), inspect the "Live Lot Map" pane: zone grouping, slot grid columns, hover tooltips (`title` attribute showing `CODE: vehicle (status)` or `CODE: free`), the LED status dot, and the status legend at the bottom.
Expected: identical structure/behavior to before Task 4 — only the surrounding `Card`'s padding/border/background color changed.

- [ ] **Step 4: Spot-check contrast in dev tools**

Using the browser's accessibility/contrast inspector (e.g. Chrome DevTools' color picker contrast ratio display) on: body text (`C.text` on `C.bg`), a status pill's text (`C.color` on its own `*Soft` background), and the Login submit button's text (white on `C.blue`).
Expected: all read at or above ~4.5:1, consistent with the table computed in Task 1.

- [ ] **Step 5: Commit (if any fixes were needed)**

Only if Steps 2–4 surfaced a defect and you fixed it:

```bash
git add -A
git commit -m "Fix visual regressions found during redesign verification pass"
```

If no defects were found, there is nothing to commit for this task.
