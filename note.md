

I am a MERN Stack Developer (MongoDB, Express.js, React.js, Node.js) building a **location-based eCommerce platform** with **3 distinct roles** and **Redux Toolkit** for state management.

## Project Overview:
- **Name:** VectorX
- **Core Feature:** When a user logs in, we capture their location (latitude/longitude via browser Geolocation API or manual pincode input). When they search/browse products, we **prioritize sellers nearest to the user's location** using MongoDB's Geospatial Indexing (`2dsphere`).
- **Tech Stack:** MERN + Redux Toolkit + RTK Query (optional) + Mongoose Geospatial Queries.
- **UI Reference:** I have a **Figma design** (link: [Paste your Figma link here]) which contains the **User Panel** designs. The Figma file does **NOT** have designs for Seller Panel or Admin Panel.

---

## 3 Roles & Panels:

### 1. **User Panel (Buyer)**
- Register/Login with Email/Phone + OTP verification.
- **Location Capture:** On login, ask for location permission (or manual pincode entry).
- **Product Browsing:** See products sorted by **nearest seller first** (based on user's location).
- **Features:** Search, Filters (Category, Price), Add to Cart, Wishlist, Checkout (Stripe/PayPal), Order Tracking, Rate & Review products.
- **Profile:** Update location, view order history, manage addresses.

### 2. **Seller Panel (Vendor)**
- **Seller Registration:** Must provide Shop Name, Shop Address (with pincode/lat-lng), GST/Pan (optional), and Bank Details for payouts.
- **Dashboard:** See analytics (Total Orders, Revenue, Top Products).
- **Product Management:** CRUD operations (Add/Edit/Delete products with images via Cloudinary).
- **Inventory Management:** Track stock levels (Low stock alerts).
- **Order Management:** View incoming orders, update order status (Pending → Processing → Shipped → Delivered).
- **Location Impact:** Seller's address determines product visibility in nearby users' searches.

### 3. **Admin Panel (Super Admin)**
- **Dashboard:** Overview of total users, sellers, orders, revenue.
- **User Management:** View/Block/Delete Users & Sellers.
- **Seller Verification:** Approve/Reject seller registration requests (KYC verification).
- **Category Management:** Add/Edit/Delete product categories & subcategories.
- **Order Oversight:** View all platform orders, intervene if disputes arise.
- **System Settings:** Manage delivery charges, commission rates, coupon codes.
- **Reports:** Generate sales reports (daily/weekly/monthly).

---

## Technical Requirements:

### 1. **Database Schema (Mongoose Models)**
- **User Model:** `name`, `email`, `password`, `role` ('user'|'seller'|'admin'), `location`: { `type`: 'Point', `coordinates`: [longitude, latitude] }, `addresses`: Array.
- **Seller Model:** (extends User or separate) `shopName`, `shopAddress`, `location`: { `type`: 'Point', `coordinates`: [longitude, latitude] }, `isVerified` (Boolean), `bankDetails`, `gstNumber`.
- **Product Model:** `name`, `description`, `price`, `category`, `images`: Array, `sellerId`: (ref: User), `stock`, `location`: { `type`: 'Point', `coordinates`: [longitude, latitude] } — **Index this for geospatial queries**.
- **Order Model:** `userId`, `items`: Array, `totalAmount`, `shippingAddress`, `status`, `paymentMethod`, `paymentStatus`, `sellerId` (for seller-wise orders).

### 2. **Location-Based Product Sorting Logic**
- When user searches, use MongoDB Aggregation:
  ```javascript
  db.products.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [userLng, userLat] },
        distanceField: "distance",
        spherical: true
      }
    },
    { $sort: { distance: 1 } } // Nearest first
  ]);

· Fallback: If location not shared, show products by rating/popularity.

3. Redux State Management

· Slices:
  · authSlice: user data, role, token, location.
  · productSlice: products list (sorted by distance), filters, current product.
  · cartSlice: cart items, total, shipping info.
  · sellerSlice: seller dashboard stats, products, orders.
  · adminSlice: users list, sellers list, platform stats.

4. API Endpoints (RESTful)

· Auth: /api/auth/register, /api/auth/login, /api/auth/verify-otp
· User: /api/users/profile, /api/users/location (update location)
· Products: /api/products?lat=X&lng=Y (returns sorted by distance), /api/products/:id
· Seller: /api/seller/products (CRUD), /api/seller/orders, /api/seller/dashboard
· Admin: /api/admin/users, /api/admin/sellers/verify, /api/admin/categories

---

Design & UI Guidelines (From Figma):

· The Figma design (link:https://www.figma.com/design/Twlxf63DqtHVjEQ11bLNPQ/Shopping--Community-?node-id=0-1&t=QdX7fwVmIB7nbqLw-1 ) contains:
  · User Panel: Homepage, Product Listing, Product Details, Cart, Checkout, User Profile.
  · NOT Included: Seller Dashboard, Admin Dashboard.

Design Instructions for AI (Extend from Figma):

· Color Palette: Use the primary/secondary colors from Figma. Suggest a complementary palette for Seller/Admin panels (e.g., darker shades for admin).
· Seller Dashboard Layout: Sidebar (Dashboard, Products, Orders, Profile) + Main content area with cards, tables, and charts.
· Admin Dashboard Layout: Sidebar (Dashboard, Users, Sellers, Categories, Orders, Settings) + Data tables with action buttons (Approve/Block).
· Responsive: Mobile-first approach. Use Tailwind CSS or Material-UI (MUI) with custom theming to match Figma.
· Components: Reuse Figma's button styles, cards, modals, and input fields across all panels.

---

Development Phases (Focus Areas):

Phase 1: Authentication & Role-Based Access

· JWT with role-based middleware (isUser, isSeller, isAdmin).
· Separate login/register flows for each role.

Phase 2: Location Setup & Geospatial Indexing

· Implement geolocation capture on login.
· Create MongoDB 2dsphere indexes.
· Test $geoNear queries for nearest seller products.

Phase 3: User Panel (from Figma)

· Build all user-facing pages based on Figma design.
· Integrate product listing with location-based sorting.

Phase 4: Seller Panel (Design from scratch)

· Dashboard with charts (using Recharts/Chart.js).
· Product CRUD with image upload.
· Order management table.

Phase 5: Admin Panel (Design from scratch)

· User & Seller management (with approve/reject).
· Platform analytics and settings.

Phase 6: Advanced Features

· Email notifications (Nodemailer) for order updates.
· Real-time order status updates (Socket.io optional).
· Review & Rating system.

Phase 7: Testing, Optimization & Deployment

· Unit tests (Jest), Performance optimization (Lazy loading), Deploy on Vercel/Netlify (Frontend) & Render/Railway (Backend).

---

Output Requirements:

Generate the following 6 Markdown files with detailed, actionable content. Assume I am the sole developer, but structure the docs as if for a team (clear, modular, and professional).

1. PRD.md

· Vision, Goals, Target Audience.
· Detailed User Stories for each role (User, Seller, Admin).
· Functional & Non-functional Requirements.
· Priority features (Must-have vs Nice-to-have).
· Success Metrics (e.g., "Products from nearby sellers shown within 2 seconds").

2. Architecture.md

· High-level system architecture diagram (Client → API → DB).
· Complete folder structure for both Frontend (React) and Backend (Node).
· Database schema with Mongoose models (including geospatial fields).
· API endpoint list with request/response examples (especially the /products?lat=X&lng=Y endpoint).
· Redux state structure and data flow (how location updates trigger product re-fetch).
· Security architecture (JWT, middleware, environment variables).

3. phases.md

· Detailed phase breakdown (7 phases) with weekly timelines (e.g., Phase 1: Week 1).
· Each phase must include:
  · Tasks
  · Deliverables
  · Dependencies
  · Testing criteria
· Special Emphasis: Phase 2 (Location logic) and Phase 4-5 (Seller & Admin panels design).

4. design.md

· UI Component Library: Based on Figma (link provided). Extract colors, fonts, spacing.
· Seller Panel Design: Wireframe suggestions (Sidebar + Content). Define tables, forms, and chart styles.
· Admin Panel Design: Wireframe suggestions. Focus on data-heavy tables and approval workflows.
· UX Flow: User journey from login → location capture → product search → checkout. Include seller and admin journey maps.
· Accessibility: Ensure WCAG 2.1 AA compliance (contrast, ARIA labels).

5. memory.md

· Technical Decisions: Why MongoDB Geospatial? Why Redux Toolkit? Why Cloudinary?
· Environment Setup: Step-by-step local setup (Clone → .env setup → Run backend + frontend).
· Common Pitfalls: "Location permission denied" fallback, "Geospatial index creation failed" fix, "CORS issues" solution.
· API Keys Needed: Stripe, PayPal, Cloudinary, Google Maps (for address autocomplete), Nodemailer SMTP.
· Future Scope: AI-based recommendations, Multi-language support, Mobile app (React Native).

6. rules.md (Extra but essential)

· Coding standards (ESLint, Prettier).
· Git commit conventions (Conventional Commits).
· Error handling patterns.
· Folder naming conventions.

---

Additional Instructions:

· Write each document in clear, professional English (or Bengali if needed) with bullet points and code snippets where necessary.
· For the Seller and Admin panels, since Figma lacks their designs, suggest modern, clean UI patterns (e.g., use MUI Dashboard templates or Tailwind UI components).
· Ensure the location feature is highlighted across all documents—it's the USP of this project.
· Include realistic timelines (e.g., 8-10 weeks total for a solo developer).

---

Start with PRD.md. Generate all 6 documents one by one.



