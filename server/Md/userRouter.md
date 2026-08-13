# VectorX — User Routes API Documentation

**Version:** 1.0  
**Last Updated:** 2026-08-12  
**Base URL:** `http://localhost:5000/api/users`  
**Authentication:** All routes require Bearer Token (JWT) in `Authorization` header

---

## 1. Overview

User routes handle all buyer-related operations including profile management, addresses, orders, wishlist, and cart functionality. All endpoints require authentication via JWT token.

### Authentication Header
```
Authorization: Bearer <your_jwt_token>
```

### Common Response Format
```javascript
// Success
{
  "success": true,
  "data": { ... },
  "pagination": { ... } // Optional
}

// Error
{
  "success": false,
  "message": "Error description"
}
```

---

## 2. Profile Management

### 2.1 Get User Profile
`GET /profile`

**Description:** Get the logged-in user's complete profile including addresses, wishlist, and location.

**Response:**
```javascript
{
  "success": true,
  "data": {
    "_id": "665f1a...",
    "name": "Farhana",
    "email": "farhana@example.com",
    "phone": "+8801712345678",
    "role": "user",
    "isVerified": true,
    "isBlocked": false,
    "location": {
      "type": "Point",
      "coordinates": [90.4125, 23.8103]
    },
    "addresses": [
      {
        "_id": "addr_123",
        "label": "Home",
        "line1": "123 Dhanmondi",
        "city": "Dhaka",
        "pincode": "1205",
        "coordinates": [90.4125, 23.8103],
        "isDefault": true
      }
    ],
    "wishlist": [
      {
        "_id": "prod_123",
        "name": "Wireless Earbuds",
        "price": 1499,
        "images": ["https://..."]
      }
    ],
    "createdAt": "2026-08-11T10:00:00.000Z",
    "updatedAt": "2026-08-12T10:00:00.000Z"
  }
}
```

---

### 2.2 Update User Profile
`PUT /profile`

**Description:** Update user profile fields (name, email, phone).

**Request Body:**
```javascript
{
  "name": "Farhana Ahmed",        // Optional
  "email": "farhana.new@example.com", // Optional (triggers re-verification)
  "phone": "+8801712345679"        // Optional
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "_id": "665f1a...",
    "name": "Farhana Ahmed",
    "email": "farhana.new@example.com",
    "phone": "+8801712345679",
    "role": "user",
    "isVerified": false, // Will be false if email changed
    "location": { ... },
    "addresses": [ ... ]
  }
}
```

**Error Responses:**
- `400` - Email already in use
- `404` - User not found

---

## 3. Location Management

### 3.1 Update User Location
`PUT /location`

**Description:** Update the user's current location (used for product sorting and delivery calculations).

**Request Body:**
```javascript
{
  "lat": 23.8103,        // Optional (latitude)
  "lng": 90.4125,        // Optional (longitude)
  "pincode": "1205",     // Optional
  "city": "Dhaka",       // Optional
  "address": "123 Dhanmondi" // Optional
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Location updated successfully",
  "data": {
    "location": {
      "type": "Point",
      "coordinates": [90.4125, 23.8103]
    },
    "pincode": "1205",
    "city": "Dhaka"
  }
}
```

**Error Responses:**
- `400` - Invalid coordinates (lng must be -180 to 180, lat -90 to 90)
- `404` - User not found

---

## 4. Address Management

### 4.1 Add New Address
`POST /addresses`

**Description:** Add a new shipping address to user's profile.

**Request Body:**
```javascript
{
  "label": "Work",              // Required: "Home", "Work", "Other"
  "line1": "456 Gulshan",       // Required
  "line2": "Apt 5B",            // Optional
  "city": "Dhaka",             // Required
  "state": "Dhaka Division",   // Optional
  "pincode": "1212",           // Required
  "coordinates": [90.4150, 23.7920], // Optional (geo coordinates)
  "isDefault": true            // Optional (defaults to first address)
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Address added successfully",
  "data": [
    {
      "_id": "addr_123",
      "label": "Home",
      "line1": "123 Dhanmondi",
      "city": "Dhaka",
      "pincode": "1205",
      "coordinates": [90.4125, 23.8103],
      "isDefault": true
    },
    {
      "_id": "addr_456",
      "label": "Work",
      "line1": "456 Gulshan",
      "city": "Dhaka",
      "pincode": "1212",
      "coordinates": [90.4150, 23.7920],
      "isDefault": false
    }
  ]
}
```

---

### 4.2 Update Address
`PUT /addresses/:addressId`

**Description:** Update an existing address.

**URL Parameters:**
- `addressId` - The ID of the address to update

**Request Body:** (All fields optional)
```javascript
{
  "label": "Office",
  "line1": "456 Gulshan-2",
  "line2": "Level 7",
  "city": "Dhaka",
  "state": "Dhaka Division",
  "pincode": "1212",
  "coordinates": [90.4150, 23.7920]
}
```

**Response:** Same as add address response

**Error Responses:**
- `404` - Address not found

---

### 4.3 Delete Address
`DELETE /addresses/:addressId`

**Description:** Remove an address from user's profile. If the default address is deleted, the first remaining address becomes default.

**URL Parameters:**
- `addressId` - The ID of the address to delete

**Response:**
```javascript
{
  "success": true,
  "message": "Address removed successfully",
  "data": [ ... ] // Updated address list
}
```

**Error Responses:**
- `404` - Address not found

---

### 4.4 Set Default Address
`PUT /addresses/:addressId/default`

**Description:** Set a specific address as the default shipping address.

**URL Parameters:**
- `addressId` - The ID of the address to set as default

**Response:**
```javascript
{
  "success": true,
  "message": "Default address set successfully",
  "data": [ ... ] // Updated address list
}
```

**Error Responses:**
- `404` - Address not found

---

## 5. Order Management

### 5.1 Get User Orders
`GET /orders`

**Description:** Get order history for the logged-in user.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by order status (Pending, Processing, Shipped, Delivered, Cancelled, Refunded) |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 10) |

**Response:**
```javascript
{
  "success": true,
  "data": [
    {
      "_id": "ord_123",
      "items": [
        {
          "productId": {
            "_id": "prod_123",
            "name": "Wireless Earbuds",
            "price": 1499,
            "images": ["https://..."]
          },
          "quantity": 2,
          "price": 1499
        }
      ],
      "totalAmount": 2998,
      "status": "Delivered",
      "paymentStatus": "paid",
      "shippingAddress": {
        "line1": "123 Dhanmondi",
        "city": "Dhaka",
        "pincode": "1205"
      },
      "createdAt": "2026-08-10T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

---

### 5.2 Get Order Details
`GET /orders/:orderId`

**Description:** Get detailed information about a specific order.

**URL Parameters:**
- `orderId` - The ID of the order

**Response:**
```javascript
{
  "success": true,
  "data": {
    "_id": "ord_123",
    "userId": {
      "_id": "user_123",
      "name": "Farhana",
      "email": "farhana@example.com",
      "phone": "+8801712345678"
    },
    "sellerId": {
      "_id": "seller_123",
      "shopName": "TechHub Dhanmondi",
      "location": { ... }
    },
    "items": [
      {
        "productId": {
          "_id": "prod_123",
          "name": "Wireless Earbuds",
          "price": 1499,
          "images": ["https://..."],
          "description": "High-quality wireless earbuds"
        },
        "quantity": 2,
        "price": 1499
      }
    ],
    "subtotal": 2998,
    "shippingCharge": 50,
    "tax": 0,
    "discount": 0,
    "totalAmount": 3048,
    "status": "Processing",
    "paymentMethod": "stripe",
    "paymentStatus": "paid",
    "paymentReference": "pi_123456",
    "shippingAddress": {
      "label": "Home",
      "line1": "123 Dhanmondi",
      "city": "Dhaka",
      "pincode": "1205",
      "coordinates": [90.4125, 23.8103]
    },
    "estimatedDeliveryDate": "2026-08-16T00:00:00.000Z",
    "createdAt": "2026-08-11T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `404` - Order not found

---

## 6. Wishlist Management

### 6.1 Get Wishlist
`GET /wishlist`

**Description:** Get all products in user's wishlist.

**Response:**
```javascript
{
  "success": true,
  "data": [
    {
      "_id": "prod_123",
      "name": "Wireless Earbuds",
      "price": 1499,
      "comparePrice": 1999,
      "images": ["https://..."],
      "rating": {
        "average": 4.5,
        "count": 127
      },
      "description": "High-quality wireless earbuds",
      "sellerId": "seller_123"
    }
  ]
}
```

---

### 6.2 Add to Wishlist
`POST /wishlist/:productId`

**Description:** Add a product to the user's wishlist.

**URL Parameters:**
- `productId` - The ID of the product to add

**Response:**
```javascript
{
  "success": true,
  "message": "Product added to wishlist",
  "data": [ ... ] // Updated wishlist
}
```

**Error Responses:**
- `400` - Product already in wishlist
- `404` - Product not found

---

### 6.3 Remove from Wishlist
`DELETE /wishlist/:productId`

**Description:** Remove a product from the user's wishlist.

**URL Parameters:**
- `productId` - The ID of the product to remove

**Response:**
```javascript
{
  "success": true,
  "message": "Product removed from wishlist",
  "data": [ ... ] // Updated wishlist
}
```

**Error Responses:**
- `404` - Product not in wishlist

---

## 7. Cart Management

### 7.1 Get Cart
`GET /cart`

**Description:** Get the user's current cart with all items.

**Response:**
```javascript
{
  "success": true,
  "data": {
    "_id": "cart_123",
    "userId": "user_123",
    "items": [
      {
        "_id": "cart_item_123",
        "productId": {
          "_id": "prod_123",
          "name": "Wireless Earbuds",
          "price": 1499,
          "images": ["https://..."],
          "stock": 50
        },
        "quantity": 2,
        "price": 1499,
        "sellerId": "seller_123"
      },
      {
        "_id": "cart_item_456",
        "productId": {
          "_id": "prod_456",
          "name": "Phone Case",
          "price": 499,
          "images": ["https://..."],
          "stock": 100
        },
        "quantity": 1,
        "price": 499,
        "sellerId": "seller_456"
      }
    ],
    "total": 3497,
    "createdAt": "2026-08-12T10:00:00.000Z",
    "updatedAt": "2026-08-12T10:00:00.000Z"
  }
}
```

---

### 7.2 Add to Cart
`POST /cart`

**Description:** Add a product to the cart. If product already exists, quantity is increased.

**Request Body:**
```javascript
{
  "productId": "prod_123",   // Required
  "quantity": 2              // Optional (default: 1)
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Item added to cart",
  "data": {
    "_id": "cart_123",
    "items": [
      {
        "_id": "cart_item_123",
        "productId": {
          "_id": "prod_123",
          "name": "Wireless Earbuds",
          "price": 1499,
          "images": ["https://..."],
          "stock": 50
        },
        "quantity": 2,
        "price": 1499,
        "sellerId": "seller_123"
      }
    ],
    "total": 2998
  }
}
```

**Error Responses:**
- `400` - Product ID required
- `400` - Only X items available
- `404` - Product not found or inactive

---

### 7.3 Update Cart Item Quantity
`PUT /cart/:itemId`

**Description:** Update the quantity of a specific cart item.

**URL Parameters:**
- `itemId` - The ID of the cart item to update

**Request Body:**
```javascript
{
  "quantity": 3  // Required (0 removes the item)
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Cart updated",
  "data": {
    "_id": "cart_123",
    "items": [ ... ],
    "total": 4497
  }
}
```

**Error Responses:**
- `400` - Valid quantity is required
- `400` - Only X items available
- `404` - Item not found in cart

---

### 7.4 Remove from Cart
`DELETE /cart/:itemId`

**Description:** Remove a specific item from the cart.

**URL Parameters:**
- `itemId` - The ID of the cart item to remove

**Response:**
```javascript
{
  "success": true,
  "message": "Item removed from cart",
  "data": {
    "_id": "cart_123",
    "items": [ ... ],
    "total": 1499
  }
}
```

**Error Responses:**
- `404` - Item not found in cart

---

### 7.5 Clear Cart
`DELETE /cart`

**Description:** Remove all items from the user's cart.

**Response:**
```javascript
{
  "success": true,
  "message": "Cart cleared",
  "data": {
    "items": [],
    "total": 0
  }
}
```

---

## 8. Error Codes Summary

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid/expired token) |
| 403 | Forbidden (blocked account) |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## 9. Testing Examples

### 9.1 cURL Commands

**Get Profile:**
```bash
curl -X GET http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Add Address:**
```bash
curl -X POST http://localhost:5000/api/users/addresses \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Home",
    "line1": "123 Dhanmondi",
    "city": "Dhaka",
    "pincode": "1205"
  }'
```

**Add to Cart:**
```bash
curl -X POST http://localhost:5000/api/users/cart \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "665f1a1a1a1a1a1a1a1a1a1a",
    "quantity": 2
  }'
```

---

### 9.2 Postman Collection Variables

```
Base URL: {{base_url}}/api/users
Headers: Authorization: Bearer {{token}}
```

---

## 10. Frontend Integration Example (React + RTK Query)

```javascript
// features/user/userApi.js
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const userApi = createApi({
  reducerPath: 'userApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/users',
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    }
  }),
  tagTypes: ['User', 'Addresses', 'Wishlist', 'Cart', 'Orders'],
  endpoints: (builder) => ({
    getProfile: builder.query({
      query: () => '/profile',
      providesTags: ['User']
    }),
    
    updateProfile: builder.mutation({
      query: (data) => ({
        url: '/profile',
        method: 'PUT',
        body: data
      }),
      invalidatesTags: ['User']
    }),
    
    addAddress: builder.mutation({
      query: (data) => ({
        url: '/addresses',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['Addresses']
    }),
    
    getCart: builder.query({
      query: () => '/cart',
      providesTags: ['Cart']
    }),
    
    addToCart: builder.mutation({
      query: (data) => ({
        url: '/cart',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['Cart']
    }),
    
    getOrders: builder.query({
      query: (params) => ({
        url: '/orders',
        params
      }),
      providesTags: ['Orders']
    }),
    
    getWishlist: builder.query({
      query: () => '/wishlist',
      providesTags: ['Wishlist']
    })
  })
});

export const {
  useGetProfileQuery,
  useUpdateProfileMutation,
  useAddAddressMutation,
  useGetCartQuery,
  useAddToCartMutation,
  useGetOrdersQuery,
  useGetWishlistQuery
} = userApi;
```

---

## 11. Testing Checklist

- [ ] **Profile**: GET and PUT /profile
- [ ] **Location**: PUT /location with valid/invalid coordinates
- [ ] **Addresses**: CRUD operations
- [ ] **Addresses**: Set default address
- [ ] **Orders**: GET orders with filters (status, pagination)
- [ ] **Orders**: GET order details
- [ ] **Wishlist**: Add, remove, and view
- [ ] **Cart**: Add, update quantity, remove, clear
- [ ] **Cart**: Quantity validation (stock limits)
- [ ] **Auth**: Verify token expiration (401 handling)
- [ ] **Auth**: Blocked user access (403 handling)
- [ ] **Validation**: Invalid coordinates
- [ ] **Validation**: Missing required fields

---

## 12. Important Notes for Developers

1. **Location Updates**: When location changes, the frontend should automatically re-fetch products (`useEffect` watching location state).

2. **Cart Sync**: Cart is server-synced, so always use API endpoints instead of localStorage.

3. **Multi-Seller Checkout**: Cart items are grouped by seller automatically. The `groupBySeller()` method is available on the cart model.

4. **Address Default**: When adding the first address, it automatically becomes default.

5. **Profile Updates**: Changing email triggers re-verification (`isVerified` becomes `false`).

6. **Order Statuses**: Available statuses: `Pending`, `Processing`, `Shipped`, `Delivered`, `Cancelled`, `Refunded`.

7. **Pagination**: All list endpoints support pagination via `page` and `limit` query params.