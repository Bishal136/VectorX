# Order Routes - API Documentation

## Base URL
`/api/orders`

## Authentication
All routes require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## 1. Create Order (Checkout)

### POST `/api/orders`

Create orders from the user's cart. This will:
- Group cart items by seller
- Create one order per seller
- Clear the cart after successful order creation
- Return a checkout session ID for payment

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "shippingAddress": {
    "label": "Home",
    "line1": "123 Dhanmondi, Road #4",
    "line2": "Apartment 5B",
    "city": "Dhaka",
    "state": "Dhaka Division",
    "pincode": "1205",
    "coordinates": [90.4125, 23.8103],
    "phone": "+8801712345678"
  },
  "paymentMethod": "stripe",
  "couponCode": "SAVE10",
  "notes": "Leave package at reception"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| shippingAddress | Object | Required | Delivery address details |
| shippingAddress.label | String | Optional | Address label (Home, Work, etc.) |
| shippingAddress.line1 | String | Required | Street address line 1 |
| shippingAddress.line2 | String | Optional | Street address line 2 |
| shippingAddress.city | String | Required | City name |
| shippingAddress.state | String | Optional | State/Division |
| shippingAddress.pincode | String | Required | Postal/ZIP code |
| shippingAddress.coordinates | Array[Number] | Optional | [longitude, latitude] for geolocation |
| shippingAddress.phone | String | Optional | Contact phone for delivery |
| paymentMethod | String | Required | 'stripe' or 'paypal' |
| couponCode | String | Optional | Coupon code for discount |
| notes | String | Optional | Special delivery instructions |

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "_id": "66a1b2c3d4e5f6...",
        "userId": "66a1b2c3d4e5f6...",
        "sellerId": "66a1b2c3d4e5f6...",
        "items": [
          {
            "productId": "66a1b2c3d4e5f6...",
            "name": "Wireless Earbuds",
            "price": 1499,
            "quantity": 2,
            "productSnapshot": {
              "images": [{"url": "https://..."}],
              "description": "High-quality earbuds",
              "category": "66a1b2..."
            }
          }
        ],
        "subtotal": 2998,
        "shippingCharge": 0,
        "tax": 0,
        "discount": 0,
        "couponCode": null,
        "totalAmount": 2998,
        "shippingAddress": {
          "label": "Home",
          "line1": "123 Dhanmondi, Road #4",
          "city": "Dhaka",
          "pincode": "1205"
        },
        "paymentMethod": "stripe",
        "paymentStatus": "pending",
        "checkoutSessionId": "550e8400-e29b-41d4-a716-446655440000",
        "status": "Pending",
        "commissionRate": 5,
        "commissionAmount": 149.9,
        "createdAt": "2026-08-14T10:30:00.000Z",
        "updatedAt": "2026-08-14T10:30:00.000Z"
      }
    ],
    "checkoutSessionId": "550e8400-e29b-41d4-a716-446655440000",
    "totalAmount": 2998,
    "paymentMethod": "stripe"
  },
  "message": "Orders created successfully. Proceed to payment."
}
```

**Error Responses:**
| Status Code | Message |
|-------------|---------|
| 400 | Cart is empty |
| 400 | Insufficient stock for [product name] |
| 400 | Invalid payment method |
| 401 | Authentication required |
| 500 | Failed to create orders |

---

## 2. Get User Orders

### GET `/api/orders`

Get all orders placed by the authenticated user, with pagination and optional status filter.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | Number | 1 | Page number for pagination |
| limit | Number | 20 | Number of orders per page (max 100) |
| status | String | - | Filter by order status: `Pending`, `Processing`, `Shipped`, `Delivered`, `Cancelled`, `Refunded` |

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "_id": "66a1b2c3d4e5f6...",
        "orderId": "ORD-20260814-001",
        "userId": "66a1b2...",
        "sellerId": {
          "_id": "66a1b2...",
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
              "_id": "66a1b2...",
              "name": "Wireless Earbuds",
              "images": [{"url": "https://..."}]
            },
            "name": "Wireless Earbuds",
            "price": 1499,
            "quantity": 2
          }
        ],
        "totalAmount": 2998,
        "status": "Delivered",
        "paymentStatus": "paid",
        "paymentMethod": "stripe",
        "shippingAddress": {
          "line1": "123 Dhanmondi, Road #4",
          "city": "Dhaka",
          "pincode": "1205"
        },
        "createdAt": "2026-08-14T10:30:00.000Z",
        "updatedAt": "2026-08-14T14:00:00.000Z"
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

## 3. Get Single Order

### GET `/api/orders/:id`

Get detailed information about a specific order.

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | String | Order ID (24-character hex) |

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "66a1b2c3d4e5f6...",
    "userId": "66a1b2...",
    "sellerId": {
      "_id": "66a1b2...",
      "shopName": "TechHub Dhanmondi",
      "shopAddress": {
        "line1": "123 Dhanmondi, Road #4",
        "city": "Dhaka",
        "pincode": "1205"
      },
      "location": {
        "type": "Point",
        "coordinates": [90.4125, 23.8103]
      }
    },
    "items": [
      {
        "productId": {
          "_id": "66a1b2...",
          "name": "Wireless Earbuds",
          "images": [{"url": "https://..."}]
        },
        "name": "Wireless Earbuds",
        "price": 1499,
        "quantity": 2,
        "productSnapshot": {
          "images": [{"url": "https://..."}],
          "description": "High-quality earbuds",
          "category": "66a1b2..."
        }
      }
    ],
    "subtotal": 2998,
    "shippingCharge": 0,
    "tax": 0,
    "discount": 0,
    "couponCode": null,
    "totalAmount": 2998,
    "shippingAddress": {
      "label": "Home",
      "line1": "123 Dhanmondi, Road #4",
      "city": "Dhaka",
      "pincode": "1205",
      "coordinates": [90.4125, 23.8103],
      "phone": "+8801712345678"
    },
    "status": "Delivered",
    "paymentMethod": "stripe",
    "paymentStatus": "paid",
    "paymentReference": "pi_3P8...",
    "checkoutSessionId": "550e8400-e29b-41d4-a716-446655440000",
    "trackingNumber": "TRK123456",
    "deliveryDate": "2026-08-14T14:00:00.000Z",
    "estimatedDeliveryDate": "2026-08-16T00:00:00.000Z",
    "isReviewed": true,
    "cancellationReason": null,
    "notes": "Leave package at reception",
    "commissionRate": 5,
    "commissionAmount": 149.9,
    "createdAt": "2026-08-14T10:30:00.000Z",
    "updatedAt": "2026-08-14T14:00:00.000Z"
  }
}
```

**Error Responses:**
| Status Code | Message |
|-------------|---------|
| 401 | Authentication required |
| 403 | Unauthorized to view this order (only the buyer or admin can view) |
| 404 | Order not found |

---

## 4. Cancel Order

### PUT `/api/orders/:id/cancel`

Cancel a pending order. Only allowed for orders in `Pending` or `Processing` status. Stock will be restored.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | String | Order ID (24-character hex) |

**Request Body:**
```json
{
  "cancellationReason": "Changed my mind"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| cancellationReason | String | Optional | Reason for cancellation |

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "66a1b2c3d4e5f6...",
    "status": "Cancelled",
    "cancellationReason": "Changed my mind",
    "updatedAt": "2026-08-14T15:00:00.000Z"
  },
  "message": "Order cancelled successfully"
}
```

**Error Responses:**
| Status Code | Message |
|-------------|---------|
| 400 | Order cannot be cancelled at this stage |
| 401 | Authentication required |
| 403 | Unauthorized to cancel this order |
| 404 | Order not found |

---

## 5. Admin: Get All Orders

### GET `/api/orders/admin/all`

Admin only. Retrieve all platform orders with filters.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | Number | 1 | Page number |
| limit | Number | 20 | Items per page |
| status | String | - | Filter by order status |
| sellerId | String | - | Filter by specific seller |
| startDate | String | - | ISO date string (e.g., 2026-08-01) |
| endDate | String | - | ISO date string |

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "_id": "66a1b2c3d4e5f6...",
        "userId": {
          "_id": "66a1b2...",
          "name": "Farhana Rahman",
          "email": "farhana@example.com"
        },
        "sellerId": {
          "_id": "66a1b2...",
          "shopName": "TechHub Dhanmondi"
        },
        "items": [...],
        "totalAmount": 2998,
        "status": "Processing",
        "paymentMethod": "stripe",
        "paymentStatus": "paid",
        "createdAt": "2026-08-14T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 120,
      "totalPages": 6
    }
  }
}
```

**Error Responses:**
| Status Code | Message |
|-------------|---------|
| 401 | Authentication required |
| 403 | Insufficient permissions (Admin only) |

---

## 6. Admin: Update Order Status

### PUT `/api/orders/admin/:id/status`

Admin only. Update the status of any order (e.g., for dispute resolution or manual override).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | String | Order ID (24-character hex) |

**Request Body:**
```json
{
  "status": "Delivered"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| status | String | Required | Valid status: `Pending`, `Processing`, `Shipped`, `Delivered`, `Cancelled`, `Refunded` |

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "66a1b2c3d4e5f6...",
    "status": "Delivered",
    "updatedAt": "2026-08-14T16:00:00.000Z"
  },
  "message": "Order status updated to Delivered"
}
```

**Error Responses:**
| Status Code | Message |
|-------------|---------|
| 400 | Invalid order status |
| 401 | Authentication required |
| 403 | Insufficient permissions (Admin only) |
| 404 | Order not found |

---

## Frontend Usage Examples

### React + RTK Query Example

```javascript
// features/orders/orderApi.js
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const orderApi = createApi({
  reducerPath: 'orderApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/orders',
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Order'],
  endpoints: (builder) => ({
    // Create order (checkout)
    createOrder: builder.mutation({
      query: (orderData) => ({
        url: '/',
        method: 'POST',
        body: orderData,
      }),
      invalidatesTags: ['Order'],
    }),
    
    // Get user orders
    getUserOrders: builder.query({
      query: (params) => ({
        url: '/',
        params,
      }),
      providesTags: ['Order'],
    }),
    
    // Get single order
    getOrderById: builder.query({
      query: (id) => `/${id}`,
      providesTags: (result, error, id) => [{ type: 'Order', id }],
    }),
    
    // Cancel order
    cancelOrder: builder.mutation({
      query: ({ id, cancellationReason }) => ({
        url: `/${id}/cancel`,
        method: 'PUT',
        body: { cancellationReason },
      }),
      invalidatesTags: ['Order'],
    }),
  }),
});

export const {
  useCreateOrderMutation,
  useGetUserOrdersQuery,
  useGetOrderByIdQuery,
  useCancelOrderMutation,
} = orderApi;
```

### Axios Usage Example

```javascript
// services/order.service.js
import axios from './axiosInstance';

const orderService = {
  // Create orders from cart
  createOrder: (data) => axios.post('/api/orders', data),
  
  // Get user orders with filters
  getUserOrders: (params) => axios.get('/api/orders', { params }),
  
  // Get single order
  getOrderById: (orderId) => axios.get(`/api/orders/${orderId}`),
  
  // Cancel order
  cancelOrder: (orderId, reason) => 
    axios.put(`/api/orders/${orderId}/cancel`, { cancellationReason: reason }),
  
  // Admin: Get all orders
  adminGetOrders: (params) => axios.get('/api/orders/admin/all', { params }),
  
  // Admin: Update order status
  adminUpdateStatus: (orderId, status) => 
    axios.put(`/api/orders/admin/${orderId}/status`, { status }),
};

export default orderService;
```

---

## API Integration Checklist for Testers

### Checkout & Order Creation
- [ ] POST `/` - Successfully creates orders from cart
- [ ] Cart is cleared after order creation
- [ ] Multiple orders created when cart has items from different sellers
- [ ] Stock is reduced for each product
- [ ] `checkoutSessionId` is generated and returned
- [ ] Returns error when cart is empty
- [ ] Returns error when any product has insufficient stock
- [ ] Returns error when payment method invalid
- [ ] Coupon code applied correctly (if implemented)

### Order Retrieval
- [ ] GET `/` - Returns user's orders with pagination
- [ ] Status filter works correctly
- [ ] GET `/:id` - Returns correct order details
- [ ] Cannot view other user's order (403)

### Order Cancellation
- [ ] PUT `/:id/cancel` - Cancels pending order
- [ ] Stock is restored after cancellation
- [ ] Cannot cancel order after `Shipped` or later status
- [ ] Cannot cancel other user's order
- [ ] Returns proper error for invalid status transition

### Admin Endpoints
- [ ] GET `/admin/all` - Returns all orders with filters
- [ ] PUT `/admin/:id/status` - Updates order status
- [ ] Admin cannot be accessed by non-admin users (403)

### Error Handling
- [ ] 400 - Validation errors (missing fields, invalid values)
- [ ] 401 - Missing/expired token
- [ ] 403 - Forbidden (wrong user, insufficient permissions)
- [ ] 404 - Order not found
- [ ] 500 - Internal server errors

---

## Order Status Flow

The order status lifecycle is:
```
Pending → Processing → Shipped → Delivered
   ↓           ↓           ↓
Cancelled   Cancelled   Cancelled
                 ↓
              Refunded (from Delivered)
```

- **Pending**: Order placed, awaiting seller confirmation
- **Processing**: Seller has confirmed and is preparing the order
- **Shipped**: Order has been dispatched
- **Delivered**: Order has been delivered to the buyer
- **Cancelled**: Order cancelled (by buyer or seller)
- **Refunded**: Order refunded (after delivery)

---

## Important Notes

1. **Multi-Seller Orders**: When a cart contains items from multiple sellers, the API creates separate orders per seller, all grouped under the same `checkoutSessionId` for single payment.

2. **Stock Management**: Stock is reduced at order creation. If the order is cancelled, stock is restored.

3. **Payment Integration**: The current implementation returns the order data and a `checkoutSessionId`. Payment gateway integration (Stripe/PayPal) is a separate step to be added later.

4. **Permissions**:
   - Users can only view and cancel their own orders.
   - Admins can view all orders and update their status.
   - Seller order management is handled via seller routes.

5. **Order Status Updates**: Sellers update order status via `/api/sellers/orders/:id/status`. Admins can override via `/api/orders/admin/:id/status`.

---

**Document Version:** 1.0  
**Last Updated:** 2026-08-14  
**For:** Frontend Developers & Testers