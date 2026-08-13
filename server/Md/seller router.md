# User Routes - API Documentation

## Base URL
`/api/users`

## Authentication
All routes require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## 1. Get User Profile

### GET `/api/users/profile`

Get the authenticated user's complete profile information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "665f1a...",
    "name": "Farhana Rahman",
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
        "_id": "665f1b...",
        "label": "Home",
        "line1": "123 Dhanmondi, Road #4",
        "city": "Dhaka",
        "pincode": "1205",
        "coordinates": [90.4125, 23.8103],
        "isDefault": true
      }
    ],
    "wishlist": [
      {
        "_id": "665f1c...",
        "name": "Wireless Earbuds",
        "price": 1499
      }
    ],
    "createdAt": "2026-08-11T10:30:00.000Z",
    "updatedAt": "2026-08-12T15:20:00.000Z"
  }
}
```

**Error Responses:**
| Status Code | Message |
|-------------|---------|
| 401 | Authentication required |
| 404 | User not found |

---

## 2. Update User Profile

### PUT `/api/users/profile`

Update the authenticated user's profile information.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Farhana Akhter Rahman",
  "phone": "+8801712345679",
  "profileImage": "https://example.com/avatar.jpg"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | String | Optional | Full name (3-50 characters) |
| phone | String | Optional | Phone number with country code |
| profileImage | String | Optional | URL of profile image |

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "665f1a...",
    "name": "Farhana Akhter Rahman",
    "email": "farhana@example.com",
    "phone": "+8801712345679",
    "role": "user",
    "isVerified": true,
    "updatedAt": "2026-08-12T15:25:00.000Z"
  }
}
```

**Error Responses:**
| Status Code | Message |
|-------------|---------|
| 400 | Validation error |
| 401 | Authentication required |
| 404 | User not found |

---

## 3. Update User Location

### PUT `/api/users/location`

Update the user's current location (used for product discovery).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "coordinates": [90.4125, 23.8103],
  "pincode": "1205",
  "source": "geo"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| coordinates | Array[Number] | Required | [longitude, latitude] |
| pincode | String | Optional | Postal/ZIP code |
| source | String | Optional | 'geo' or 'manual' |

**Response:**
```json
{
  "success": true,
  "data": {
    "location": {
      "type": "Point",
      "coordinates": [90.4125, 23.8103]
    },
    "pincode": "1205",
    "source": "geo",
    "updatedAt": "2026-08-12T15:30:00.000Z"
  }
}
```

**Error Responses:**
| Status Code | Message |
|-------------|---------|
| 400 | Invalid coordinates range |
| 401 | Authentication required |

---

## 4. Add Address

### POST `/api/users/addresses`

Add a new delivery address.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "label": "Work",
  "line1": "456 Gulshan Avenue",
  "line2": "Level 5, The Building",
  "city": "Dhaka",
  "state": "Dhaka Division",
  "pincode": "1212",
  "coordinates": [90.4150, 23.7950],
  "isDefault": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| label | String | Required | Address label (Home, Work, Other) |
| line1 | String | Required | Street address line 1 |
| line2 | String | Optional | Street address line 2 |
| city | String | Required | City name |
| state | String | Optional | State/Division |
| pincode | String | Required | Postal/ZIP code |
| coordinates | Array[Number] | Required | [longitude, latitude] |
| isDefault | Boolean | Optional | Set as default address |

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "665f1d...",
    "label": "Work",
    "line1": "456 Gulshan Avenue",
    "line2": "Level 5, The Building",
    "city": "Dhaka",
    "state": "Dhaka Division",
    "pincode": "1212",
    "coordinates": [90.4150, 23.7950],
    "isDefault": false
  },
  "message": "Address added successfully"
}
```

**Error Responses:**
| Status Code | Message |
|-------------|---------|
| 400 | Validation error |
| 401 | Authentication required |
| 409 | Address label already exists |

---

## 5. Update Address

### PUT `/api/users/addresses/:addressId`

Update an existing delivery address.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| addressId | String | Address ID (24 characters hex) |

**Request Body:**
```json
{
  "label": "Office",
  "line1": "456 Gulshan Avenue, Level 5",
  "city": "Dhaka",
  "pincode": "1212",
  "isDefault": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "665f1d...",
    "label": "Office",
    "line1": "456 Gulshan Avenue, Level 5",
    "city": "Dhaka",
    "pincode": "1212",
    "isDefault": true
  },
  "message": "Address updated successfully"
}
```

**Error Responses:**
| Status Code | Message |
|-------------|---------|
| 400 | Validation error |
| 401 | Authentication required |
| 403 | Unauthorized to update this address |
| 404 | Address not found |

---

## 6. Delete Address

### DELETE `/api/users/addresses/:addressId`

Delete a delivery address.

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| addressId | String | Address ID (24 characters hex) |

**Response:**
```json
{
  "success": true,
  "message": "Address deleted successfully"
}
```

**Error Responses:**
| Status Code | Message |
|-------------|---------|
| 401 | Authentication required |
| 403 | Unauthorized to delete this address |
| 404 | Address not found |

---

## 7. Get User Orders

### GET `/api/users/orders`

Get the authenticated user's order history.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | Number | 1 | Page number |
| limit | Number | 20 | Items per page |
| status | String | - | Filter by order status (Pending, Processing, Shipped, Delivered, Cancelled, Refunded) |
| sort | String | -createdAt | Sort field (createdAt, totalAmount) |

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "_id": "665f1e...",
        "orderNumber": "ORD-20260812-001",
        "items": [
          {
            "productId": {
              "_id": "665f1c...",
              "name": "Wireless Earbuds",
              "images": ["https://cdn.example.com/earbuds.jpg"]
            },
            "name": "Wireless Earbuds",
            "price": 1499,
            "quantity": 2
          }
        ],
        "totalAmount": 2998,
        "shippingAddress": {
          "line1": "123 Dhanmondi, Road #4",
          "city": "Dhaka",
          "pincode": "1205",
          "coordinates": [90.4125, 23.8103]
        },
        "status": "Delivered",
        "paymentMethod": "stripe",
        "paymentStatus": "paid",
        "sellerId": "665e02...",
        "sellerName": "TechHub Dhanmondi",
        "createdAt": "2026-08-10T10:00:00.000Z",
        "deliveredAt": "2026-08-12T14:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

**Error Responses:**
| Status Code | Message |
|-------------|---------|
| 401 | Authentication required |

---

## 8. Get Single Order

### GET `/api/users/orders/:orderId`

Get details of a specific order.

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| orderId | String | Order ID (24 characters hex) |

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "665f1e...",
    "orderNumber": "ORD-20260812-001",
    "userId": {
      "_id": "665f1a...",
      "name": "Farhana Rahman",
      "email": "farhana@example.com",
      "phone": "+8801712345678"
    },
    "sellerId": {
      "_id": "665e02...",
      "shopName": "TechHub Dhanmondi",
      "shopAddress": {
        "line1": "123 Dhanmondi, Road #4",
        "city": "Dhaka",
        "pincode": "1205"
      }
    },
    "items": [
      {
        "productId": {
          "_id": "665f1c...",
          "name": "Wireless Earbuds",
          "price": 1499,
          "images": ["https://cdn.example.com/earbuds.jpg"]
        },
        "name": "Wireless Earbuds",
        "price": 1499,
        "quantity": 2
      }
    ],
    "totalAmount": 2998,
    "shippingAddress": {
      "line1": "123 Dhanmondi, Road #4",
      "city": "Dhaka",
      "pincode": "1205",
      "coordinates": [90.4125, 23.8103]
    },
    "status": "Delivered",
    "statusHistory": [
      {
        "status": "Pending",
        "timestamp": "2026-08-10T10:00:00.000Z",
        "note": "Order placed"
      },
      {
        "status": "Processing",
        "timestamp": "2026-08-10T11:30:00.000Z",
        "note": "Order confirmed"
      },
      {
        "status": "Shipped",
        "timestamp": "2026-08-11T09:00:00.000Z",
        "note": "Package shipped via Courier"
      },
      {
        "status": "Delivered",
        "timestamp": "2026-08-12T14:00:00.000Z",
        "note": "Order delivered"
      }
    ],
    "paymentMethod": "stripe",
    "paymentStatus": "paid",
    "paymentReference": "pi_3P8...",
    "createdAt": "2026-08-10T10:00:00.000Z",
    "updatedAt": "2026-08-12T14:00:00.000Z"
  }
}
```

**Error Responses:**
| Status Code | Message |
|-------------|---------|
| 401 | Authentication required |
| 403 | Unauthorized to view this order |
| 404 | Order not found |

---

## 9. Add to Wishlist

### POST `/api/users/wishlist/:productId`

Add a product to the user's wishlist.

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| productId | String | Product ID (24 characters hex) |

**Response:**
```json
{
  "success": true,
  "data": {
    "wishlist": [
      {
        "_id": "665f1c...",
        "name": "Wireless Earbuds",
        "price": 1499,
        "images": ["https://cdn.example.com/earbuds.jpg"],
        "rating": { "average": 4.3, "count": 27 }
      }
    ],
    "added": true
  },
  "message": "Product added to wishlist"
}
```

**Error Responses:**
| Status Code | Message |
|-------------|---------|
| 401 | Authentication required |
| 404 | Product not found |
| 409 | Product already in wishlist |

---

## 10. Remove from Wishlist

### DELETE `/api/users/wishlist/:productId`

Remove a product from the user's wishlist.

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| productId | String | Product ID (24 characters hex) |

**Response:**
```json
{
  "success": true,
  "data": {
    "wishlist": [
      {
        "_id": "665f1c...",
        "name": "Wireless Earbuds"
      }
    ],
    "removed": true
  },
  "message": "Product removed from wishlist"
}
```

**Error Responses:**
| Status Code | Message |
|-------------|---------|
| 401 | Authentication required |
| 404 | Product not found in wishlist |

---

## 11. Get Wishlist

### GET `/api/users/wishlist`

Get all products in the user's wishlist.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | Number | 1 | Page number |
| limit | Number | 20 | Items per page |

**Response:**
```json
{
  "success": true,
  "data": {
    "wishlist": [
      {
        "_id": "665f1c...",
        "name": "Wireless Earbuds",
        "description": "High-quality wireless earbuds with noise cancellation",
        "price": 1499,
        "images": ["https://cdn.example.com/earbuds.jpg"],
        "category": {
          "_id": "665f1f...",
          "name": "Electronics",
          "slug": "electronics"
        },
        "sellerId": {
          "_id": "665e02...",
          "shopName": "TechHub Dhanmondi"
        },
        "rating": { "average": 4.3, "count": 27 },
        "stock": 50,
        "isActive": true,
        "distanceKm": 1.8,
        "createdAt": "2026-08-11T12:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

**Error Responses:**
| Status Code | Message |
|-------------|---------|
| 401 | Authentication required |

---

## 12. Submit Product Review

### POST `/api/users/reviews`

Submit a review for a purchased product.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "productId": "665f1c...",
  "orderId": "665f1e...",
  "rating": 5,
  "comment": "Excellent product! Fast delivery and great quality."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| productId | String | Required | Product ID (24 characters hex) |
| orderId | String | Required | Order ID (24 characters hex) |
| rating | Number | Required | 1-5 star rating |
| comment | String | Optional | Review text (max 500 characters) |

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "665f20...",
    "productId": "665f1c...",
    "userId": "665f1a...",
    "orderId": "665f1e...",
    "rating": 5,
    "comment": "Excellent product! Fast delivery and great quality.",
    "createdAt": "2026-08-12T16:00:00.000Z"
  },
  "message": "Review submitted successfully"
}
```

**Error Responses:**
| Status Code | Message |
|-------------|---------|
| 400 | Validation error |
| 401 | Authentication required |
| 403 | Cannot review this product (order not delivered) |
| 404 | Product or order not found |
| 409 | Review already submitted for this product |

---

## 13. Get User Reviews

### GET `/api/users/reviews`

Get all reviews submitted by the user.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | Number | 1 | Page number |
| limit | Number | 20 | Items per page |

**Response:**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "_id": "665f20...",
        "productId": {
          "_id": "665f1c...",
          "name": "Wireless Earbuds",
          "images": ["https://cdn.example.com/earbuds.jpg"],
          "price": 1499
        },
        "orderId": "665f1e...",
        "rating": 5,
        "comment": "Excellent product! Fast delivery and great quality.",
        "createdAt": "2026-08-12T16:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 3,
      "totalPages": 1
    }
  }
}
```

**Error Responses:**
| Status Code | Message |
|-------------|---------|
| 401 | Authentication required |

---

## 14. Update Review

### PUT `/api/users/reviews/:reviewId`

Update an existing review.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| reviewId | String | Review ID (24 characters hex) |

**Request Body:**
```json
{
  "rating": 4,
  "comment": "Good product, but battery life could be better."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "665f20...",
    "rating": 4,
    "comment": "Good product, but battery life could be better.",
    "updatedAt": "2026-08-12T16:30:00.000Z"
  },
  "message": "Review updated successfully"
}
```

**Error Responses:**
| Status Code | Message |
|-------------|---------|
| 400 | Validation error |
| 401 | Authentication required |
| 403 | Unauthorized to update this review |
| 404 | Review not found |

---

## 15. Delete Review

### DELETE `/api/users/reviews/:reviewId`

Delete a review.

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| reviewId | String | Review ID (24 characters hex) |

**Response:**
```json
{
  "success": true,
  "message": "Review deleted successfully"
}
```

**Error Responses:**
| Status Code | Message |
|-------------|---------|
| 401 | Authentication required |
| 403 | Unauthorized to delete this review |
| 404 | Review not found |

---

## 16. Get Cart

### GET `/api/users/cart`

Get the user's current cart with all items.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "665f21...",
    "userId": "665f1a...",
    "items": [
      {
        "productId": {
          "_id": "665f1c...",
          "name": "Wireless Earbuds",
          "price": 1499,
          "images": ["https://cdn.example.com/earbuds.jpg"],
          "stock": 50
        },
        "quantity": 2,
        "price": 1499
      },
      {
        "productId": {
          "_id": "665f22...",
          "name": "Phone Case",
          "price": 499,
          "images": ["https://cdn.example.com/case.jpg"],
          "stock": 100
        },
        "quantity": 1,
        "price": 499
      }
    ],
    "totalItems": 3,
    "subtotal": 3497,
    "totalPrice": 3497,
    "updatedAt": "2026-08-12T17:00:00.000Z"
  }
}
```

**Error Responses:**
| Status Code | Message |
|-------------|---------|
| 401 | Authentication required |

---

## 17. Add to Cart

### POST `/api/users/cart/items`

Add an item to the user's cart.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "productId": "665f1c...",
  "quantity": 2
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| productId | String | Required | Product ID (24 characters hex) |
| quantity | Number | Required | Quantity (1-99) |

**Response:**
```json
{
  "success": true,
  "data": {
    "cart": {
      "_id": "665f21...",
      "items": [
        {
          "productId": "665f1c...",
          "quantity": 2,
          "price": 1499
        }
      ],
      "totalItems": 2,
      "subtotal": 2998,
      "totalPrice": 2998
    },
    "message": "Item added to cart"
  }
}
```

**Error Responses:**
| Status Code | Message |
|-------------|---------|
| 400 | Insufficient stock |
| 401 | Authentication required |
| 404 | Product not found |

---

## 18. Update Cart Item

### PUT `/api/users/cart/items/:productId`

Update quantity of an item in the cart.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| productId | String | Product ID (24 characters hex) |

**Request Body:**
```json
{
  "quantity": 3
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| quantity | Number | Required | New quantity (0-99, 0 removes item) |

**Response:**
```json
{
  "success": true,
  "data": {
    "cart": {
      "_id": "665f21...",
      "items": [
        {
          "productId": "665f1c...",
          "quantity": 3,
          "price": 1499
        }
      ],
      "totalItems": 3,
      "subtotal": 4497,
      "totalPrice": 4497
    },
    "message": "Cart updated successfully"
  }
}
```

**Error Responses:**
| Status Code | Message |
|-------------|---------|
| 400 | Insufficient stock |
| 401 | Authentication required |
| 404 | Product not found in cart |

---

## 19. Remove from Cart

### DELETE `/api/users/cart/items/:productId`

Remove an item from the user's cart.

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| productId | String | Product ID (24 characters hex) |

**Response:**
```json
{
  "success": true,
  "data": {
    "cart": {
      "_id": "665f21...",
      "items": [],
      "totalItems": 0,
      "subtotal": 0,
      "totalPrice": 0
    },
    "message": "Item removed from cart"
  }
}
```

**Error Responses:**
| Status Code | Message |
|-------------|---------|
| 401 | Authentication required |
| 404 | Product not found in cart |

---

## 20. Clear Cart

### DELETE `/api/users/cart`

Clear all items from the user's cart.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cart": {
      "_id": "665f21...",
      "items": [],
      "totalItems": 0,
      "subtotal": 0,
      "totalPrice": 0
    }
  },
  "message": "Cart cleared successfully"
}
```

**Error Responses:**
| Status Code | Message |
|-------------|---------|
| 401 | Authentication required |

---

## Frontend Usage Examples

### React + Redux Toolkit Example

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
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['User', 'Orders', 'Wishlist', 'Cart'],
  endpoints: (builder) => ({
    getProfile: builder.query({
      query: () => '/profile',
      providesTags: ['User'],
    }),
    updateProfile: builder.mutation({
      query: (data) => ({
        url: '/profile',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),
    updateLocation: builder.mutation({
      query: (data) => ({
        url: '/location',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),
    getOrders: builder.query({
      query: (params) => ({
        url: '/orders',
        params,
      }),
      providesTags: ['Orders'],
    }),
    getWishlist: builder.query({
      query: (params) => ({
        url: '/wishlist',
        params,
      }),
      providesTags: ['Wishlist'],
    }),
    toggleWishlist: builder.mutation({
      query: ({ productId, action }) => ({
        url: `/wishlist/${productId}`,
        method: action === 'add' ? 'POST' : 'DELETE',
      }),
      invalidatesTags: ['Wishlist'],
    }),
    getCart: builder.query({
      query: () => '/cart',
      providesTags: ['Cart'],
    }),
    addToCart: builder.mutation({
      query: (data) => ({
        url: '/cart/items',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Cart'],
    }),
    updateCartItem: builder.mutation({
      query: ({ productId, quantity }) => ({
        url: `/cart/items/${productId}`,
        method: 'PUT',
        body: { quantity },
      }),
      invalidatesTags: ['Cart'],
    }),
    removeFromCart: builder.mutation({
      query: (productId) => ({
        url: `/cart/items/${productId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Cart'],
    }),
    submitReview: builder.mutation({
      query: (data) => ({
        url: '/reviews',
        method: 'POST',
        body: data,
      }),
    }),
  }),
});

// Usage in components
const UserProfile = () => {
  const { data: profile, isLoading } = userApi.useGetProfileQuery();
  const [updateProfile] = userApi.useUpdateProfileMutation();
  const { data: cart } = userApi.useGetCartQuery();
  const [addToCart] = userApi.useAddToCartMutation();

  const handleUpdate = async (data) => {
    await updateProfile(data);
  };

  const handleAddToCart = async (productId, quantity) => {
    await addToCart({ productId, quantity });
  };

  return (
    <div>
      {/* Render profile, cart, etc. */}
    </div>
  );
};
```

### Axios Usage Example

```javascript
// services/user.service.js
import axios from './axiosInstance';

const userService = {
  // Profile
  getProfile: () => axios.get('/api/users/profile'),
  updateProfile: (data) => axios.put('/api/users/profile', data),
  updateLocation: (data) => axios.put('/api/users/location', data),

  // Addresses
  addAddress: (data) => axios.post('/api/users/addresses', data),
  updateAddress: (addressId, data) => 
    axios.put(`/api/users/addresses/${addressId}`, data),
  deleteAddress: (addressId) => 
    axios.delete(`/api/users/addresses/${addressId}`),

  // Orders
  getOrders: (params) => axios.get('/api/users/orders', { params }),
  getOrder: (orderId) => axios.get(`/api/users/orders/${orderId}`),

  // Wishlist
  getWishlist: (params) => axios.get('/api/users/wishlist', { params }),
  addToWishlist: (productId) => axios.post(`/api/users/wishlist/${productId}`),
  removeFromWishlist: (productId) => 
    axios.delete(`/api/users/wishlist/${productId}`),

  // Reviews
  submitReview: (data) => axios.post('/api/users/reviews', data),
  getReviews: (params) => axios.get('/api/users/reviews', { params }),
  updateReview: (reviewId, data) => 
    axios.put(`/api/users/reviews/${reviewId}`, data),
  deleteReview: (reviewId) => 
    axios.delete(`/api/users/reviews/${reviewId}`),

  // Cart
  getCart: () => axios.get('/api/users/cart'),
  addToCart: (data) => axios.post('/api/users/cart/items', data),
  updateCartItem: (productId, data) => 
    axios.put(`/api/users/cart/items/${productId}`, data),
  removeFromCart: (productId) => 
    axios.delete(`/api/users/cart/items/${productId}`),
  clearCart: () => axios.delete('/api/users/cart'),
};

export default userService;
```

---

## API Integration Checklist for Testers

### Authentication Tests
- [ ] Verify routes require JWT token
- [ ] Test with expired/invalid token (401)
- [ ] Test with missing token (401)
- [ ] Test with different user roles

### Profile Tests
- [ ] GET /profile - Successful response
- [ ] PUT /profile - Update name, phone
- [ ] PUT /location - Update coordinates
- [ ] Validate coordinate ranges

### Address Tests
- [ ] POST /addresses - Add new address
- [ ] PUT /addresses/:id - Update address
- [ ] DELETE /addresses/:id - Delete address
- [ ] Set default address (only one default)
- [ ] Address ownership verification

### Cart Tests
- [ ] GET /cart - Retrieve cart
- [ ] POST /cart/items - Add item
- [ ] PUT /cart/items/:id - Update quantity
- [ ] DELETE /cart/items/:id - Remove item
- [ ] DELETE /cart - Clear cart
- [ ] Stock validation
- [ ] Maximum quantity limits

### Order Tests
- [ ] GET /orders - List orders
- [ ] GET /orders/:id - Single order details
- [ ] Order ownership verification
- [ ] Pagination works correctly
- [ ] Status filtering

### Wishlist Tests
- [ ] GET /wishlist - List wishlist
- [ ] POST /wishlist/:id - Add item
- [ ] DELETE /wishlist/:id - Remove item
- [ ] Duplicate prevention

### Review Tests
- [ ] POST /reviews - Submit review
- [ ] Must have delivered order
- [ ] One review per product per order
- [ ] PUT /reviews/:id - Update review
- [ ] DELETE /reviews/:id - Delete review
- [ ] Review ownership verification

### Error Handling Tests
- [ ] 400 - Validation errors
- [ ] 401 - Unauthorized
- [ ] 403 - Forbidden
- [ ] 404 - Not found
- [ ] 409 - Conflict
- [ ] 500 - Server errors

---

**Document Version:** 1.0  
**Last Updated:** 2026-08-12  
**For:** Frontend Developers & Testers