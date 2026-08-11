# VectorX — Design Document

**Version:** 1.0
**Last Updated:** 2026-08-11
**Figma Reference:** [Shopping / Community — User Panel](https://www.figma.com/design/Twlxf63DqtHVjEQ11bLNPQ/Shopping--Community-?node-id=0-1) *(covers User Panel only — Seller/Admin panels designed from scratch below)*

---

## 1. UI Component Library

### 1.1 Extracting Tokens from Figma
Automated scraping of the Figma file isn't available in this workflow (Figma blocks unauthenticated/automated access to design files), so tokens must be pulled manually, once, using Figma's own tools:

1. Open the file → select any frame/component → use the **Inspect panel** (right sidebar) to read exact hex codes, font family/weight/size, and spacing values.
2. Figma → **Styles** panel (if the file uses shared styles) lists every defined color and text style in one place — faster than inspecting element-by-element.
3. Record everything into `styles/theme.js` (frontend) as the single source of truth, so no component hardcodes a hex value.

Until that extraction is done, use the placeholder palette below — it's built to be a **safe, modern eCommerce default** that's easy to swap once real Figma values are pulled, without restructuring any components (all colors are token references, not literals).

### 1.2 Placeholder / Default Palette

| Token | Hex | Usage |
|---|---|---|
| `primary` | `#2563EB` (blue-600) | Primary CTAs, links, active states — **replace with Figma primary once extracted** |
| `primary-dark` | `#1D4ED8` | Hover/pressed states |
| `secondary` | `#F59E0B` (amber-500) | Badges, ratings, highlights — **replace with Figma secondary once extracted** |
| `success` | `#16A34A` | Delivered status, positive states |
| `warning` | `#D97706` | Low stock, pending states |
| `danger` | `#DC2626` | Errors, block/reject actions |
| `neutral-50` → `neutral-900` | Tailwind gray scale | Backgrounds, borders, body text |

### 1.3 Seller / Admin Complementary Palette
Per the brief, Seller and Admin panels should feel like the same product family but visually distinct enough to signal "you're in a management surface, not the storefront."

| Panel | Base | Rationale |
|---|---|---|
| User (Buyer) | Light background (`neutral-50`), `primary` blue accents | Consumer-facing, bright, inviting — matches Figma |
| Seller | Light background, `primary` accents but a darker sidebar (`neutral-800` bg, white text) | Familiar SaaS-dashboard convention; sidebar contrast signals "workspace" |
| Admin | Darker overall shell (`neutral-900` sidebar + `neutral-100` content area), `secondary` amber used sparingly for approve/reject emphasis | Distinctly heavier/denser than Buyer panel — signals elevated privilege and data-density |

### 1.4 Typography
- **Font family:** Use whatever Figma specifies for the User Panel (typically a system-adjacent sans like Inter, Manrope, or similar for modern eCommerce). Default to **Inter** if the Figma file uses a licensed/unavailable font, since Inter is metrically close to most geometric sans choices and is free.
- **Scale:** Follow a standard modular scale — `text-xs` (12px) through `text-3xl` (30px) — reserving anything larger for hero/landing sections only.

### 1.5 Spacing & Layout
- Base unit: 4px (Tailwind default spacing scale) — confirm against Figma's spacing grid during extraction; most modern Figma eCommerce kits use either a 4px or 8px base.
- Content max-width: `1280px` desktop, full-bleed with `16px`–`24px` side padding on mobile.

### 1.6 Shared Components (used across all 3 panels)
- `Button` (primary, secondary, ghost, danger variants; loading state)
- `Card` (product card, stat card, generic content card)
- `Modal` (confirm dialogs — used heavily in Admin approve/reject and Seller delete-product flows)
- `Input`, `Select`, `Textarea` (consistent focus ring, error state styling)
- `Table` (sortable headers, row actions, pagination — Seller/Admin heavy use)
- `Badge` (order status, verification status, stock status)
- `Toast/Notification` (success/error feedback for all async actions)

---

## 2. Seller Dashboard — Wireframe Guidance

```
┌──────────────┬──────────────────────────────────────────────┐
│              │  Topbar: Shop name · Notifications · Avatar   │
│   Sidebar    ├──────────────────────────────────────────────┤
│              │                                                │
│  ▸ Dashboard │   ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│  ▸ Products  │   │ Orders  │ │ Revenue │ │ Top Prod│  (Cards)│
│  ▸ Orders    │   └─────────┘ └─────────┘ └─────────┘         │
│  ▸ Profile   │                                                │
│              │   ┌────────────────────────────────────────┐  │
│              │   │   Order Volume Chart (Recharts/Chart.js)│  │
│              │   └────────────────────────────────────────┘  │
│              │                                                │
│              │   ┌────────────────────────────────────────┐  │
│  [Logout]    │   │   Recent Orders (Table, last 5)         │  │
│              │   └────────────────────────────────────────┘  │
└──────────────┴──────────────────────────────────────────────┘
```

**Products page:** Table view (image thumbnail, name, price, stock, status toggle, edit/delete actions) with a persistent "+ Add Product" button top-right. Add/Edit opens a form (modal on desktop, full-screen on mobile) with drag-and-drop Cloudinary image upload.

**Orders page:** Table with filter tabs (`All / Pending / Processing / Shipped / Delivered`), each row expandable to show item details, with a status-update dropdown/button inline.

**Forms:** Use grouped sections (Shop Info / Address & Location / Bank Details) with a map-pin confirmation step for the shop location (auto-filled from address via Google Maps geocoding, adjustable by dragging a pin) — this directly reinforces the "your address determines your visibility radius" concept from the PRD.

---

## 3. Admin Dashboard — Wireframe Guidance

```
┌──────────────┬──────────────────────────────────────────────┐
│              │  Topbar: "VectorX Admin" · Admin name         │
│   Sidebar    ├──────────────────────────────────────────────┤
│  (dark bg)   │   ┌────────┐ ┌────────┐ ┌────────┐ ┌───────┐ │
│  ▸ Dashboard │   │ Users  │ │Sellers │ │ Orders │ │Revenue│ │
│  ▸ Users     │   └────────┘ └────────┘ └────────┘ └───────┘ │
│  ▸ Sellers   │                                                │
│  ▸ Categories│   ┌────────────────────────────────────────┐  │
│  ▸ Orders    │   │  Pending Seller Verifications (Queue)   │  │
│  ▸ Settings  │   │  [Shop Name | Submitted | Approve|Reject]│  │
│              │   └────────────────────────────────────────┘  │
│  [Logout]    │                                                │
└──────────────┴──────────────────────────────────────────────┘
```

**Users / Sellers pages:** Dense, filterable/searchable data tables. Row actions use icon buttons with confirm modals for destructive actions (block/delete). Status shown via `Badge` (Active/Blocked, Pending/Approved/Rejected).

**Seller Verification queue:** Each row expands to show submitted KYC details (shop address, GST/PAN, bank details masked). Reject action requires a reason (free-text field in the confirm modal) — this reason is emailed to the seller (Phase 6).

**Categories page:** Nested tree or indented table for parent/subcategory relationships, inline add/edit, drag-to-reorder optional (nice-to-have).

**Settings page:** Simple form groups — Delivery Charges, Commission Rate, Coupon Codes (a small CRUD table for coupons within the same page).

---

## 4. UX Flow

### 4.1 Buyer Journey
```
Landing → Register/Login (+ OTP) → Location Prompt
   → [Grant location] ──────────────┐
   → [Deny → manual pincode] ───────┤
                                     ▼
                        Product Listing (sorted by distance,
                        or by popularity if no location — with
                        a visible "showing popular items" note)
                                     ▼
                        Product Details → Add to Cart
                                     ▼
                        Cart (grouped by seller if multi-seller)
                                     ▼
                        Checkout (address confirm → payment)
                                     ▼
                        Order Confirmation → Order Tracking
                                     ▼
                        (post-delivery) Rate & Review
```

**Key UX principle:** The location prompt must never be a hard blocker. If denied, the pincode fallback should appear inline, immediately, with no dead-end state — this is the most important UX guarantee in the whole product, directly tied to PRD FR-8 and the "0% blank product list" success metric.

### 4.2 Seller Journey
```
Register (as User) → "Become a Seller" → Shop Registration Form
   (Shop Name, Address + Pin Confirm, GST/PAN optional, Bank Details)
        → Submitted → "Pending Verification" screen (clear status, no dead end)
        → [Admin approves] → Email notification → Seller Dashboard unlocked
        → [Admin rejects]  → Email notification with reason → Edit & resubmit
```

### 4.3 Admin Journey
```
Login (seeded admin account) → Dashboard (platform pulse)
   → Sellers → Pending Verification Queue → Review → Approve/Reject
   → Users/Sellers → Search/filter → Block/Unblock/Delete as needed
   → Categories → Maintain taxonomy
   → Orders → Oversight, intervene on flagged disputes
   → Settings → Adjust delivery/commission/coupons as business needs change
```

---

## 5. Accessibility (WCAG 2.1 AA)

- **Contrast:** All text/background pairs meet ≥4.5:1 (normal text) / ≥3:1 (large text ≥18px bold or ≥24px regular). Verify the placeholder palette's `primary` blue on white passes (it does at `#2563EB` on white — ratio ≈ 5.1:1) and re-verify once real Figma colors are swapped in.
- **ARIA labels:** All icon-only buttons (table row actions, cart icon, wishlist heart) require `aria-label`. Form inputs use associated `<label>` elements, not placeholder-only labeling.
- **Keyboard navigation:** Full buyer checkout flow must be completable via keyboard alone (Tab/Shift+Tab/Enter); modal dialogs trap focus and restore it on close.
- **Focus states:** Every interactive element has a visible focus ring — do not remove default outlines without replacing them.
- **Status communication:** Don't rely on color alone for status (e.g., order status Badge should pair color with text/icon, not just a colored dot) — matters especially for the Seller/Admin dashboards which are color-coded (Pending/Approved/Rejected).
- **Motion:** Respect `prefers-reduced-motion` for any chart animations or transitions.

---

*Next document: `memory.md` — technical decisions, environment setup, and pitfalls.*
