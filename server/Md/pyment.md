# Payment Routes - API Documentation (PortPos & Cash on Delivery)

## Base URL
`/api/payments`

---

## Supported Payment Gateways / Methods
1. **PortPos (পোর্টপস)**: Online Payment (`PORTPOS`) supporting bKash, Nagad, Rocket, Credit/Debit Cards (Visa, Mastercard, Amex), and Internet Banking.
2. **Cash on Delivery (ক্যাশ অন ডেলিভারি)**: Pay on delivery (`COD`).

---

## Authentication
Protected endpoints require a valid JWT token:
```
Authorization: Bearer <your_jwt_token>
```
- Public callbacks (`/success`, `/cancel`, `/ipn`, `/webhook`) do not require user JWT authentication.

---

## 1. Initiate PortPos Payment

### POST `/api/payments/initiate`

Start a PortPos payment session for a specific order. Returns a payment URL to redirect the user to PortPos hosted payment page.

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
|---|---|---|---|
| orderId | String | Yes | 24-character MongoDB order ID |

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "66a1b2c3d4e5f6...",
    "paymentUrl": "https://payment-sandbox.portpos.com/payment/?invoice=INV_123456",
    "invoiceId": "INV_123456",
    "transactionId": "INV_123456"
  },
  "message": "PortPos payment session initiated successfully"
}
```

**Error Responses:**
| Status Code | Message |
|---|---|
| 400 | Order already paid / Cannot initiate payment for this order |
| 401 | Authentication required |
| 404 | Order not found |
| 500 / 502 | PortPos gateway error / Credentials not configured |

---

## 2. Payment Status Check

### GET `/api/payments/status/:orderId`

Retrieve the current payment status of an order.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "66a1b2c3d4e5f6...",
    "paymentStatus": "paid",
    "status": "Processing",
    "paymentMethod": "PORTPOS",
    "paymentReference": "INV_123456",
    "totalAmount": 1250,
    "currency": "BDT",
    "invoiceId": "INV_123456",
    "paymentUrl": "https://payment-sandbox.portpos.com/payment/?invoice=INV_123456"
  }
}
```

---

## 3. Payment Success Callback (Redirect)

### GET / POST `/api/payments/success`

Called by PortPos gateway after customer completes transaction.  
The backend verifies the transaction with PortPos IPN API and redirects the user to the frontend success page.

**Redirects to:**
- Success: `${FRONTEND_URL}/payment/success?orderId=<orderId>&invoice=<invoiceId>`
- Failure: `${FRONTEND_URL}/payment/failed?orderId=<orderId>`

---

## 4. Payment Cancel Callback (Redirect)

### GET / POST `/api/payments/cancel`

Called by PortPos gateway when the user cancels the payment process.  
**Redirects to:** `${FRONTEND_URL}/payment/cancel?orderId=<orderId>`

---

## 5. Instant Payment Notification (IPN / Webhook)

### POST `/api/payments/ipn` or `/api/payments/webhook`

Asynchronous server-to-server notification sent by PortPos to verify and update the order and payment state in the database.

**Response:**
```json
{
  "success": true,
  "message": "PortPos IPN processed successfully"
}
```

---

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `PORTPOS_APP_KEY` | Application key from PortPos dashboard | `your_app_key` |
| `PORTPOS_SECRET_KEY` | Secret key from PortPos dashboard | `your_secret_key` |
| `PORTPOS_MODE` | Gateway mode (`sandbox` or `live`) | `sandbox` |
| `PORTPOS_REDIRECT_URL` | Redirect callback URL | `https://your-backend.com/api/payments/success` |
| `PORTPOS_CANCEL_URL` | Cancel callback URL | `https://your-backend.com/api/payments/cancel` |
| `PORTPOS_IPN_URL` | IPN webhook URL | `https://your-backend.com/api/payments/ipn` |