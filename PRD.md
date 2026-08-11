# VectorX — Product Requirements Document (PRD)

**Project:** VectorX — Location-Based eCommerce Platform
**Stack:** MongoDB, Express.js, React.js, Node.js (MERN) + Redux Toolkit
**Document Owner:** Solo Developer (structured for team-readiness)
**Version:** 1.0
**Last Updated:** 2026-08-11

---

## 1. Vision

VectorX is a hyperlocal eCommerce marketplace that connects buyers with the **nearest available sellers** instead of a generic, distance-agnostic catalog. Every core interaction — search, browsing, checkout — is filtered through the lens of geography. The platform's differentiator (its USP) is that **location is a first-class citizen of the data model and the UX**, not a bolted-on filter.

Where a typical marketplace shows "all matching products," VectorX shows "all matching products *near you*, ranked by real distance," using MongoDB's native geospatial engine (`2dsphere` indexes + `$geoNear`) rather than approximate city/pincode matching.

### 1.1 Problem Statement
Buyers on generic marketplaces routinely receive products from sellers hundreds or thousands of kilometers away, resulting in:
- Long, unpredictable delivery times
- High shipping costs that erode small-seller margins
- Poor support for hyperlocal categories (perishables, same-day services, local artisans)

Sellers, meanwhile, lack a platform that rewards proximity to their actual customer base — they compete nationally instead of dominating their local radius.

### 1.2 Vision Statement
> "Show every buyer the best products from the sellers who can reach them fastest — verified, trackable, and ranked by real distance, not guesswork."

---

## 2. Goals

### 2.1 Business Goals
| Goal | Metric |
|---|---|
| Launch a functional MVP marketplace | 3 working role-based panels (User, Seller, Admin) |
| Prove the location-ranking hypothesis | ≥80% of search sessions return at least 1 result within 10km when sellers exist in range |
| Enable seller onboarding at scale | Seller registration → KYC approval flow completed end-to-end |
| Build a defensible technical foundation | Geospatial queries return sorted results in <500ms at up to 10,000 product documents |

### 2.2 User Goals
- Buyers find relevant products **near them** with minimal friction (auto-location or manual pincode).
- Sellers get visibility proportional to their proximity to active buyers, not just ad spend or ratings.
- Admins have full oversight and control to keep the marketplace trustworthy (KYC, disputes, categories).

### 2.3 Non-Goals (Out of Scope for v1)
- Multi-vendor cart splitting logic beyond basic per-seller order grouping (advanced split-cart optimization is Phase 2+ of the product, not this build).
- Native mobile apps (React Native is explicitly future scope — see `memory.md`).
- AI-based recommendation engine (future scope).
- Multi-language i18n (future scope, structure should allow it but not implement it).
- Real-time chat between buyer and seller.

---

## 3. Target Audience

### 3.1 Primary Personas

**Buyer — "Local Farhana"**
- Lives in a Tier-1/Tier-2 city, shops on mobile primarily.
- Wants fast delivery and is willing to pick a "good enough" product from a nearby seller over a "perfect" product from far away.
- Cares about trust signals: ratings, verified sellers, clear delivery estimates.

**Seller — "Shopkeeper Rahim"**
- Runs a small-to-medium local shop or home business.
- Not highly technical; needs a simple dashboard, not a BI tool.
- Wants visibility to nearby customers without paying for national-scale ad placement.

**Admin — "Platform Ops Ayesha"**
- Responsible for trust & safety, seller verification, dispute resolution, and platform health.
- Needs data-dense views and fast approve/reject/block actions.

---

## 4. User Stories

### 4.1 User (Buyer) Stories
| ID | As a... | I want to... | So that... | Priority |
|---|---|---|---|---|
| U-01 | Buyer | Register/login via email or phone + OTP | I can securely access my account | Must |
| U-02 | Buyer | Grant location access on login (or enter my pincode manually) | Products are ranked by real distance to me | Must |
| U-03 | Buyer | Browse products sorted by nearest seller first | I get faster delivery and support local sellers | Must |
| U-04 | Buyer | Search and filter by category and price | I find exactly what I need quickly | Must |
| U-05 | Buyer | Add products to a cart and a wishlist | I can save and purchase items later | Must |
| U-06 | Buyer | Checkout using Stripe or PayPal | I can pay securely | Must |
| U-07 | Buyer | Track my order status in real time | I know when to expect delivery | Must |
| U-08 | Buyer | Rate and review purchased products | I can share feedback and help other buyers | Should |
| U-09 | Buyer | Update my saved location/address | My future searches reflect where I actually am | Must |
| U-10 | Buyer | View my order history | I can reorder or reference past purchases | Should |
| U-11 | Buyer | See a fallback (rating/popularity sorted) product list if I deny location access | I'm never blocked from browsing | Must |

### 4.2 Seller (Vendor) Stories
| ID | As a... | I want to... | So that... | Priority |
|---|---|---|---|---|
| S-01 | Seller | Register my shop with name, address, and geolocation | Buyers near me can discover my products | Must |
| S-02 | Seller | Submit optional GST/PAN and bank details | I can receive payouts and stay compliant | Should |
| S-03 | Seller | Wait for admin verification before going live | The marketplace maintains trust | Must |
| S-04 | Seller | View a dashboard with orders, revenue, and top products | I can make informed business decisions | Must |
| S-05 | Seller | Add, edit, and delete products with images | I can manage my catalog | Must |
| S-06 | Seller | Track stock levels and get low-stock alerts | I never oversell | Should |
| S-07 | Seller | View and update incoming order statuses | Buyers get accurate delivery updates | Must |
| S-08 | Seller | Understand that my shop's address drives my visibility radius | I can optimize my listing strategy | Should |

### 4.3 Admin (Super Admin) Stories
| ID | As a... | I want to... | So that... | Priority |
|---|---|---|---|---|
| A-01 | Admin | View a dashboard with platform-wide stats | I understand overall platform health | Must |
| A-02 | Admin | View, block, or delete users and sellers | I can enforce platform policy | Must |
| A-03 | Admin | Approve or reject seller KYC submissions | Only verified sellers can sell | Must |
| A-04 | Admin | Manage categories and subcategories | The catalog stays organized | Must |
| A-05 | Admin | View all orders and intervene in disputes | Buyers and sellers get fair resolution | Should |
| A-06 | Admin | Configure delivery charges, commission rates, and coupons | I can control platform economics | Should |
| A-07 | Admin | Generate daily/weekly/monthly sales reports | I can track business performance over time | Nice-to-have |

---

## 5. Functional Requirements

### 5.1 Authentication & Authorization
- FR-1: Role-based registration/login for `user`, `seller`, `admin`.
- FR-2: OTP verification for email or phone at registration.
- FR-3: JWT-based session management with role-scoped middleware (`isUser`, `isSeller`, `isAdmin`).
- FR-4: Password reset flow via email.

### 5.2 Location & Geospatial
- FR-5: Capture buyer location via browser Geolocation API on login, with manual pincode fallback.
- FR-6: Store all location data as GeoJSON `Point` with `2dsphere` indexing on User, Seller, and Product collections.
- FR-7: Product search/listing endpoint must accept `lat`/`lng` query params and return results sorted by real distance using `$geoNear`.
- FR-8: If no location is available (denied permission, no pincode entered), fall back to rating/popularity-based sorting — buyer must never see an empty state due to missing location.
- FR-9: Sellers must set a shop location at registration; this determines their products' discoverability radius.

### 5.3 Product & Catalog
- FR-10: Sellers can perform full CRUD on their own products only.
- FR-11: Product images uploaded and served via Cloudinary.
- FR-12: Products belong to a category/subcategory managed by Admin.
- FR-13: Stock quantity tracked per product; low-stock threshold triggers a dashboard alert for the seller.

### 5.4 Cart, Checkout & Orders
- FR-14: Cart persists per authenticated user (server-synced, not just local state).
- FR-15: Checkout integrates Stripe and/or PayPal.
- FR-16: Orders are split/grouped by seller when a cart contains items from multiple sellers.
- FR-17: Order status lifecycle: `Pending → Processing → Shipped → Delivered` (plus `Cancelled`/`Refunded` as terminal states).
- FR-18: Buyers can rate and review only products from orders marked `Delivered`.

### 5.5 Seller Panel
- FR-19: Dashboard shows total orders, revenue, and top-performing products.
- FR-20: Seller order management view supports status updates that propagate to the buyer's order tracking view.

### 5.6 Admin Panel
- FR-21: Admin can approve/reject seller KYC submissions with a reason field on rejection.
- FR-22: Admin can block/unblock or delete user and seller accounts.
- FR-23: Admin manages global settings: delivery charges, commission rate, coupon codes.
- FR-24: Admin can view all platform orders and mark disputes as resolved.

---

## 6. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | Geospatial product queries return within 500ms for up to 10,000 product documents |
| Scalability | Backend structured to allow horizontal scaling (stateless API, JWT — no server-side session storage) |
| Security | Passwords hashed with bcrypt; JWT secrets and API keys stored in environment variables, never committed |
| Availability | Target 99% uptime for MVP (single-region deployment acceptable at this stage) |
| Usability | Mobile-first responsive design across all 3 panels |
| Accessibility | WCAG 2.1 AA compliance on all user-facing (Buyer) panel screens |
| Maintainability | Modular folder structure, documented API contracts, consistent coding standards (see `rules.md`) |
| Data Integrity | Geospatial indexes validated on server startup; malformed coordinates rejected at the schema/validation layer |
| Observability | Structured error logging on backend; failed geospatial queries logged with query context for debugging |

---

## 7. Feature Priority

### 7.1 Must-Have (MVP — required for launch)
- Role-based auth (User/Seller/Admin) with OTP
- Location capture + geospatial product sorting with fallback
- Buyer: browse, search, filter, cart, checkout, order tracking
- Seller: registration with shop location, product CRUD, order management, basic dashboard
- Admin: seller KYC approval, user/seller management, category management

### 7.2 Should-Have (fast-follow after MVP)
- Ratings & reviews
- Low-stock alerts
- Email notifications for order status changes
- Coupon codes and commission configuration
- Dispute oversight tooling

### 7.3 Nice-to-Have (post-MVP)
- Sales report generation (daily/weekly/monthly export)
- Real-time order updates via Socket.io
- Advanced analytics/charts on seller and admin dashboards

---

## 8. Success Metrics

| Metric | Target |
|---|---|
| Nearby product discovery speed | Products from nearby sellers rendered within 2 seconds of location being available |
| Geospatial query accuracy | 100% of returned "nearby" products fall within the queried radius/sort order (no false ordering) |
| Location fallback coverage | 0% of buyers see a blank product list due to missing/denied location |
| Seller onboarding completion | ≥90% of started seller registrations reach the "pending verification" state (form completion, not drop-off) |
| Order status accuracy | 100% of seller-side status updates reflect on the buyer's tracking view within 5 seconds |
| MVP delivery timeline | Fully functional MVP (all 3 panels) within 8–10 weeks, solo developer |

---

## 9. Assumptions & Constraints

- The Figma design covers **only** the User (Buyer) panel; Seller and Admin panels are designed from scratch following modern dashboard UI conventions (see `design.md`).
- Solo developer — all timelines in `phases.md` assume one person working across full stack.
- Payment gateway sandbox/test-mode credentials will be used through development; production keys are a deployment-time concern.
- MongoDB Atlas (or self-hosted MongoDB ≥ 4.0) is assumed for `2dsphere` and `$geoNear` support.

---

## 10. Open Questions

- Should commission rate be global or category-specific? (Default: global for MVP, extensible later.)
- Should sellers be allowed to serve buyers outside a hard radius cap, or only ranked-but-unlimited? (Default: unlimited but ranked — no hard cutoff for MVP, revisit post-launch.)
- Is phone OTP (SMS) required for MVP, or is email OTP sufficient to reduce third-party SMS provider costs? (Default: email OTP for MVP, SMS as fast-follow.)

---

*Next document: `Architecture.md` — system architecture, schema, and API contracts.*
