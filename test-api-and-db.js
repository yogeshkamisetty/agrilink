// Comprehensive AgriLink Full-Stack Server & DB Integration Test
import assert from 'node:assert/strict';
import { getDb, resetDatabase } from './lib/server/db.ts';
import { overviewView, orderDetail, pricesView } from './lib/server/views.ts';
import { createOrder, notifyMatched } from './lib/server/sourcing.ts';
import { recordLot } from './lib/server/collection.ts';
import { routePreview, dispatch } from './lib/server/dispatch.ts';
import { confirmDelivery } from './lib/server/delivery.ts';
import { listBuyers } from './lib/server/repo.ts';

async function runFullStackIntegrationTest() {
  console.log('====================================================');
  console.log('  AGRILINK FULL-STACK INTEGRATION & RUNTIME TEST   ');
  console.log('====================================================\n');

  // Step 1: Initialize Database & Seed
  console.log('[STEP 1/7] Initializing PGlite Database & Seeding Schema...');
  const db = await getDb();
  await resetDatabase(db);
  console.log('  ✓ Database schema created and sample data seeded successfully');

  // Step 2: Test Overview View
  console.log('\n[STEP 2/7] Testing Overview View Aggregation...');
  const overview = await overviewView(db);
  assert(overview.orders.length > 0, 'Overview should contain seeded orders');
  assert(overview.metrics.totalVolumeKg >= 0, 'Total volume should be non-negative');
  console.log(`  ✓ Fetched ${overview.orders.length} active orders (${overview.metrics.totalVolumeKg} kg total pilot volume)`);

  // Step 3: Test Order Intake
  console.log('\n[STEP 3/7] Testing Order Intake Workflow...');
  const buyers = await listBuyers(db);
  const buyerId = buyers[0].id;
  const newOrder = await createOrder(db, {
    buyerId,
    crop: 'PADDY',
    qtyTargetKg: 500,
    pricePerKg: 28,
    deliveryDate: '2026-09-20',
  });
  assert.equal(newOrder.crop, 'PADDY');
  assert.equal(newOrder.qtyTargetKg, 500);
  assert.equal(newOrder.status, 'POSTED');
  console.log(`  ✓ Created order ${newOrder.code} for 500 kg Paddy at ₹28/kg`);

  // Step 4: Test Four-Tier Cascade Notification
  console.log('\n[STEP 4/7] Testing Cascade Notifications...');
  const cascadeRes = await notifyMatched(db, newOrder.id, { simulateReplies: true });
  assert(cascadeRes.notifiedCount > 0, 'Should notify matched farmers');
  console.log(`  ✓ Dispatched notifications to ${cascadeRes.notifiedCount} matched farmers in registry`);

  // Step 5: Test Lot Collection & Instant Advance
  console.log('\n[STEP 5/7] Testing Lot Collection & Advance Disbursement...');
  const orderInfo = await orderDetail(db, newOrder.id);
  const matchedFarmer = orderInfo.farmers[0];
  assert(matchedFarmer, 'Order should have matched farmers');

  const collectRes = await recordLot(db, {
    orderId: newOrder.id,
    farmerId: matchedFarmer.farmerId,
    attemptId: null,
    weighedKg: 500,
    decision: 'MANUAL',
    grade: 'A',
    by: 'Coordinator Anita',
  });
  assert(collectRes.lot.qtyAcceptedKg > 0, 'Lot should accept produce');
  assert(collectRes.advance.amount > 0, 'Should disburse 30% instant advance');
  console.log(`  ✓ Accepted ${collectRes.lot.qtyAcceptedKg} kg Grade A lot from ${matchedFarmer.name}`);
  console.log(`  ✓ Disbursed ₹${collectRes.advance.amount} instant advance to farmer account`);

  // Step 6: Test Route Optimization & Dispatch
  console.log('\n[STEP 6/7] Testing Route Optimization & Vehicle Dispatch...');
  const preview = await routePreview(db, [newOrder.id]);
  assert(preview.plan.km > 0, 'Route plan should calculate non-zero km');

  const consignment = await dispatch(db, {
    orderIds: [newOrder.id],
    vehicleCost: 1200,
    vehicleLabel: 'Tata Ace Pickup',
  });
  assert.equal(consignment.vehicleCost, 1200);
  console.log(`  ✓ Consignment dispatched (${preview.plan.km} km route, ₹1,200 vehicle cost allocated)`);

  // Step 7: Test Delivery Confirmation & Settlement
  console.log('\n[STEP 7/7] Testing Delivery Confirmation & Auto-Settlement...');
  const deliveryRes = await confirmDelivery(db, {
    orderId: newOrder.id,
    buyerId,
    rejections: [],
  });
  assert(deliveryRes.settlements.length > 0, 'Settlement receipts should be generated');
  const settlement = deliveryRes.settlements[0];
  console.log(`  ✓ Buyer delivery confirmed! Invoiced ₹${deliveryRes.invoice}`);
  console.log(`  ✓ Generated farmer settlement: Gross ₹${settlement.grossAmount} − Advance ₹${settlement.advanceDeducted} − Transport ₹${settlement.transportShare} = Net Payable ₹${settlement.netPayable}`);

  console.log('\n====================================================');
  console.log('  FULL-STACK END-TO-END WORKFLOW RUN SUCCESSFUL!    ');
  console.log('====================================================\n');
}

runFullStackIntegrationTest().catch((err) => {
  console.error('\n❌ FULL-STACK TEST FAILED:', err);
  process.exit(1);
});
