# VectorX — User API Documentation

**Base URL:** `/api/users`  
**Authentication:** All endpoints require a valid JWT access token in the `Authorization` header.  
**Role Required:** `user` (or higher, but admin endpoints are separate).

---

## 1. Get Profile

**GET** `/profile`

Retrieve the authenticated user's profile data (excluding password and refresh tokens).

**Response** `200 OK`
```json
{
  "success": true,
  "data": {
    "_id": "665f1a2b3c4d5e6f7890abcd",
    "name": "Farhana Akter",
    "email": "farhana@example.com",
    "phone": "+8801712345678",
    "role": "user",
    "isVerified": true,
    "location": {
      "type": "Point",
      "coordinates": [90.4125, 23.8103]
    },
    "addresses": [
      {
        "label": "Home",
        "line1": "123/A, Dhanmondi",
        "city": "Dhaka",
        "pincode": "1205",
        "coordinates": [90.4125, 23.8103],
        "isDefault": true
      }
    ],
    "wishlist": ["665f1a2b3c4d5e6f7890abce"],
    "isBlocked": false,
    "createdAt": "2026-08-11T10:00:00.000Z",
    "updatedAt": "2026-08-11T10:00:00.000Z"
  }
}
```

**Errors**
- `401 Unauthorized` – Missing or invalid token.
- `404 Not Found` – User not found (should not happen if token is valid).

---

## 2. Update Profile

**PUT** `/profile`

Update the user's profile fields. Only fields sent in the request body will be updated.

**Request Body** (all fields optional)
```json
{
  "name": "Farhana Rahman",
  "phone": "+8801712345678",
  "addresses": [
    {
      "label": "Office",
      "line1": "Level 5, Gulshan Tower",
      "city": "Dhaka",
      "pincode": "1212",
      "coordinates": [90.4155, 23.7911],
      "isDefault": false
    }
  ]
}
```
> **Note:** The `addresses` array, if provided, **replaces** the existing list entirely. To add/update a single address, send the full array.

**Response** `200 OK`
```json
{
  "success": true,
  "data": {
    "_id": "665f1a2b3c4d5e6f7890abcd",
    "name": "Farhana Rahman",
    "email": "farhana@example.com",
    "phone": "+8801712345678",
    "addresses": [ ... ],
    "updatedAt": "2026-08-11T10:05:00.000Z"
  },
  "message": "Profile updated successfully"
}
```

**Validation Errors** `400 Bad Request`
- `name` too long / empty
- `phone` invalid format
- `addresses` invalid structure

---

## 3. Update Location

**PUT** `/location`

Update the user's current location (either via browser geolocation or manual pincode). This location is used for product sorting and is stored as a GeoJSON point.

**Request Body** (either `coordinates` or `pincode` must be provided)
```json
{
  "coordinates": [90.4125, 23.8103],   // [longitude, latitude]
  "pincode": "1205"                    // optional, used to derive coords if not provided
}
```
> If only `pincode` is provided, the backend may attempt to geocode it (requires a geocoding service). Otherwise, use `coordinates` directly.

**Response** `200 OK`
```json
{
  "success": true,
  "data": {
    "location": {
      "type": "Point",
      "coordinates": [90.4125, 23.8103]
    },
    "pincode": "1205"          // if provided
  },
  "message": "Location updated successfully"
}
```

**Errors**
- `400 Bad Request` – Missing both `coordinates` and `pincode`, or invalid coordinate range.
- `422 Unprocessable Entity` – Pincode could not be geocoded (if using pincode).

---

## 4. Get Order History

**GET** `/orders`

Retrieve a paginated list of orders placed by the authenticated user.

**Query Parameters** (optional)
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `page`    | int  | Page number | 1       |
| `limit`   | int  | Items per page | 20   |
| `status`  | string | Filter by order status (`Pending`, `Processing`, `Shipped`, `Delivered`, `Cancelled`, `Refunded`) | all |

**Response** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "_id": "665f1a2b3c4d5e6f7890abcf",
      "items": [
        {
          "productId": "665f1a2b3c4d5e6f7890abce",
          "name": "Wireless Earbuds",
          "price": 1499,
          "quantity": 2
        }
      ],
      "totalAmount": 2998,
      "status": "Delivered",
      "shippingAddress": {
        "line1": "123/A, Dhanmondi",
        "city": "Dhaka",
        "pincode": "1205"
      },
      "createdAt": "2026-08-10T14:30:00.000Z",
      "updatedAt": "2026-08-11T09:00:00.000Z"
    }
    // more orders...
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 12,
    "totalPages": 1
  }
}
```

**Errors**
- `401 Unauthorized`

---

## 5. Manage Wishlist

**POST** `/wishlist/:productId`

Toggle a product in the user's wishlist. If the product is already in the wishlist, it is removed; otherwise, it is added.

**Path Parameter**
- `productId` – MongoDB ObjectId of the product.

**Response** `200 OK`
```json
{
  "success": true,
  "data": {
    "wishlist": ["665f1a2b3c4d5e6f7890abce", "665f1a2b3c4d5e6f7890abdf"],
    "action": "added"   // or "removed"
  },
  "message": "Product added to wishlist"
}
```

**Errors**
- `400 Bad Request` – Invalid `productId` format.
- `404 Not Found` – Product does not exist.

---

## 6. Get Wishlist (Optional)

If you need a dedicated endpoint to fetch the full wishlist with product details, you can use:

**GET** `/wishlist`

Returns the user's wishlist populated with product details.

**Response** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "_id": "665f1a2b3c4d5e6f7890abce",
      "name": "Wireless Earbuds",
      "price": 1499,
      "images": ["https://.../earbuds.jpg"],
      "sellerId": "665f1a2b3c4d5e6f7890abc0"
    }
    // ...
  ]
}
```

> **Note:** This endpoint may not be explicitly defined in the routes; you can use `GET /profile` and expand `wishlist` if needed. For efficiency, we recommend using this separate endpoint if available.

---

## General Notes for Developers & Testers

### Authentication Header
```
Authorization: Bearer <your_jwt_token>
```

### Common Error Codes
| Status | Meaning |
|--------|---------|
| 400 | Bad Request – malformed payload or validation error |
| 401 | Unauthorized – missing or invalid token |
| 403 | Forbidden – authenticated but lacking required role |
| 404 | Not Found – resource does not exist |
| 500 | Internal Server Error – unexpected server issue |

### Request Format
All request bodies must be `application/json` unless otherwise noted.

### Testing Tips
- Use tools like Postman or Insomnia to test each endpoint with a valid token.
- For location endpoints, ensure coordinates are within valid ranges: longitude -180 to 180, latitude -90 to 90.
- The wishlist toggle is idempotent; sending the same product twice will remove it after the first call.

### Future Extensions
- Address management may be split into separate endpoints (`POST /addresses`, `PUT /addresses/:id`, `DELETE /addresses/:id`) for finer control.
- Order cancellation endpoint may be added under `/orders/:id/cancel`.

---

## Example Workflow (Frontend)

1. **Login** → Obtain token.
2. **Get profile** to display user info.
3. **Update location** after user grants geolocation permission or enters pincode.
4. **Fetch orders** to show order history.
5. **Toggle wishlist** on product detail page.

---

**Document Version:** 1.0  
**Last Updated:** 2026-08-13