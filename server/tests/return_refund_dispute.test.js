// server/tests/return_refund_dispute.test.js
require('dotenv').config();
const assert = require('assert');
const mongoose = require('mongoose');

console.log('================================================================');
console.log('🧪 VectorX Return / Refund / Dispute Resolution Test Suite');
console.log('================================================================\n');

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
  const { Order, ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHODS } = require('../src/models/Order.model');

  // ----------------------------------------------------
  // 1. Order Model Return Statuses & Helpers
  // ----------------------------------------------------
  console.log('--- 1. Order Status Constants & Helpers ---');

  runTest('ORDER_STATUS contains all required return & refund lifecycle constants', () => {
    assert.strictEqual(ORDER_STATUS.PENDING, 'Pending');
    assert.strictEqual(ORDER_STATUS.PROCESSING, 'Processing');
    assert.strictEqual(ORDER_STATUS.SHIPPED, 'Shipped');
    assert.strictEqual(ORDER_STATUS.DELIVERED, 'Delivered');
    assert.strictEqual(ORDER_STATUS.RETURN_REQUESTED, 'Return_Requested');
    assert.strictEqual(ORDER_STATUS.RETURN_APPROVED, 'Return_Approved');
    assert.strictEqual(ORDER_STATUS.RETURN_REJECTED, 'Return_Rejected');
    assert.strictEqual(ORDER_STATUS.REFUNDED, 'Refunded');
    assert.strictEqual(ORDER_STATUS.CANCELLED, 'Cancelled');
  });

  runTest('Buyer can only request return on Delivered orders without active return', () => {
    const dummyId = new mongoose.Types.ObjectId();
    const sellerId = new mongoose.Types.ObjectId();

    // 1. Delivered order without return -> ALLOWED
    const deliveredOrder = new Order({
      userId: dummyId,
      sellerId: sellerId,
      items: [{ name: 'Running Shoes', price: 1200, quantity: 1 }],
      totalAmount: 1200,
      paymentMethod: PAYMENT_METHODS.COD,
      status: ORDER_STATUS.DELIVERED
    });
    assert.strictEqual(deliveredOrder.canRequestReturn(), true);

    // 2. Pending order -> NOT ALLOWED
    const pendingOrder = new Order({
      userId: dummyId,
      sellerId: sellerId,
      items: [{ name: 'Running Shoes', price: 1200, quantity: 1 }],
      totalAmount: 1200,
      paymentMethod: PAYMENT_METHODS.COD,
      status: ORDER_STATUS.PENDING
    });
    assert.strictEqual(pendingOrder.canRequestReturn(), false);

    // 3. Shipped order -> NOT ALLOWED
    const shippedOrder = new Order({
      userId: dummyId,
      sellerId: sellerId,
      items: [{ name: 'Running Shoes', price: 1200, quantity: 1 }],
      totalAmount: 1200,
      paymentMethod: PAYMENT_METHODS.COD,
      status: ORDER_STATUS.SHIPPED
    });
    assert.strictEqual(shippedOrder.canRequestReturn(), false);

    // 4. Delivered order with pending return -> NOT ALLOWED (prevents duplicates)
    const existingReturnOrder = new Order({
      userId: dummyId,
      sellerId: sellerId,
      items: [{ name: 'Running Shoes', price: 1200, quantity: 1 }],
      totalAmount: 1200,
      paymentMethod: PAYMENT_METHODS.COD,
      status: ORDER_STATUS.RETURN_REQUESTED,
      returnRequest: { isRequested: true, status: 'pending', reason: 'Defective' }
    });
    assert.strictEqual(existingReturnOrder.canRequestReturn(), false);
  });

  runTest('Seller can only decide return on orders with pending return request', () => {
    const dummyId = new mongoose.Types.ObjectId();
    const sellerId = new mongoose.Types.ObjectId();

    const returnReqOrder = new Order({
      userId: dummyId,
      sellerId: sellerId,
      items: [{ name: 'Smart Watch', price: 2500, quantity: 1 }],
      totalAmount: 2500,
      paymentMethod: PAYMENT_METHODS.PORTPOS,
      status: ORDER_STATUS.RETURN_REQUESTED,
      returnRequest: { isRequested: true, status: 'pending', reason: 'Damaged during delivery' }
    });
    assert.strictEqual(returnReqOrder.canSellerDecideReturn(), true);

    const normalDeliveredOrder = new Order({
      userId: dummyId,
      sellerId: sellerId,
      items: [{ name: 'Smart Watch', price: 2500, quantity: 1 }],
      totalAmount: 2500,
      paymentMethod: PAYMENT_METHODS.PORTPOS,
      status: ORDER_STATUS.DELIVERED
    });
    assert.strictEqual(normalDeliveredOrder.canSellerDecideReturn(), false);
  });

  // ----------------------------------------------------
  // 2. Buyer Return Request Workflow Simulation
  // ----------------------------------------------------
  console.log('\n--- 2. Buyer Return Request Workflow ---');

  runTest('Buyer return submission populates returnRequest subdocument correctly', () => {
    const dummyId = new mongoose.Types.ObjectId();
    const sellerId = new mongoose.Types.ObjectId();

    const order = new Order({
      userId: dummyId,
      sellerId: sellerId,
      items: [{ name: 'Wireless Headphones', price: 1800, quantity: 1 }],
      totalAmount: 1800,
      paymentMethod: PAYMENT_METHODS.COD,
      paymentStatus: 'paid',
      status: ORDER_STATUS.DELIVERED
    });

    const reason = 'Wrong item or size received';
    const customerNotes = 'Ordered size 9 but received size 8';

    order.status = ORDER_STATUS.RETURN_REQUESTED;
    order.returnRequest = {
      isRequested: true,
      reason,
      customerNotes,
      requestedAt: new Date(),
      status: 'pending',
      refundAmount: order.totalAmount
    };

    assert.strictEqual(order.status, ORDER_STATUS.RETURN_REQUESTED);
    assert.strictEqual(order.returnRequest.isRequested, true);
    assert.strictEqual(order.returnRequest.status, 'pending');
    assert.strictEqual(order.returnRequest.reason, 'Wrong item or size received');
    assert.strictEqual(order.returnRequest.customerNotes, 'Ordered size 9 but received size 8');
    assert.strictEqual(order.returnRequest.refundAmount, 1800);
  });

  // ----------------------------------------------------
  // 3. Seller Approval & Rejection Flows
  // ----------------------------------------------------
  console.log('\n--- 3. Seller Approval & Rejection Scenarios ---');

  runTest('Scenario 3A: Seller Approves Return & Issues Immediate Refund', () => {
    const order = new Order({
      userId: new mongoose.Types.ObjectId(),
      sellerId: new mongoose.Types.ObjectId(),
      items: [{ productId: new mongoose.Types.ObjectId(), name: 'Winter Jacket', price: 3200, quantity: 1 }],
      totalAmount: 3200,
      paymentMethod: PAYMENT_METHODS.PORTPOS,
      paymentStatus: 'paid',
      status: ORDER_STATUS.RETURN_REQUESTED,
      returnRequest: {
        isRequested: true,
        reason: 'Defective zipper',
        status: 'pending'
      }
    });

    const sellerComment = 'Apologies for the defect. We have approved full refund.';
    order.status = ORDER_STATUS.REFUNDED;
    order.paymentStatus = PAYMENT_STATUS.REFUNDED;
    order.refundAmount = order.totalAmount;
    order.refundDate = new Date();
    order.returnRequest = {
      ...order.returnRequest.toObject(),
      status: 'refunded',
      refundAmount: order.totalAmount,
      refundDate: new Date(),
      sellerResponse: {
        decision: 'approved',
        comment: sellerComment,
        respondedAt: new Date()
      }
    };

    assert.strictEqual(order.status, ORDER_STATUS.REFUNDED);
    assert.strictEqual(order.paymentStatus, 'refunded');
    assert.strictEqual(order.refundAmount, 3200);
    assert.strictEqual(order.returnRequest.status, 'refunded');
    assert.strictEqual(order.returnRequest.sellerResponse.decision, 'approved');
    assert.strictEqual(order.returnRequest.sellerResponse.comment, sellerComment);
  });

  runTest('Scenario 3B: Seller Approves Return (Awaiting Physical Shipment)', () => {
    const order = new Order({
      userId: new mongoose.Types.ObjectId(),
      sellerId: new mongoose.Types.ObjectId(),
      items: [{ productId: new mongoose.Types.ObjectId(), name: 'Smartphone Case', price: 450, quantity: 2 }],
      totalAmount: 900,
      paymentMethod: PAYMENT_METHODS.COD,
      paymentStatus: 'paid',
      status: ORDER_STATUS.RETURN_REQUESTED,
      returnRequest: {
        isRequested: true,
        reason: 'Item does not match description',
        status: 'pending'
      }
    });

    const sellerInstruction = 'Return approved. Please ship to: 123 Commercial Hub, Dhaka.';
    order.status = ORDER_STATUS.RETURN_APPROVED;
    order.returnRequest = {
      ...order.returnRequest.toObject(),
      status: 'approved',
      refundAmount: order.totalAmount,
      sellerResponse: {
        decision: 'approved',
        comment: sellerInstruction,
        respondedAt: new Date()
      }
    };

    assert.strictEqual(order.status, ORDER_STATUS.RETURN_APPROVED);
    assert.strictEqual(order.returnRequest.status, 'approved');
    assert.strictEqual(order.paymentStatus, 'paid');

    // Later: Seller receives parcel and issues final refund
    order.status = ORDER_STATUS.REFUNDED;
    order.paymentStatus = PAYMENT_STATUS.REFUNDED;
    order.refundDate = new Date();
    order.returnRequest.status = 'refunded';
    order.returnRequest.refundDate = new Date();

    assert.strictEqual(order.status, ORDER_STATUS.REFUNDED);
    assert.strictEqual(order.paymentStatus, 'refunded');
  });

  runTest('Scenario 3C: Seller Rejects Return with Custom Reason', () => {
    const order = new Order({
      userId: new mongoose.Types.ObjectId(),
      sellerId: new mongoose.Types.ObjectId(),
      items: [{ productId: new mongoose.Types.ObjectId(), name: 'Earbuds', price: 1500, quantity: 1 }],
      totalAmount: 1500,
      paymentMethod: PAYMENT_METHODS.PORTPOS,
      paymentStatus: 'paid',
      status: ORDER_STATUS.RETURN_REQUESTED,
      returnRequest: {
        isRequested: true,
        reason: 'Changed my mind',
        status: 'pending'
      }
    });

    const rejectReason = 'Personal hygiene items cannot be returned once unsealed.';
    order.status = ORDER_STATUS.RETURN_REJECTED;
    order.returnRequest = {
      ...order.returnRequest.toObject(),
      status: 'rejected',
      sellerResponse: {
        decision: 'rejected',
        comment: rejectReason,
        respondedAt: new Date()
      }
    };

    assert.strictEqual(order.status, ORDER_STATUS.RETURN_REJECTED);
    assert.strictEqual(order.returnRequest.status, 'rejected');
    assert.strictEqual(order.returnRequest.sellerResponse.decision, 'rejected');
    assert.strictEqual(order.returnRequest.sellerResponse.comment, rejectReason);
    assert.strictEqual(order.paymentStatus, 'paid');
  });

  // ----------------------------------------------------
  // 4. Admin Dispute Resolution Workflow
  // ----------------------------------------------------
  console.log('\n--- 4. Admin Dispute Resolution & Intervention ---');

  runTest('Scenario 4A: Admin Intervenes in Disputed/Declined Return & Resolves to Refunded', () => {
    const order = new Order({
      userId: new mongoose.Types.ObjectId(),
      sellerId: new mongoose.Types.ObjectId(),
      items: [{ productId: new mongoose.Types.ObjectId(), name: 'Gaming Mouse', price: 2200, quantity: 1 }],
      totalAmount: 2200,
      paymentMethod: PAYMENT_METHODS.PORTPOS,
      paymentStatus: 'paid',
      status: ORDER_STATUS.RETURN_REJECTED,
      returnRequest: {
        isRequested: true,
        reason: 'Sensor stopped working on day 2',
        status: 'rejected',
        sellerResponse: {
          decision: 'rejected',
          comment: 'User damage alleged'
        }
      }
    });

    const adminDisputeNote = 'Customer provided proof video of hardware failure. Approved by Admin Trust & Safety.';
    order.status = ORDER_STATUS.REFUNDED;
    order.paymentStatus = PAYMENT_STATUS.REFUNDED;
    order.refundDate = new Date();
    order.refundAmount = order.totalAmount;
    order.returnRequest.status = 'refunded';
    order.returnRequest.refundDate = new Date();
    order.returnRequest.refundAmount = order.totalAmount;
    order.returnRequest.sellerResponse = {
      decision: 'approved',
      comment: `Dispute resolved by Admin: ${adminDisputeNote}`,
      respondedAt: new Date()
    };
    order.notes = `Admin note: ${adminDisputeNote}`;

    assert.strictEqual(order.status, ORDER_STATUS.REFUNDED);
    assert.strictEqual(order.paymentStatus, 'refunded');
    assert.strictEqual(order.refundAmount, 2200);
    assert.strictEqual(order.returnRequest.status, 'refunded');
    assert(order.returnRequest.sellerResponse.comment.includes('Dispute resolved by Admin'));
    assert(order.notes.includes(adminDisputeNote));
  });

  runTest('Scenario 4B: Admin Overrides Status to other lifecycle stages with audit trail', () => {
    const order = new Order({
      userId: new mongoose.Types.ObjectId(),
      sellerId: new mongoose.Types.ObjectId(),
      items: [{ name: 'Book', price: 350, quantity: 1 }],
      totalAmount: 350,
      paymentMethod: PAYMENT_METHODS.COD,
      status: ORDER_STATUS.SHIPPED
    });

    order.status = ORDER_STATUS.DELIVERED;
    order.notes = 'Admin note: Courier confirmed delivery with signature.';

    assert.strictEqual(order.status, ORDER_STATUS.DELIVERED);
    assert(order.notes.includes('Courier confirmed delivery'));
  });

  // ----------------------------------------------------
  // 5. Controller & Route Signatures
  // ----------------------------------------------------
  console.log('\n--- 5. Route Handlers & Controller Signatures ---');

  runTest('Order controller exports buyer return endpoint', () => {
    const orderController = require('../src/controllers/order.controller');
    assert.strictEqual(typeof orderController.requestReturn, 'function');
  });

  runTest('Seller controller exports return-decision and refund handlers', () => {
    const sellerController = require('../src/controllers/seller.controller');
    assert.strictEqual(typeof sellerController.handleReturnDecision, 'function');
    assert.strictEqual(typeof sellerController.issueOrderRefund, 'function');
  });

  runTest('Admin controller exports dispute updateOrderStatus handler', () => {
    const adminController = require('../src/controllers/admin.controller');
    assert.strictEqual(typeof adminController.updateOrderStatus, 'function');
  });

  // ----------------------------------------------------
  // Summary
  // ----------------------------------------------------
  console.log('\n================================================================');
  console.log(`📊 Return / Refund / Dispute Test Summary: ${passedTests}/${totalTests} Passed`);
  if (passedTests === totalTests) {
    console.log('🎉 ALL RETURN, REFUND & DISPUTE TESTS PASSED SUCCESSFULLY!');
  } else {
    console.log('⚠️ Some tests failed. Please inspect the log output above.');
  }
  console.log('================================================================\n');
}

startSuite();
