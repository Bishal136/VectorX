# VectorX — Development Phases & Timeline

**Total Estimated Duration:** 9 weeks (solo developer, full-time equivalent effort)
**Version:** 1.0
**Last Updated:** 2026-08-11

> Timelines assume a solo full-stack developer working roughly 30–35 focused hours/week. Adjust proportionally for part-time schedules. Each phase lists Tasks, Deliverables, Dependencies, and Testing Criteria so progress is verifiable even without a team to review against.

---

## Timeline Overview

| Phase | Focus | Duration | Weeks |
|---|---|---|---|
| 1 | Authentication & Role-Based Access | 1 week | Week 1 |
| 2 | Location Setup & Geospatial Indexing | 1.5 weeks | Week 2 – early Week 3 |
| 3 | User Panel (from Figma) | 2 weeks | Week 3 (late) – Week 4 |
| 4 | Seller Panel (design from scratch) | 1.5 weeks | Week 5 – early Week 6 |
| 5 | Admin Panel (design from scratch) | 1.5 weeks | Week 6 (late) – Week 7 |
| 6 | Advanced Features | 1 week | Week 8 |
| 7 | Testing, Optimization & Deployment | 1 week | Week 9 |

---

## Phase 1: Authentication & Role-Based Access
**Duration:** Week 1

### Tasks
- Scaffold backend (`express`, `mongoose`, `dotenv`, folder structure per `Architecture.md`).
- Scaffold frontend (`vite` + React + Redux Toolkit + Tailwind/MUI setup with Figma theme tokens).
- Build `User` model with `role` enum and password hashing (bcrypt pre-save hook).
- Implement `/api/auth/register`, `/api/auth/verify-otp`, `/api/auth/login`, `/api/auth/refresh`.
- Build `otp.service.js` (email OTP for MVP — see PRD open questions).
- Implement `auth.middleware.js` (`verifyToken`) and `role.middleware.js` (`isUser`, `isSeller`, `isAdmin`).
- Build `authSlice.js` with login/register/logout thunks and token persistence strategy.
- Build separate login/register UI flows for User and Seller (Admin accounts are seeded, not self-registered).
- Implement `ProtectedRoute.jsx` for role-based frontend route guarding.

### Deliverables
- Working register → OTP verify → login flow for `user` and `seller` roles.
- JWT issued and validated correctly; protected route returns 401/403 appropriately.
- Seeded admin account via a one-time seed script (`scripts/seedAdmin.js`).

### Dependencies
- MongoDB Atlas cluster provisioned.
- SMTP credentials available (for OTP email) — see `memory.md` for required keys.

### Testing Criteria
- Unit tests: password hashing, JWT generation/verification, role middleware rejects wrong-role access (Jest).
- Manual: register as each role, confirm OTP gate blocks login until verified, confirm token expiry behavior.

---

## Phase 2: Location Setup & Geospatial Indexing
**Duration:** 1.5 weeks (Special Emphasis Phase)

### Tasks
- Add `location: { type: 'Point', coordinates: [lng, lat] }` to `User`, `Seller`, `Product` schemas.
- Create `2dsphere` indexes on all three collections; verify index creation on server startup (`db.js` should assert indexes exist, not just hope).
- Build `useGeolocation.js` frontend hook: request `navigator.geolocation.getCurrentPosition`, handle `PERMISSION_DENIED`/`POSITION_UNAVAILABLE`/`TIMEOUT` explicitly.
- Build manual pincode-entry fallback UI (`PincodeInput` component) — resolve pincode → approximate lat/lng via a geocoding lookup (Google Maps Geocoding API or a pincode-to-coordinates dataset for MVP simplicity).
- Implement `geo.service.js`: builds the `$geoNear` aggregation pipeline, with a fallback branch that sorts by `rating.average` + `rating.count` when no coordinates are supplied.
- Implement `GET /api/products` with `lat`/`lng` query params wired to `geo.service.js`.
- Wire `authSlice.location` state, and the location → product re-fetch flow described in `Architecture.md` §5.2.
- Add coordinate validation (longitude ∈ [-180,180], latitude ∈ [-90,90]) at the schema/validation layer.

### Deliverables
- `$geoNear` aggregation confirmed working against seeded test data (sellers/products at known coordinates).
- Location fallback verified: denying browser permission still returns a non-empty, sensibly-sorted product list.
- Location update on profile (`PUT /api/users/location`) correctly triggers a product re-fetch in the UI.

### Dependencies
- Phase 1 auth must be complete (location updates are authenticated).
- Decision needed early: geocoding provider for pincode → lat/lng (Google Maps API key, see `memory.md`).

### Testing Criteria
- Automated: seed 3 sellers/products at known distances from a test coordinate; assert `$geoNear` returns them in correct ascending distance order.
- Automated: assert malformed coordinates (e.g., `[200, 95]`) are rejected before reaching the database.
- Manual: test on a real mobile browser with GPS, then deny permission and confirm fallback UX (no blank screen, per PRD FR-8).
- Performance: benchmark `$geoNear` response time against ≥1,000 seeded product documents; target <500ms (per PRD §6).

---

## Phase 3: User Panel (from Figma)
**Duration:** 2 weeks

### Tasks
- Translate Figma screens into React components: Homepage, Product Listing, Product Details, Cart, Checkout, Profile.
- Extract color palette, typography, and spacing tokens from Figma into `styles/theme.js` (see `design.md` for extraction method, since automated Figma scraping isn't available — manual token extraction via Figma's Inspect panel is required).
- Build `productSlice` (or `productApi` if using RTK Query) wired to `GET /api/products`.
- Implement search bar + category/price filters, connected to query params.
- Implement `cartSlice` with add/remove/update-quantity logic, persisted server-side per user.
- Integrate Stripe/PayPal checkout (test/sandbox mode).
- Build order tracking view consuming order `status`.
- Build review/rating submission UI, gated to `Delivered` orders only.
- Build Profile page: update location, manage saved addresses, view order history.

### Deliverables
- Fully navigable Buyer flow: browse (location-sorted) → product detail → cart → checkout → order confirmation → tracking.
- Responsive, mobile-first layout matching Figma at common breakpoints (mobile/tablet/desktop).

### Dependencies
- Phase 2 (location + product API) complete.
- Figma access confirmed and design tokens extracted before component styling begins.

### Testing Criteria
- Manual cross-browser check (Chrome, Safari, mobile Chrome).
- Accessibility pass: keyboard navigation through checkout flow, ARIA labels on interactive elements (WCAG 2.1 AA per PRD).
- End-to-end manual test: complete a full purchase in Stripe test mode and confirm order appears correctly for both buyer and seller.

---

## Phase 4: Seller Panel (Design from Scratch)
**Duration:** 1.5 weeks (Special Emphasis Phase)

### Tasks
- Design and build Seller dashboard layout: sidebar (Dashboard, Products, Orders, Profile) + main content area (see `design.md` for wireframe).
- Build seller registration flow: shop name, address (with geocoding to lat/lng), optional GST/PAN, bank details — submits into `pending` verification state.
- Build dashboard summary cards (Total Orders, Revenue, Top Products) and a basic chart (Recharts or Chart.js) for order volume over time.
- Build Product CRUD UI with Cloudinary image upload (multi-image support, drag-and-drop optional).
- Build stock management UI with low-stock visual indicator.
- Build Order Management table: list, filter by status, update status action.
- Wire `sellerSlice` to `/api/seller/*` endpoints.

### Deliverables
- Seller can complete registration end-to-end and land in a "pending verification" state with clear messaging.
- Verified sellers (manually flipped in DB for testing until Phase 5 admin approval UI exists) can manage products and orders fully.

### Dependencies
- Phase 1 (auth/roles) and Phase 2 (geolocation) complete — seller location determines product visibility per PRD.
- Cloudinary account and API keys provisioned.

### Testing Criteria
- Manual: create a seller, add products, confirm those products appear correctly in User Panel search results sorted by distance.
- Manual: trigger low-stock alert by setting stock below threshold, confirm dashboard indicator appears.
- Manual: update order status as seller, confirm buyer's tracking view reflects the change (verifies the Redux/data flow, not just the UI).

---

## Phase 5: Admin Panel (Design from Scratch)
**Duration:** 1.5 weeks (Special Emphasis Phase)

### Tasks
- Design and build Admin dashboard layout: sidebar (Dashboard, Users, Sellers, Categories, Orders, Settings) + data-dense tables (see `design.md`).
- Build platform stats dashboard (total users, sellers, orders, revenue).
- Build User/Seller management tables with block/unblock/delete actions and search/filter.
- Build Seller KYC verification queue: approve/reject with a required reason field on rejection, triggers email notification.
- Build Category management (CRUD, including subcategory nesting).
- Build platform Order Oversight view (read access to all orders, dispute resolution action).
- Build Settings page: delivery charge, commission rate, coupon code management.
- Wire `adminSlice` to `/api/admin/*` endpoints.

### Deliverables
- Admin can approve a pending seller, which flips `verificationStatus` to `approved` and makes the seller's products live/discoverable.
- Admin can block a user/seller, which immediately revokes their ability to log in (enforced server-side, not just UI-hidden).

### Dependencies
- Phase 4 seller registration flow must exist to have sellers to verify.
- Category management should ideally land before/alongside Phase 3 product creation testing, but is formally delivered here — plan to seed a few categories manually earlier if needed.

### Testing Criteria
- Manual: full KYC loop — seller registers → admin sees in pending queue → admin approves → seller's products become visible in User Panel search.
- Manual: block a seller, confirm their login is rejected and their products no longer appear in search results.
- Security test: confirm non-admin JWTs cannot access any `/api/admin/*` route (403, not just hidden UI).

---

## Phase 6: Advanced Features
**Duration:** 1 week

### Tasks
- Implement Nodemailer email notifications: order confirmation, status change, seller KYC approval/rejection.
- (Optional) Implement Socket.io for real-time order status push to the buyer's tracking view.
- Finalize review & rating system: aggregate rating updates on `Product.rating` when a new review is submitted.
- Polish coupon code application at checkout (validate against Admin-configured coupons).

### Deliverables
- Buyers and sellers receive email notifications at key order lifecycle events.
- Product rating aggregates update correctly and display on Product Listing/Details.

### Dependencies
- Phases 3–5 complete (notifications hook into events from all three panels).
- SMTP provider credentials configured (see `memory.md`).

### Testing Criteria
- Manual: trigger each notification event, confirm email delivery (using a sandbox SMTP like Mailtrap during development).
- Automated: unit test the rating aggregation function with multiple review scenarios (first review, updated average, edge case of 0 reviews).

---

## Phase 7: Testing, Optimization & Deployment
**Duration:** 1 week

### Tasks
- Write/expand Jest unit tests for critical paths: auth, geospatial query, order status transitions, rating aggregation.
- Performance pass: lazy-load route-level components (`React.lazy` + `Suspense`), image lazy-loading on product listings.
- Add MongoDB compound indexes where query patterns warrant it (e.g., `{ category: 1, isActive: 1 }` already noted in `Architecture.md`).
- Environment audit: confirm all secrets are in `.env`, `.env.example` is up to date and committed (values redacted).
- Deploy frontend to Vercel/Netlify; deploy backend to Render/Railway.
- Configure production environment variables on hosting platforms.
- Smoke test the full deployed stack: register → verify → browse (location-sorted) → purchase → seller fulfills → admin oversight.

### Deliverables
- Deployed, publicly accessible MVP across all 3 panels.
- Test suite passing in CI (or documented manual test run if CI is out of scope for MVP).
- `README.md` in both repos with setup and deployment instructions.

### Dependencies
- All prior phases functionally complete.

### Testing Criteria
- Full regression pass against the User Story list in `PRD.md` §4 — each story should be manually verifiable in the deployed environment.
- Load a realistic-sized seed dataset (≥500 products across ≥20 sellers) and confirm geospatial query performance holds against the <500ms target.
- Confirm HTTPS is enforced and no secrets are exposed in client-side bundles (check via browser devtools network/source inspection).

---

## Summary Gantt (Text View)

```
Week:        1    2    3    4    5    6    7    8    9
Phase 1  [████]
Phase 2       [██████]
Phase 3            [████████]
Phase 4                     [██████]
Phase 5                          [██████]
Phase 6                                 [████]
Phase 7                                      [████]
```

---

*Next document: `design.md` — UI component library, wireframes, and UX flows.*
