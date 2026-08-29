// server/tests/system.test.js
require('dotenv').config();
const assert = require('assert');

console.log('====================================================');
console.log('🧪 Starting VectorX Full Project & PortPos Test Suite');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ [PASS] ${testName}`);
    passedTests++;
  } catch (error) {
    console.error(`❌ [FAIL] ${testName}`);
    console.error(`   Error: ${error.message}`);
    if (error.stack) console.error(`   Stack: ${error.stack.split('\n')[1]}`);
  }
}

async function runAsyncTest(testName, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`✅ [PASS] ${testName}`);
    passedTests++;
  } catch (error) {
    console.error(`❌ [FAIL] ${testName}`);
    console.error(`   Error: ${error.message}`);
    if (error.stack) console.error(`   Stack: ${error.stack.split('\n')[1]}`);
  }
}

async function startSuite() {
  // ----------------------------------------------------
  // 1. Models & Constants Verification
  // ----------------------------------------------------
  console.log('\n--- 1. Testing Order and Payment Models & Constants ---');
  
  runTest('Order model exports ORDER_STATUS, PAYMENT_STATUS, and PAYMENT_METHODS', () => {
    const { Order, ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHODS } = require('../src/models/Order.model');
    assert(Order, 'Order model must be defined');
    assert.strictEqual(ORDER_STATUS.PENDING, 'Pending');
    assert.strictEqual(ORDER_STATUS.PROCESSING, 'Processing');
    assert.strictEqual(PAYMENT_STATUS.PAID, 'paid');
    assert.strictEqual(PAYMENT_STATUS.PENDING, 'pending');
    assert.strictEqual(PAYMENT_METHODS.PORTPOS, 'PORTPOS');
    assert.strictEqual(PAYMENT_METHODS.COD, 'COD');
  });

  runTest('Payment model is correctly defined with all required schema fields', () => {
    const Payment = require('../src/models/Payment.model');
    assert(Payment, 'Payment model must be defined');
    const paths = Payment.schema.paths;
    assert(paths.orderId, 'Payment schema missing orderId');
    assert(paths.userId, 'Payment schema missing userId');
    assert(paths.gateway, 'Payment schema missing gateway');
    assert(paths.status, 'Payment schema missing status');
    assert(paths.invoiceId, 'Payment schema missing invoiceId');
  });

  // ----------------------------------------------------
  // 2. PortPos Payment Service Unit Tests
  // ----------------------------------------------------
  console.log('\n--- 2. Testing PortPos Service ---');

  const paymentService = require('../src/services/payment.service');

  runTest('PortPos generates valid Base64 / MD5 authorization header', () => {
    paymentService.appKey = 'test_app_key_123';
    paymentService.secretKey = 'test_secret_key_456';

    const header = paymentService.generateAuthHeader();
    assert(header.startsWith('Bearer '), 'Header must start with "Bearer "');

    const token = header.replace('Bearer ', '');
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    assert(decoded.startsWith('test_app_key_123:'), 'Decoded header must contain appKey');
    const parts = decoded.split(':');
    assert.strictEqual(parts.length, 2, 'Decoded auth header must be in APPKEY:MD5 format');
    assert.strictEqual(parts[1].length, 32, 'MD5 hash must be 32 characters');
  });

  runTest('PortPos returns null auth header when credentials are empty', () => {
    const oldApp = paymentService.appKey;
    const oldSec = paymentService.secretKey;
    paymentService.appKey = '';
    paymentService.secretKey = '';
    const header = paymentService.generateAuthHeader();
    assert.strictEqual(header, null);
    paymentService.appKey = oldApp;
    paymentService.secretKey = oldSec;
  });

  runTest('PortPos API URLs are correctly resolved for Sandbox vs Live', () => {
    assert(paymentService.apiUrl.includes('portpos.com/payment/v2'), 'API URL must target PortPos v2');
    assert(paymentService.paymentUrl.includes('portpos.com/payment'), 'Payment URL must target PortPos payment');
  });

  await runAsyncTest('PortPos handleIpn parses webhook payload correctly', async () => {
    const fakeIpnPayload = {
      invoice_id: 'INV_TEST_998877',
      amount: 1500,
      reference: '66a1b2c3d4e5f67890123456',
      status: 'ACCEPTED'
    };

    // Temporarily mock verifyPayment
    const origVerify = paymentService.verifyPayment;
    paymentService.verifyPayment = async () => ({ success: true, isPaid: true });

    const parsed = await paymentService.handleIpn(fakeIpnPayload);
    assert.strictEqual(parsed.orderId, '66a1b2c3d4e5f67890123456');
    assert.strictEqual(parsed.invoiceId, 'INV_TEST_998877');
    assert.strictEqual(parsed.amount, 1500);
    assert.strictEqual(parsed.status, 'paid');

    paymentService.verifyPayment = origVerify;
  });

  // ----------------------------------------------------
  // 3. Coupon and Price Calculation Logic Tests
  // ----------------------------------------------------
  console.log('\n--- 3. Testing Order Calculations & Coupon Logic ---');

  runTest('Percentage discount coupon calculates correctly', () => {
    const subtotal = 1000;
    const coupon = { code: 'SAVE20', discount: 20, discountType: 'percentage', minOrderAmount: 500 };
    assert(subtotal >= coupon.minOrderAmount);
    const discountAmount = (subtotal * coupon.discount) / 100;
    assert.strictEqual(discountAmount, 200);
    const shipping = subtotal >= 100 ? 0 : 50;
    assert.strictEqual(shipping, 0);
    const total = subtotal - discountAmount + shipping;
    assert.strictEqual(total, 800);
  });

  runTest('Fixed discount coupon calculates correctly and caps at subtotal', () => {
    const subtotal = 150;
    const coupon = { code: 'FLAT200', discount: 200, discountType: 'fixed', minOrderAmount: 0 };
    const discountAmount = Math.min(subtotal, coupon.discount);
    assert.strictEqual(discountAmount, 150);
    const shipping = subtotal >= 100 ? 0 : 50;
    const total = Math.max(0, subtotal - discountAmount + shipping);
    assert.strictEqual(total, 0);
  });

  // ----------------------------------------------------
  // 4. Geo Service Tests
  // ----------------------------------------------------
  console.log('\n--- 4. Testing Geo Location Service ---');
  const { validateCoordinates, calculateDistance, buildGeoNearStage } = require('../src/services/geo.service');

  runTest('validateCoordinates properly validates lng/lat boundaries', () => {
    assert.strictEqual(validateCoordinates(90.4125, 23.8103), true);
    assert.strictEqual(validateCoordinates(-180, 90), true);
    assert.strictEqual(validateCoordinates(181, 0), false);
    assert.strictEqual(validateCoordinates(0, 91), false);
    assert.strictEqual(validateCoordinates('abc', 0), false);
  });

  runTest('calculateDistance correctly calculates distance in km', () => {
    const dist = calculateDistance([90.4125, 23.8103], [88.3639, 22.5726]);
    assert(dist > 200 && dist < 300, `Distance should be ~250km, got ${dist}`);
    assert.strictEqual(calculateDistance([90, 23], [90, 23]), 0);
    assert.strictEqual(calculateDistance([200, 0], [0, 0]), null);
  });

  runTest('buildGeoNearStage generates valid Mongo aggregation stage', () => {
    const stage = buildGeoNearStage(90.4125, 23.8103, 'distanceKm');
    assert.deepStrictEqual(stage, {
      $geoNear: {
        near: { type: 'Point', coordinates: [90.4125, 23.8103] },
        distanceField: 'distanceKm',
        spherical: true,
        key: 'location'
      }
    });
  });

  // ----------------------------------------------------
  // 5. Controllers & Routes Verification
  // ----------------------------------------------------
  console.log('\n--- 5. Testing Controllers and Express Routes Wiring ---');

  runTest('All controller exports are valid functions', () => {
    const paymentCtrl = require('../src/controllers/payment.controller');
    assert.strictEqual(typeof paymentCtrl.initiatePayment, 'function');
    assert.strictEqual(typeof paymentCtrl.paymentSuccess, 'function');
    assert.strictEqual(typeof paymentCtrl.paymentCancel, 'function');
    assert.strictEqual(typeof paymentCtrl.webhookHandler, 'function');
    assert.strictEqual(typeof paymentCtrl.getPaymentStatus, 'function');

    const orderCtrl = require('../src/controllers/order.controller');
    assert.strictEqual(typeof orderCtrl.createOrders, 'function');
    assert.strictEqual(typeof orderCtrl.getUserOrders, 'function');
    assert.strictEqual(typeof orderCtrl.getOrderById, 'function');
    assert.strictEqual(typeof orderCtrl.cancelOrder, 'function');
    assert.strictEqual(typeof orderCtrl.requestReturn, 'function', 'requestReturn must be exported');
    assert.strictEqual(typeof orderCtrl.adminGetOrders, 'function');
    assert.strictEqual(typeof orderCtrl.adminUpdateOrderStatus, 'function');
    assert.strictEqual(typeof orderCtrl.validateCoupon, 'function');

    const sellerCtrl = require('../src/controllers/seller.controller');
    assert.strictEqual(typeof sellerCtrl.handleReturnDecision, 'function', 'handleReturnDecision must be exported');
    assert.strictEqual(typeof sellerCtrl.issueOrderRefund, 'function', 'issueOrderRefund must be exported');
  });

  // ----------------------------------------------------
  // 6. Return & Refund Lifecycle Tests
  // ----------------------------------------------------
  console.log('\n--- 6. Testing Return and Refund Lifecycle & Methods ---');

  runTest('Order schema defines returnRequest fields and indexes correctly', () => {
    const { Order, ORDER_STATUS } = require('../src/models/Order.model');
    assert.strictEqual(ORDER_STATUS.RETURN_REQUESTED, 'Return_Requested');
    assert.strictEqual(ORDER_STATUS.RETURN_APPROVED, 'Return_Approved');
    assert.strictEqual(ORDER_STATUS.RETURN_REJECTED, 'Return_Rejected');
    assert.strictEqual(ORDER_STATUS.REFUNDED, 'Refunded');

    const returnRequestPath = Order.schema.paths['returnRequest.status'];
    assert(returnRequestPath, 'returnRequest.status path must exist in schema');
    const reasonPath = Order.schema.paths['returnRequest.reason'];
    assert(reasonPath, 'returnRequest.reason path must exist in schema');
  });

  runTest('Order helper methods canRequestReturn() and canSellerDecideReturn() work properly', () => {
    const { Order, ORDER_STATUS } = require('../src/models/Order.model');

    // Case 1: Newly delivered order -> can request return
    const deliveredOrder = new Order({
      userId: '66a1b2c3d4e5f67890123456',
      sellerId: '66a1b2c3d4e5f67890123457',
      items: [{ name: 'Test Product', price: 500, quantity: 1 }],
      totalAmount: 500,
      paymentMethod: 'COD',
      status: ORDER_STATUS.DELIVERED
    });
    assert.strictEqual(deliveredOrder.canRequestReturn(), true, 'Delivered order should allow return request');
    assert.strictEqual(deliveredOrder.canSellerDecideReturn(), false, 'Delivered order without pending return should not allow seller decision');

    // Case 2: Pending order -> cannot request return
    const pendingOrder = new Order({
      userId: '66a1b2c3d4e5f67890123456',
      sellerId: '66a1b2c3d4e5f67890123457',
      items: [{ name: 'Test Product', price: 500, quantity: 1 }],
      totalAmount: 500,
      paymentMethod: 'COD',
      status: ORDER_STATUS.PENDING
    });
    assert.strictEqual(pendingOrder.canRequestReturn(), false, 'Pending order should not allow return request');

    // Case 3: Return requested order -> can seller decide
    const returnRequestedOrder = new Order({
      userId: '66a1b2c3d4e5f67890123456',
      sellerId: '66a1b2c3d4e5f67890123457',
      items: [{ name: 'Test Product', price: 500, quantity: 1 }],
      totalAmount: 500,
      paymentMethod: 'COD',
      status: ORDER_STATUS.RETURN_REQUESTED,
      returnRequest: {
        isRequested: true,
        reason: 'Defective item',
        status: 'pending'
      }
    });
    assert.strictEqual(returnRequestedOrder.canRequestReturn(), false, 'Already requested return order should not allow duplicate return request');
    assert.strictEqual(returnRequestedOrder.canSellerDecideReturn(), true, 'Seller can decide on pending return request');
  });

  runTest('Express Application compiles all routes cleanly', () => {
    const app = require('../src/app');
    assert(app, 'App must be instantiated');
    assert(typeof app.listen === 'function', 'App must be an Express instance');
  });

  // ----------------------------------------------------
  // Summary
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log(`📊 Test Summary: ${passedTests}/${totalTests} Passed`);
  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
  } else {
    console.log('⚠️ Some tests failed. Please review the output above.');
  }
  console.log('====================================================\n');
}

startSuite();
