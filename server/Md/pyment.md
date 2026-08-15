# Payment Routes - API Documentation

## Base URL
`/api/payments`

---

## Authentication
Most endpoints require a valid JWT token:
```
Authorization: Bearer <your_jwt_token>
```
- Public callbacks (`/success`, `/cancel`, `/webhook`) do not require authentication.

---

## 1. Initiate Payment

### POST `/api/payments/initiate`

Start a payment session for a specific order. Returns a payment URL to redirect the user.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "orderId": "66a1b2c3d4e5f6..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| orderId | String | Yes | 24-character hex order ID |

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "66a1b2c3d4e5f6...",
    "paymentUrl": "https://walletmix.com/pay/...",
    "transactionId": "TX123456"
  },
  "message": "Payment initiated successfully"
}
```

**Error Responses:**
| Status Code | Message |
|-------------|---------|
| 400 | Order already paid / Cannot initiate payment for this order |
| 401 | Authentication required |
| 403 | User does not own this order |
| 404 | Order not found |
| 500 | Payment gateway error / Credentials not configured |

---

## 2. Payment Status Check

### GET `/api/payments/status/:orderId`

Retrieve the current payment status of an order.

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| orderId | String | 24-character hex order ID |

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "66a1b2c3d4e5f6...",
    "paymentStatus": "paid",      // 'pending', 'paid', 'failed', 'refunded'
    "status": "Processing",       // Order status
    "paymentReference": "TX123456"
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

## 3. Payment Success Callback (Redirect)

### GET `/api/payments/success`

Public endpoint – called by Walletmix after successful payment.  
The backend verifies the payment and redirects the user to the frontend success page.

**Query Parameters (received from gateway):**
| Parameter | Description |
|-----------|-------------|
| order_id | Order ID |
| transaction_id | Gateway transaction ID |
| status | Payment status from gateway |

**Redirects to:**
- Success: `FRONTEND_URL/payment/success?orderId=<orderId>`
- Failure: `FRONTEND_URL/payment/failed?orderId=<orderId>`

**Frontend handling:**  
After redirection, the frontend should display order confirmation and update the order status via `GET /api/orders/:orderId`.

---

## 4. Payment Cancel Callback (Redirect)

### GET `/api/payments/cancel`

Public endpoint – called by Walletmix when user cancels payment.  
Updates order payment status to `failed` and redirects to frontend cancel page.

**Query Parameters (received from gateway):**
| Parameter | Description |
|-----------|-------------|
| order_id | Order ID |

**Redirects to:** `FRONTEND_URL/payment/cancel?orderId=<orderId>`

**Frontend handling:**  
Show a cancellation message with an option to retry payment.

---

## 5. Webhook (Server-to-Server)

### POST `/api/payments/webhook`

Public endpoint – called by Walletmix to send asynchronous payment status updates.  
Used to confirm payments even if the user closes the browser before redirection.

**Headers:**
```
x-signature: <hmac_signature>
Content-Type: application/json
```

**Request Body (example):**
```json
{
  "order_id": "66a1b2c3d4e5f6...",
  "transaction_id": "TX123456",
  "status": "paid",
  "amount": 2998,
  "method": "bKash"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Webhook processed"
}
```

**Error Responses:**
| Status Code | Message |
|-------------|---------|
| 401 | Invalid signature / Missing signature |
| 404 | Order not found |

**Note:** The webhook endpoint uses `express.raw()` to preserve the raw body for signature verification.  
Your payment gateway must be configured to send the webhook to `https://your-domain.com/api/payments/webhook`.

---

## Frontend Flow & Usage Examples

### React with Axios

```javascript
// 1. After placing an order, get the order ID
const { data: orderData } = await createOrder({ ... });
const orderId = orderData.orders[0]._id;

// 2. Initiate payment
const paymentRes = await axios.post(
  '/api/payments/initiate',
  { orderId },
  { headers: { Authorization: `Bearer ${token}` } }
);

// 3. Redirect to payment gateway
window.location.href = paymentRes.data.data.paymentUrl;
```

**Success/Cancel Page handling:**
```jsx
// /payment/success
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('orderId');
  if (orderId) {
    // Fetch order details and show confirmation
    fetchOrder(orderId);
  }
}, []);
```

**Polling for payment status (optional):**
```javascript
const checkPaymentStatus = async (orderId) => {
  const res = await axios.get(`/api/payments/status/${orderId}`);
  if (res.data.data.paymentStatus === 'paid') {
    // Proceed to order confirmation
  }
};
```

---

## Integration Checklist for Testers

| Test Case | Expected Result |
|-----------|-----------------|
| Initiate payment for valid order | Returns `paymentUrl`; order `paymentStatus` becomes `pending` |
| Initiate payment for already paid order | Returns 400 error |
| Initiate payment for non-existent order | Returns 404 error |
| Payment success callback with valid transaction | Order status becomes `Processing`; `paymentStatus` becomes `paid`; redirects to frontend success |
| Payment success callback with invalid transaction | `paymentStatus` becomes `failed`; redirects to frontend failed |
| Payment cancel callback | `paymentStatus` becomes `failed`; redirects to frontend cancel |
| Webhook with valid signature | Updates order status correctly |
| Webhook with invalid signature | Returns 401 |
| Get payment status for own order | Returns correct status |
| Get payment status for other user's order | Returns 403 |
| Gateway credentials missing | Returns 500 with appropriate message |

---

## Environment Variables (for reference)

| Variable | Description |
|----------|-------------|
| `WALLETMIX_API_URL` | Gateway API base URL |
| `WALLETMIX_API_KEY` | API key for authentication |
| `WALLETMIX_SECRET_KEY` | Secret for signature generation |
| `WALLETMIX_MERCHANT_ID` | Merchant ID provided by Walletmix |
| `WALLETMIX_REDIRECT_URL` | Frontend success page (e.g., `http://localhost:5173/payment/success`) |
| `WALLETMIX_CANCEL_URL` | Frontend cancel page |
| `WALLETMIX_WEBHOOK_URL` | Public webhook URL (e.g., `https://your-domain.com/api/payments/webhook`) |

---

**Document Version:** 1.0  
**Last Updated:** 2026-08-14  
**For:** Frontend Developers & Testers