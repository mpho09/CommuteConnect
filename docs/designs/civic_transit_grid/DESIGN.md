---
name: Civic Transit Grid
colors:
  surface: '#f7f9ff'
  surface-dim: '#d1dbe7'
  surface-bright: '#f7f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#ecf4ff'
  surface-container: '#e5effb'
  surface-container-high: '#dfe9f6'
  surface-container-highest: '#d9e4f0'
  on-surface: '#131d25'
  on-surface-variant: '#42474d'
  inverse-surface: '#27313b'
  inverse-on-surface: '#e7f2fe'
  outline: '#73777e'
  outline-variant: '#c2c7ce'
  surface-tint: '#40617f'
  primary: '#00253e'
  on-primary: '#ffffff'
  primary-container: '#173b57'
  on-primary-container: '#84a5c6'
  inverse-primary: '#a9caec'
  secondary: '#116875'
  on-secondary: '#ffffff'
  secondary-container: '#a5eefd'
  on-secondary-container: '#1c6e7b'
  tertiary: '#331f00'
  on-tertiary: '#ffffff'
  tertiary-container: '#4f3300'
  on-tertiary-container: '#d4962f'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cde5ff'
  primary-fixed-dim: '#a9caec'
  on-primary-fixed: '#001d32'
  on-primary-fixed-variant: '#284966'
  secondary-fixed: '#a5eefd'
  secondary-fixed-dim: '#89d2e0'
  on-secondary-fixed: '#001f25'
  on-secondary-fixed-variant: '#004e59'
  tertiary-fixed: '#ffddb1'
  tertiary-fixed-dim: '#fdba50'
  on-tertiary-fixed: '#291800'
  on-tertiary-fixed-variant: '#624000'
  background: '#f7f9ff'
  on-background: '#131d25'
  surface-variant: '#d9e4f0'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.015em
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  currency-fare:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
    letterSpacing: 0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

The design system establishes a high-trust, functional, and deeply contextual civic utility aesthetic tailored for South African transit networks. It blends the structural rigor of modern enterprise SaaS with the human accessibility required by daily multi-modal commuters, licensed transport operators, and municipal administrators.

### Personality & Emotional Response
- **Trustworthy & Authoritative:** Instills immediate confidence through deep oceanic navies and crisp structural alignment, signaling institutional reliability and safety.
- **Actionable & Pragmatic:** Prioritizes clarity, high legibility in variable lighting (e.g., bright sunlight at taxi ranks or bus terminals), and rapid decision-making.
- **Vigilant & Secure:** Promotes civic safety with prominent verification signals, strict privacy safeguards, and unambiguous operational states.

### Visual Style
The system employs a **Modern Functional SaaS** framework defined by:
- Controlled, generous whitespace balanced with dense, information-rich data modules.
- Hairline architectural borders (`1px`) paired with soft, low-intensity ambient elevation.
- Clear taxonomic color-coding that separates regulated commercial services (licensed minibus taxis, metered shuttles, commuter coaches) from peer-to-peer communal journeys (carpools and lift clubs).

## Colors

The color architecture is built around functional clarity, institutional trust, and high-contrast legibility across desktop dashboards and mobile web clients.

### Primary Palette & Roles
- **Primary Navy (`#173B57`):** The primary brand anchor. Used for primary navigation shells, authoritative buttons, key structural headers, and verified operator branding.
- **Secondary Teal (`#176B78`):** The corridor accent. Represents transit routes, interactive links, secondary actions, active tabs, and transport corridor telemetry.
- **Accent Amber (`#E3A33B`):** Warm utility highlight. Dedicated to user ratings, peak-hour surges, safety caution banners, and journey badge indicators.
- **Main Text Neutral (`#202A33`):** High-contrast, near-black ink for headlines, card titles, input values, and data tables.
- **Secondary Text Neutral (`#5B6872`):** Muted slate for metadata, SAST timestamps, route subtitles, helper text, and inactive states.

### Surfaces & Boundaries
- **Base Canvas (`#F7F9FA`):** Cool, glare-reducing light background providing separation from white floating surfaces.
- **Surface White (`#FFFFFF`):** Base layer for cards, elevated modals, slide-overs, and structured data tables.
- **Border Default (`#E2E8F0`):** Hairline separation for resting card outlines, divider lines, and table rows.
- **Border Strong (`#CBD5E1`):** Structural boundaries, resting input borders, and nested table headers.

### Semantic & Feedback Colors
- **Success Green (`#26734D`):** Verified operator shields, confirmed seat reservations, on-time status indicators, and valid vehicle licenses.
- **Error Red (`#B3261E`):** Cancelled departures, incident warnings, expired permits, and destructive actions.

## Typography

The design system relies on a single, systematic typeface: **Inter**. This unifies application logic, schedules, and dense administrative tables under one clean grotesque sans-serif.

### Implementation Rules
- **Tabular Numerals (`font-feature-settings: "tnum"`):** Mandatory across all monetary displays (ZAR currency figures such as `R 45.00` and `R 120.00`), transit schedules, arrival estimates, vehicle occupancy counters, and SAST timestamps (`06:45 SAST`).
- **Hierarchy Separation:** 
  - Weight `700` is reserved for terminal destination nodes, pricing highlights, and primary system metrics.
  - Weight `600` anchors navigational labels, card titles, and interactive affordances.
  - Weight `500` handles status badges, metadata headers, and form inputs.
  - Weight `400` covers operational prose, helper text, and secondary details.
- **Route Display:** Local station waypoints and transit hubs (e.g., *Johannesburg CBD*, *Tembisa Plaza zone*, *Centurion Station*) use `title-md` or `headline-sm` with tightened letter tracking (`-0.01em`) to maintain legibility when wrapped on compact mobile screens.

## Layout & Spacing

The layout architecture employs a responsive, fluid grid built on an 8-point baseline rhythm. It effortlessly scales from commuter smartphones on high-vibration train corridors to multi-pane dispatcher workstations.

### Breakpoints & Layout Modalities
- **Desktop (1280px+):** 12-column grid. Margins set to `2rem` (`margin`), column gutters to `1.5rem` (`gutter`). Standard split view: 280px fixed navigation rail, 420px contextual list/feed pane, and fluid master map/detail panel.
- **Tablet (768px - 1279px):** 8-column grid. Margins set to `1.5rem`, gutters to `1rem`. Collapsible sidebar drawer with fluid main content container.
- **Mobile (< 768px):** 4-column grid. Outer margins reduce to `1rem` (`margin-mobile`), gutters compress to `1rem` (`gutter-mobile`). Stacked card feed with persistent bottom navigation tab bar and safe-area padding for handheld use.

### Rhythmic Application
- `space-xs` (4px): Micro gaps between icons and labels, badge internal padding, and table cell tags.
- `space-sm` (8px): Form label-to-input gap, horizontal chip spacing, list-item internal padding.
- `space-md` (16px): Standard internal card padding on mobile, spacing between form field rows, table row padding.
- `space-lg` (24px): Standard internal card padding on desktop, gap between card sections and headers.
- `space-xl` (32px): Major layout section gaps, dashboard widget separation.

## Elevation & Depth

Visual hierarchy is maintained through crisp surface separation, tonal contrast, and restrained ambient shadows that avoid visual fatigue under harsh ambient light.

### Elevation Hierarchy
1. **Canvas (Base 0):** Background surface (`#F7F9FA`). Completely flat with zero shadow.
2. **Surface Resting (Level 1):** Primary operational cards, search filter boxes, and table rows (`#FFFFFF`). Outlined with a hairline `1px solid #E2E8F0` border and paired with an ambient shadow: `box-shadow: 0 1px 3px 0 rgba(23, 59, 87, 0.05), 0 1px 2px -1px rgba(23, 59, 87, 0.05)`.
3. **Surface Elevated / Hover (Level 2):** Hovered journey cards, interactive corridor pickers, and active dropdown menus (`#FFFFFF`). Defined by `1px solid #CBD5E1` and a soft expanded shadow: `box-shadow: 0 4px 6px -1px rgba(23, 59, 87, 0.08), 0 2px 4px -2px rgba(23, 59, 87, 0.05)`.
4. **Modal & Floating Panes (Level 3):** Booking confirmation dialogs, emergency alert popovers, and bottom sheet dialogs (`#FFFFFF`). Elevated using `box-shadow: 0 10px 15px -3px rgba(23, 59, 87, 0.12), 0 4px 6px -4px rgba(23, 59, 87, 0.08)`. Accompanied by a darkened background overlay (`rgba(32, 42, 51, 0.6)`).

### Elevation Rules
- Shadows are tinted using **Primary Navy** (`rgba(23, 59, 87, ...)`) rather than pure black to preserve atmospheric harmony and prevent a muddy look on grey surfaces.
- Elevating an element always pairs with an outline transition (`#E2E8F0` to `#CBD5E1`) to guarantee structural contrast on low-spec mobile displays.

## Shapes

The shape system adopts a roundedness factor of `2` to balance contemporary ergonomics with structured institutional order.

### Shape Scale
- **Small Corners (`0.25rem` / 4px):** Micro chips, status dots, inline tooltips, and table selection checkboxes.
- **Medium Corners (`0.5rem` / 8px):** Form input fields, standard buttons, dropdown menus, filter selectors, and alert callouts.
- **Large Corners (`1rem` / 16px):** Primary journey cards, data widgets, verified operator panels, modal sheets, and slide-in panels.
- **Pill Shapes (`9999px`):** Status badges (e.g., *Verified Operator*, *On-Time*), fare pill displays, and toggle tags.

## Components

### 1. Buttons
- **Primary Button:** Background `#173B57`, text `#FFFFFF`, border `none`, corner radius `0.5rem` (8px), padding `10px 20px`. Hover state: `#102A3E`. Active state: `#0C2030`. Disabled: `#CBD5E1` with `#5B6872` text.
- **Secondary Action Button:** Background `#176B78`, text `#FFFFFF`, corner radius `0.5rem`. Used for corridor searches, booking journey actions, and route tracking.
- **Outline / Ghost Button:** Background transparent, border `1px solid #CBD5E1`, text `#173B57`. Hover: `#F7F9FA` background with `#173B57` border.
- **Destructive Button:** Background `#B3261E`, text `#FFFFFF`. Used for trip cancellations and vehicle deregistration.

### 2. Form Inputs & Selectors
- **Text & Search Fields:** Height 44px (touch-compliant), corner radius `0.5rem` (8px), border `1px solid #CBD5E1`, background `#FFFFFF`, text `#202A33`.
- **Focus State:** Border color `#176B78` with a `0 0 0 3px rgba(23, 107, 120, 0.15)` focus ring. Never use default browser outlines.
- **Labels & Helper Text:** Labels use `label-md` (`#202A33`), helper text uses `body-sm` (`#5B6872`).

### 3. Checkboxes & Radios
- Size: 18px x 18px. Radius: `4px` for checkboxes, `9999px` for radios.
- Resting state: `1.5px solid #CBD5E1` with `#FFFFFF` fill.
- Selected state: Background `#173B57`, check icon in `#FFFFFF`. Focus ring: `3px` ring in `rgba(23, 59, 87, 0.15)`.

### 4. Journey & Corridor Cards
Journey cards display trip listings with clear operational boundaries.
- **Surface:** `#FFFFFF`, `1px solid #E2E8F0`, corner radius `1rem` (16px), padding `1.25rem`.
- **Categorization Header:**
  - *Operator Transport Service (Minibus, Shuttle, Coach):* Features a distinct top accent strip or tag in `#173B57` accompanied by the **Verified Operator Shield** badge (`#26734D`).
  - *Community Shared-Journey (Carpool / Lift Club):* Features an inline pill badge labelled `Community Lift Club` in `#176B78` background tint (`#E8F3F5`), text `#176B78`.
- **Pricing & Timing Display:** Fares formatted as `R 45.00` using `currency-fare` with tabular figures aligned right. Departure time displayed alongside `SAST` (e.g., `06:30 SAST`).
- **Route Display:** Direct waypoints formatted as `[Origin Zone] → [Destination Zone]` (e.g., `Tembisa Plaza zone → Sandton Gautrain zone`).

### 5. Chips & Status Badges
- **Verified Operator Badge:** Background `rgba(38, 115, 77, 0.12)`, text `#26734D`, border `1px solid rgba(38, 115, 77, 0.25)`, icon: shield with checkmark.
- **Status Badges:**
  - *On-Time:* Background `rgba(38, 115, 77, 0.1)`, text `#26734D`.
  - *Filling Fast / Peak Surge:* Background `rgba(227, 163, 59, 0.15)`, text `#996500`.
  - *Cancelled / Disrupted:* Background `rgba(179, 38, 30, 0.1)`, text `#B3261E`.

### 6. Privacy & Location Zones
- To protect commuter and driver privacy, private home addresses are never exposed in listing feeds.
- Elements representing pickup and drop-off points must render with a location pin icon alongside descriptive, neighborhood-scale geofenced terminology:
  - Allowed: `Near Gautrain Midrand Station`, `Tembisa Plaza zone`, `Rosebank Mall exterior perimeter`, `Centurion CBD hub`.
  - Restricted: Precise house numbers or residential gate tags.