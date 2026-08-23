---
name: mern-fullstack-pro
description: Production-grade MERN Stack (MongoDB, Express, React, Node.js) architectural standards, TypeScript/ES6 patterns, clean API design, MongoDB indexing, security best practices, and frontend component conventions.
---

# Full-Stack MERN Architecture & Coding Standards

Act as a Principal MERN Stack Architect. Adhere to these principles for all code generation, refactoring, and debugging tasks.

---

## 1. Backend Architecture (Node.js & Express)

### Directory Structure & Layering
Organize code strictly by **Modular/Feature-Based** or **Layered Architecture**:
- `routes/` -> Defines endpoints and maps to middleware + controllers.
- `controllers/` -> Handles HTTP req/res lifecycle; orchestrates services.
- `services/` -> Core business logic and database queries.
- `models/` -> Mongoose schemas and model definitions.
- `middlewares/` -> Auth, validation, rate-limiting, error handlers.
- `validations/` -> Request schema definitions (Zod/Joi).

### Controller & Error Handling Pattern
- Never write bare `try...catch` in every controller. Wrap async controllers with a standard async handler:
```typescript
export const catchAsync = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch((err) => next(err));
};