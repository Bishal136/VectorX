# VectorX — Engineering Rules & Conventions

**Version:** 1.0
**Last Updated:** 2026-08-11

---

## 1. Coding Standards

### 1.1 ESLint & Prettier
Both repos (`vectorx-backend`, `vectorx-frontend`) use ESLint + Prettier together, with Prettier's formatting rules taking precedence over any conflicting ESLint style rules (`eslint-config-prettier` disables stylistic ESLint rules to avoid fights between the two tools).

**Backend `.eslintrc` baseline:**
```json
{
  "env": { "node": true, "es2022": true, "jest": true },
  "extends": ["eslint:recommended", "prettier"],
  "parserOptions": { "ecmaVersion": "latest", "sourceType": "module" },
  "rules": {
    "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "eqeqeq": "error",
    "prefer-const": "error"
  }
}
```

**Frontend `.eslintrc` baseline:**
```json
{
  "env": { "browser": true, "es2022": true },
  "extends": [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "prettier"
  ],
  "settings": { "react": { "version": "detect" } },
  "rules": {
    "react/prop-types": "off",
    "react-hooks/exhaustive-deps": "warn",
    "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }]
  }
}
```

**Prettier config (shared, `.prettierrc`):**
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 90,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

### 1.2 General Code Style
- Prefer `const` over `let`; never use `var`.
- Prefer async/await over raw Promise chains (`.then()`), except when composing multiple independent async calls with `Promise.all`.
- No magic numbers/strings for domain concepts (order statuses, roles) — use shared constants (`constants/roles.js`, `constants/orderStatus.js`) imported wherever needed, not re-typed string literals scattered across files.
- Keep controller functions thin: validation → call service/model → format response. Business logic (e.g., the `$geoNear` fallback decision) belongs in `services/`, not inline in a controller.
- React components: one component per file, named exports for shared components, default export for page-level components.
- Custom hooks always prefixed `use` and placed in `hooks/`.

---

## 2. Git Commit Conventions

VectorX follows **Conventional Commits**.

### 2.1 Format
```
<type>(<scope>): <short summary>

[optional body]

[optional footer(s)]
```

### 2.2 Types
| Type | Use for |
|---|---|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only changes |
| `style` | Formatting, missing semicolons, etc. (no code logic change) |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or correcting tests |
| `chore` | Build process, tooling, dependency bumps |

### 2.3 Scope Examples
`auth`, `geo`, `product`, `cart`, `order`, `seller`, `admin`, `ui`, `redux`

### 2.4 Examples
```
feat(geo): add $geoNear aggregation with popularity fallback

fix(auth): correct OTP expiry check off-by-one error

refactor(seller): extract dashboard stats query into service layer

docs(architecture): document multi-seller order splitting

chore(deps): bump mongoose to 8.x
```

### 2.5 Branching
- `main` — always deployable.
- `dev` — integration branch (if working with any collaborators; solo dev may skip and branch straight off `main`).
- Feature branches: `feat/geo-fallback-sorting`, `fix/cors-credentials`, etc. — named after the primary commit type + short scope.

---

## 3. Error Handling Patterns

### 3.1 Backend — Centralized Error Handling
All async route handlers are wrapped in an `asyncHandler` utility to avoid repetitive try/catch blocks:

```javascript
// utils/asyncHandler.js
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
```

```javascript
// controllers/product.controller.js
const getProducts = asyncHandler(async (req, res) => {
  const { lat, lng, category, page } = req.query;
  const result = await geoService.getSortedProducts({ lat, lng, category, page });
  res.status(200).json({ success: true, data: result });
});
```

All errors flow to a single centralized handler:
```javascript
// middlewares/error.middleware.js
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  logger.error(`${req.method} ${req.originalUrl} — ${err.message}`);
  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? (statusCode === 500 ? 'Internal server error' : err.message)
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};
```

- Custom errors extend a base `ApiError` class carrying `statusCode`, thrown from services/controllers (`throw new ApiError(404, 'Product not found')`), never bare `throw new Error(...)` for expected/handled cases.
- Validation errors (Joi/Zod) are caught in `validate.middleware.js` and converted to a consistent `400` response shape before ever reaching a controller.

### 3.2 Frontend — Consistent Error Surfacing
- All Redux thunks (or RTK Query `onQueryStarted`) catch and normalize errors into a consistent shape (`{ message, statusCode }`) stored in the relevant slice's `error` field.
- UI components read `state.<slice>.error` and render via the shared `Toast` component — never a raw `alert()` or unhandled console error visible to the end user.
- Network/API errors are distinguished from validation errors: form-level validation errors render inline next to the relevant field; server/network errors render as a toast.
- `axiosInstance.js` includes a response interceptor that catches `401` responses globally and triggers logout + redirect to login, so expired-token handling isn't duplicated in every component.

### 3.3 API Response Shape (Consistent Contract)
Every API response — success or failure — follows the same envelope so the frontend can handle them uniformly:
```javascript
// Success
{ "success": true, "data": { ... }, "pagination": { ... } /* optional */ }

// Failure
{ "success": false, "message": "Human-readable error message" }
```

---

## 4. Folder Naming Conventions

| Type | Convention | Example |
|---|---|---|
| React component files | PascalCase | `ProductCard.jsx`, `SellerSidebar.jsx` |
| Redux slice files | camelCase + `Slice` suffix | `authSlice.js`, `productSlice.js` |
| Backend model files | PascalCase + `.model.js` | `User.model.js`, `Product.model.js` |
| Backend controller files | camelCase + `.controller.js` | `product.controller.js` |
| Backend route files | camelCase + `.routes.js` | `seller.routes.js` |
| Service files | camelCase + `.service.js` | `geo.service.js` |
| Custom hooks | camelCase, `use` prefix | `useGeolocation.js` |
| Folders (both repos) | kebab-case or lowercase (no spaces/underscores) | `components/`, `location-utils/` |
| Constants files | camelCase or SCREAMING_SNAKE inside | `constants/orderStatus.js` exporting `ORDER_STATUS` |
| Test files | mirror source name + `.test.js` | `geo.test.js` for `geo.service.js` |

### 4.1 Import Order (both repos, enforced by ESLint `import/order` if added)
1. External packages (`react`, `mongoose`, `express`)
2. Internal aliases/absolute imports (`@/components`, `@/services`)
3. Relative imports (`./`, `../`)
4. Styles (if applicable)

---

## 5. Pull Request / Self-Review Checklist (even for solo dev)

Even working solo, treat each feature branch merge as a mini-review to keep quality consistent:

- [ ] Follows folder/naming conventions above
- [ ] No hardcoded secrets or API keys
- [ ] New endpoints have role-based middleware applied where appropriate
- [ ] New Mongoose fields with geo data include validation
- [ ] Error paths tested manually (not just the happy path)
- [ ] Commit messages follow Conventional Commits
- [ ] Relevant doc (`Architecture.md`, `memory.md`) updated if the change affects schema, API contracts, or introduces a new technical decision

---

*This completes the VectorX documentation set: `PRD.md`, `Architecture.md`, `phases.md`, `design.md`, `memory.md`, `rules.md`.*
