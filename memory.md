# VectorX — Project Memory

**Purpose:** Preserve the "why" behind technical decisions, the setup steps, and known pitfalls — so future-you (or a teammate) doesn't relitigate settled decisions or rediscover the same bugs.

**Version:** 1.0
**Last Updated:** 2026-08-11

---

## 1. Technical Decisions

### 1.1 Why MongoDB Geospatial (`2dsphere` + `$geoNear`) instead of a separate geo service?
- Native to the database already in use (MERN) — no extra infrastructure (e.g., Elasticsearch, PostGIS) needed for MVP scale.
- `2dsphere` indexes support accurate spherical (great-circle) distance calculations, not flat-plane approximations — important since users can be spread across a wide area.
- `$geoNear` returns a `distance` field directly in the aggregation output, which is exactly what the UI needs to display ("1.8 km away") without a second calculation pass.
- **Trade-off accepted:** At very large scale (millions of products), a dedicated search/geo service (Elasticsearch with geo-queries, or a managed service) would outperform MongoDB's geo indexes for combined full-text + geo + faceted search. This is explicitly deferred — MongoDB geospatial is the right choice for MVP and likely for a long time after, but it's not assumed to be the permanent architecture at massive scale.

### 1.2 Why Redux Toolkit (over Context API or Zustand)?
- Three distinct role-based panels share a codebase; RTK's slice pattern keeps `auth`, `products`, `cart`, `seller`, and `admin` state cleanly separated but still centrally inspectable (Redux DevTools) — valuable when debugging cross-slice flows like "location change → product re-fetch."
- Built-in `createAsyncThunk` (or RTK Query) removes most of the async-state boilerplate that made classic Redux painful, without giving up Redux's predictability and time-travel debugging.
- Context API is fine for small trees but becomes a re-render liability for frequently-changing data like a product list with filters; RTK's selector-based subscription model handles this better out of the box.

### 1.3 RTK Query vs. hand-written thunks — which to use?
- **Recommendation: RTK Query** for `products`, `seller`, and `admin` data fetching (these are classic "fetch server state, cache it, invalidate on mutation" patterns RTK Query is built for).
- **Recommendation: plain slices + thunks** for `auth` and `cart` (these have more custom client-side logic — token storage, cart merging on login — that doesn't map as cleanly to RTK Query's cache model).
- This is a judgment call, not a hard rule — if the solo developer finds maintaining two patterns more overhead than it's worth, standardizing on RTK Query everywhere (including auth/cart as mutations) is a reasonable simplification.

### 1.4 Why Cloudinary (over local disk storage or raw S3)?
- Automatic image optimization, resizing, and CDN delivery out of the box — product images need to load fast on the Buyer panel, and Cloudinary handles responsive delivery without custom image-processing code.
- Free tier is generous enough for MVP development and early production traffic.
- Simple SDK integration from Node (`cloudinary` npm package) with direct-to-cloud upload support, keeping large file uploads off the Express server's memory/bandwidth.
- **Trade-off accepted:** Raw S3 + a custom CDN would be cheaper at very large scale and offers more infrastructure control, but adds meaningful setup complexity (bucket policies, CloudFront, image processing pipeline) that isn't worth it before the product has proven demand.

### 1.5 Why separate `Seller` model referencing `User` (instead of embedding seller fields in `User`)?
- Keeps the `User` collection lean for the (numerically larger) buyer population — most users will never have `shopName`, `bankDetails`, etc.
- Cleaner `2dsphere` indexing story: `User.location` represents "where the buyer currently is" (changes often), while `Seller.location` represents "where the shop is" (essentially fixed) — conflating these into one field on one model would be semantically confusing and require careful conditional logic every time the field is written.
- Seller-specific fields (GST, bank details, verification status) benefit from `select: false` and stricter access control on a dedicated collection, rather than needing field-level ACLs on a shared `User` collection.

---

## 2. Environment Setup

### 2.1 Prerequisites
- Node.js ≥ 18.x, npm ≥ 9.x
- MongoDB Atlas account (free M0 tier is sufficient for development) — **must support `2dsphere` indexing**, which all modern MongoDB versions (≥ 2.4) do.
- Accounts/API keys for: Cloudinary, Stripe (or PayPal), an SMTP provider (or Mailtrap for dev), and optionally Google Maps (geocoding).

### 2.2 Step-by-Step Local Setup

```bash
# 1. Clone the repositories
git clone <backend-repo-url> vectorx-backend
git clone <frontend-repo-url> vectorx-frontend

# 2. Backend setup
cd vectorx-backend
npm install
cp .env.example .env
# → open .env and fill in real values (see §3 below for the full key list)
npm run dev          # starts Express server (typically on :5000)

# 3. Frontend setup (in a new terminal)
cd ../vectorx-frontend
npm install
cp .env.example .env
# → set VITE_API_BASE_URL=http://localhost:5000/api
npm run dev          # starts Vite dev server (typically on :5173)

# 4. Verify
# - Visit http://localhost:5173 — should load the Buyer landing page
# - Check backend terminal for "MongoDB connected" + "2dsphere indexes verified" logs
# - Register a test user, confirm OTP email arrives (or check Mailtrap inbox in dev)
```

### 2.3 Seeding Initial Data
Run the seed script once after first setup to get a usable dev environment:
```bash
cd vectorx-backend
npm run seed          # creates: 1 admin account, a handful of categories,
                       # and optionally sample sellers/products at known coordinates
                       # (useful for manually testing $geoNear ordering)
```

---

## 3. API Keys Needed

| Service | Purpose | Where to get it |
|---|---|---|
| MongoDB Atlas connection string | Database | Atlas dashboard → Connect → Drivers |
| `JWT_SECRET` | Sign/verify auth tokens | Generate locally (`openssl rand -base64 32`) — not a third-party key |
| Cloudinary (`CLOUD_NAME`, `API_KEY`, `API_SECRET`) | Product image storage/CDN | Cloudinary dashboard |
| Stripe (`SECRET_KEY`, `PUBLISHABLE_KEY`, `WEBHOOK_SECRET`) | Payments | Stripe dashboard (test mode keys for dev) |
| PayPal (`CLIENT_ID`, `CLIENT_SECRET`) | Alternative payment method | PayPal Developer dashboard (sandbox app) |
| Google Maps API key | Address autocomplete / pincode geocoding | Google Cloud Console (enable Geocoding API + Places API) |
| SMTP credentials (host, port, user, pass) | OTP + notification emails | Any SMTP provider, or Mailtrap for dev/testing |

> Keep the real `.env` file out of version control (it should already be in `.gitignore`); only `.env.example` with placeholder values gets committed.

---

## 4. Common Pitfalls & Fixes

### 4.1 "Location permission denied" — buyer sees a blank product list
- **Cause:** Frontend only handles the happy path of `getCurrentPosition` and doesn't branch on the error callback.
- **Fix:** `useGeolocation.js` must explicitly catch `error.code === error.PERMISSION_DENIED` (and `POSITION_UNAVAILABLE`/`TIMEOUT`) and immediately surface the manual pincode input — never leave the UI waiting on a promise that will never resolve. Pair this with the backend fallback (`GET /api/products` without `lat`/`lng` → popularity sort) so there's a safety net even if the frontend fallback UI has a bug.

### 4.2 "Geospatial index creation failed" (or queries silently return unsorted/empty results)
- **Common causes:**
  1. Coordinates stored as `[latitude, longitude]` instead of the required `[longitude, latitude]` order — MongoDB GeoJSON is **always** `[lng, lat]`, which is the opposite of how humans usually say coordinates out loud. This is the single most common bug in geospatial MERN apps.
  2. `type: 'Point'` missing or misspelled on a document, so it doesn't validate as GeoJSON.
  3. Index created against a collection that already has invalid legacy coordinate data, which can cause the `createIndex` call to fail entirely.
- **Fix:** Add a Mongoose pre-save validator that rejects any `coordinates` array that isn't `[number, number]` within valid ranges. Log the exact index-creation error on server startup (don't swallow it) so a broken index is caught immediately, not discovered later as "search just doesn't work."

### 4.3 "CORS issues" between frontend and backend
- **Cause:** Default `cors()` middleware with no origin restriction works in dev but often gets "fixed" by developers by allowing `*`, which then breaks in production once cookies/credentials are involved (browsers reject `Access-Control-Allow-Origin: *` combined with `credentials: true`).
- **Fix:** Explicitly whitelist the frontend origin(s) in `app.js`:
  ```javascript
  app.use(cors({
    origin: [process.env.FRONTEND_URL], // e.g. http://localhost:5173 in dev, real domain in prod
    credentials: true
  }));
  ```
  Keep `FRONTEND_URL` as an env var so dev/staging/prod each point to the correct origin without code changes.

### 4.4 Stale product list after a seller updates stock/price
- **Cause:** If using RTK Query, mutation endpoints (`updateProduct`) not invalidating the `Product` tag, so the Buyer panel's cached list doesn't refetch.
- **Fix:** Ensure every seller-side product mutation includes `invalidatesTags: ['Product']` (or a more granular `{ type: 'Product', id }` tag) so RTK Query's cache correctly refetches affected queries.

### 4.5 Multi-seller cart checkout confusion
- **Cause:** Treating the cart as a single order when it actually contains items from multiple sellers leads to a broken `sellerId` reference on the `Order` document.
- **Fix:** At checkout, group cart items by `sellerId` client-side (or server-side, safer) and create one `Order` document per seller, all tagged with a shared `checkoutSessionId` so the payment can be reconciled as one transaction even though it produces multiple orders (see `Architecture.md` §3.4).

---

## 5. Future Scope (Explicitly Deferred, Not Forgotten)

- **AI-based recommendations:** Personalized "you might also like" based on purchase history + location clustering, likely a post-MVP ML microservice rather than baked into the core API.
- **Multi-language support (i18n):** Structure text strings behind a translation layer (`react-i18next` or similar) from day one even without shipping translations, so this isn't a full rewrite later.
- **Mobile app (React Native):** The MERN backend and Redux slices are designed to be UI-layer-agnostic; a React Native client could reuse most of `services/`, `features/*Slice.js`, and API contracts largely unchanged.
- **Hard delivery radius caps:** Currently unlimited-but-ranked (see PRD §9 open questions) — revisit once real usage data shows whether buyers actually want a hard cutoff.
- **Advanced multi-seller cart optimization:** Smarter logic to suggest cart adjustments that reduce the number of separate shipments (e.g., "swap this item for a near-identical one from a seller already in your cart").

---

*Next document: `rules.md` — coding standards, git conventions, and error handling patterns.*
