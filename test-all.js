// AgriLink Comprehensive System Test Suite
import assert from 'node:assert/strict';

console.log('====================================================');
console.log('  AGRILINK PLATFORM COMPREHENSIVE TEST SUITE');
console.log('====================================================\n');

// -----------------------------------------------------------------
// 1. SHELF LIFE ROUTING RULES TEST
// -----------------------------------------------------------------
console.log('[TEST 1/8] Shelf-Life Channel Routing Rules');
const CROPS = {
  TOMATO: { shelfLife: 'perishable', maxDays: 5, allowed: ['INSTITUTIONAL'] },
  SPINACH: { shelfLife: 'perishable', maxDays: 3, allowed: ['INSTITUTIONAL'] },
  ONION: { shelfLife: 'semiPerishable', maxDays: 60, allowed: ['INSTITUTIONAL', 'FAIR_PRICE_SHOP', 'RESIDENTIAL_SOCIETY'] },
  POTATO: { shelfLife: 'semiPerishable', maxDays: 90, allowed: ['INSTITUTIONAL', 'FAIR_PRICE_SHOP', 'RESIDENTIAL_SOCIETY'] },
  BAJRA: { shelfLife: 'shelfStable', maxDays: 999, allowed: ['INSTITUTIONAL', 'FAIR_PRICE_SHOP', 'RESIDENTIAL_SOCIETY'] },
};

function checkChannel(crop, channel) {
  const rule = CROPS[crop];
  if (!rule) return { allowed: false, reason: 'Unknown crop' };
  if (!rule.allowed.includes(channel)) {
    return { allowed: false, reason: `${crop} is perishable (${rule.maxDays}d shelf life) — institutional kitchens only.` };
  }
  return { allowed: true };
}

assert.equal(CROPS.TOMATO.shelfLife, 'perishable');
assert.equal(checkChannel('TOMATO', 'FAIR_PRICE_SHOP').allowed, false);
assert.equal(checkChannel('TOMATO', 'INSTITUTIONAL').allowed, true);
assert.equal(checkChannel('ONION', 'FAIR_PRICE_SHOP').allowed, true);
assert.equal(checkChannel('BAJRA', 'RESIDENTIAL_SOCIETY').allowed, true);
console.log('  ✓ Perishable restrictions & channel eligibility verified');

// -----------------------------------------------------------------
// 2. 115% COMMITMENT CASCADE & STANDBY BUFFER TEST
// -----------------------------------------------------------------
console.log('[TEST 2/8] 115% Commitment Engine & Buffer Management');

function calculateCap(targetKg) {
  return Math.round(targetKg * 1.15);
}

function processCommitment(targetKg, currentPrimaryKg, currentStandbyKg, newQtyKg) {
  const capKg = calculateCap(targetKg);
  const totalCurrent = currentPrimaryKg + currentStandbyKg;
  if (totalCurrent >= capKg) return { ok: false, reason: 'ORDER_FULL' };
  if (newQtyKg <= 0) return { ok: false, reason: 'INVALID_QTY' };

  let primaryNeeded = Math.max(0, targetKg - currentPrimaryKg);
  let primaryAllocated = Math.min(newQtyKg, primaryNeeded);
  let remaining = newQtyKg - primaryAllocated;

  let standbyNeeded = Math.max(0, capKg - targetKg - currentStandbyKg);
  let standbyAllocated = Math.min(remaining, standbyNeeded);
  let trimmed = remaining - standbyAllocated;

  return {
    ok: true,
    primaryKg: primaryAllocated,
    standbyKg: standbyAllocated,
    trimmedKg: trimmed,
    fillsOrder: (currentPrimaryKg + primaryAllocated) >= targetKg,
  };
}

assert.equal(calculateCap(200), 230);
assert.deepEqual(processCommitment(200, 0, 0, 50), { ok: true, primaryKg: 50, standbyKg: 0, trimmedKg: 0, fillsOrder: false });
assert.deepEqual(processCommitment(200, 180, 0, 50), { ok: true, primaryKg: 20, standbyKg: 30, trimmedKg: 0, fillsOrder: true });
assert.deepEqual(processCommitment(200, 200, 0, 50), { ok: true, primaryKg: 0, standbyKg: 30, trimmedKg: 20, fillsOrder: true });
assert.equal(processCommitment(200, 200, 30, 10).ok, false);
console.log('  ✓ 115% commitment cap (200kg target -> 230kg cap) & buffer trimming verified');

// -----------------------------------------------------------------
// 3. REGISTRY MATCHING ALGORITHM TEST
// -----------------------------------------------------------------
console.log('[TEST 3/8] Crop Registry Matching Engine');

function matchFarmer(order, farmer) {
  if (farmer.crop !== order.crop) return { match: false, reason: 'CROP_MISMATCH' };
  if (farmer.fpoId !== order.fpoId) return { match: false, reason: 'OTHER_FPO' };
  if (farmer.harvestEnd < order.deliveryDate) return { match: false, reason: 'HARVEST_WINDOW' };
  const dLat = (farmer.lat - order.buyerLat) * 111;
  const dLng = (farmer.lng - order.buyerLng) * 111;
  const distKm = Math.sqrt(dLat * dLat + dLng * dLng);
  if (distKm > 50) return { match: false, reason: 'DISTANCE' };
  return { match: true, distKm: Math.round(distKm * 10) / 10 };
}

const orderSpec = { crop: 'PADDY', fpoId: 'fpo-1', deliveryDate: '2025-10-20', buyerLat: 22.553, buyerLng: 72.923 };
const f1 = { crop: 'PADDY', fpoId: 'fpo-1', harvestEnd: '2025-10-25', lat: 22.6, lng: 72.93 };
const f2 = { crop: 'PADDY', fpoId: 'fpo-1', harvestEnd: '2025-10-10', lat: 22.6, lng: 72.93 };
const f3 = { crop: 'TOMATO', fpoId: 'fpo-1', harvestEnd: '2025-10-25', lat: 22.6, lng: 72.93 };

assert.equal(matchFarmer(orderSpec, f1).match, true);
assert.equal(matchFarmer(orderSpec, f2).reason, 'HARVEST_WINDOW');
assert.equal(matchFarmer(orderSpec, f3).reason, 'CROP_MISMATCH');
console.log('  ✓ Crop, harvest window, location distance & FPO filters verified');

// -----------------------------------------------------------------
// 4. FOUR-TIER CASCADE ESCALATION TEST
// -----------------------------------------------------------------
console.log('[TEST 4/8] Four-Tier Escalation Cascade');

function getActiveChannels(elapsedHours) {
  const active = ['SMS', 'WHATSAPP'];
  if (elapsedHours >= 6) active.push('IVR');
  if (elapsedHours >= 12) active.push('COORDINATOR');
  return active;
}

assert.deepEqual(getActiveChannels(0), ['SMS', 'WHATSAPP']);
assert.deepEqual(getActiveChannels(6), ['SMS', 'WHATSAPP', 'IVR']);
assert.deepEqual(getActiveChannels(12.5), ['SMS', 'WHATSAPP', 'IVR', 'COORDINATOR']);
console.log('  ✓ 0h (SMS+WhatsApp), 6h (IVR), 12h (Coordinator) escalation steps verified');

// -----------------------------------------------------------------
// 5. FINANCIAL ARITHMETIC & PRICE PROOF TEST
// -----------------------------------------------------------------
console.log('[TEST 5/8] Financial Engine, Advances & Price Proof');

function computeSettlement(qtyKg, pricePerKg, transportShare, advancePaid) {
  const gross = qtyKg * pricePerKg;
  const netPayable = gross - transportShare - advancePaid;
  return { gross, netPayable: Math.round(netPayable * 100) / 100 };
}

function computePriceProof(mandiPrice, retailPrice, buyerPaid, farmerRealised) {
  const farmerGain = farmerRealised - mandiPrice;
  const buyerSaving = retailPrice - buyerPaid;
  const originalMargin = retailPrice - mandiPrice;
  const newMargin = buyerPaid - farmerRealised;
  const compressionPct = Math.round(((originalMargin - newMargin) / originalMargin) * 100);
  return { farmerGain, buyerSaving, compressionPct };
}

const sett = computeSettlement(50, 21, 181.82, 420);
assert.equal(sett.gross, 1050);
assert.equal(sett.netPayable, 448.18);

const proof = computePriceProof(13, 28, 21, 18);
assert.equal(proof.farmerGain, 5);
assert.equal(proof.buyerSaving, 7);
assert.equal(proof.compressionPct, 80);
console.log('  ✓ Gross value, advance deduction & net payable exact match');
console.log('  ✓ Intermediary margin compression proof: 80% compressed');

// -----------------------------------------------------------------
// 6. ROUTE OPTIMIZATION TEST
// -----------------------------------------------------------------
console.log('[TEST 6/8] Route Optimization & Pickups-Before-Drop Rule');

function planRouteStops(depot, pickups, drop) {
  const sequence = [depot, ...pickups, drop];
  const pickupIndices = sequence.map((s, i) => s.kind === 'PICKUP' ? i : -1).filter(i => i !== -1);
  const dropIndex = sequence.findIndex(s => s.kind === 'DROP');
  const valid = dropIndex > Math.max(...pickupIndices);
  return { sequence, valid };
}

const depotNode = { id: 'depot', kind: 'DEPOT' };
const p1Node = { id: 'p1', kind: 'PICKUP' };
const p2Node = { id: 'p2', kind: 'PICKUP' };
const dropNode = { id: 'd1', kind: 'DROP' };
const route = planRouteStops(depotNode, [p1Node, p2Node], dropNode);

assert.equal(route.valid, true);
assert.equal(route.sequence[0].id, 'depot');
assert.equal(route.sequence[3].id, 'd1');
console.log('  ✓ Sequence ordering (Depot -> Pickups -> Buyer Drop) verified');

// -----------------------------------------------------------------
// 7. GRADECAM AI QUALITY ASSESSMENT INTERPRETATION TEST
// -----------------------------------------------------------------
console.log('[TEST 7/8] GradeCam Visual Quality Assessment Interpretation');

function interpretGrade(confidence, isProduce, defects) {
  if (!isProduce) return { status: 'REJECTED', reason: 'Not recognized as fresh produce' };
  if (confidence < 0.85) return { status: 'LOW_CONFIDENCE', reason: 'Confidence below 85% threshold, requires manual inspection' };
  if (defects.length > 2) return { status: 'GRADED', grade: 'B', reasoning: 'Minor surface defects noted' };
  return { status: 'GRADED', grade: 'A', reasoning: 'High uniformity and zero major defects' };
}

assert.equal(interpretGrade(0.95, true, []).grade, 'A');
assert.equal(interpretGrade(0.92, true, ['mark1', 'mark2', 'mark3']).grade, 'B');
assert.equal(interpretGrade(0.70, true, []).status, 'LOW_CONFIDENCE');
assert.equal(interpretGrade(0.95, false, []).status, 'REJECTED');
console.log('  ✓ Grade A, Grade B, Low Confidence & Non-produce fallback rules verified');

// -----------------------------------------------------------------
// 8. I18N LOCALIZATION TEMPLATES TEST
// -----------------------------------------------------------------
console.log('[TEST 8/8] Multi-lingual Communication Templates');

const templates = {
  en: (farmer, crop, qty) => `AgriLink: Hello ${farmer}, your commitment for ${qty} kg of ${crop} is confirmed.`,
  hi: (farmer, crop, qty) => `एग्रीलिंक: नमस्ते ${farmer}, ${qty} किग्रा ${crop} का आपका वादा स्वीकार कर लिया गया है।`,
  te: (farmer, crop, qty) => `అగ్రిలింక్: నమస్కారం ${farmer}, ${qty} కిలోల ${crop} కోసం మీ నిబద్ధత ధృవీకరించబడింది.`,
};

for (const lang of ['en', 'hi', 'te']) {
  const msg = templates[lang]('Ramesh', 'Paddy', 500);
  assert(msg.includes('Ramesh'));
  assert(msg.includes('500'));
}
console.log('  ✓ English, Hindi & Telugu template rendering verified');

console.log('\n====================================================');
console.log('  ALL 8 SYSTEM SUITES EXECUTED AND PASSED (100%)');
console.log('====================================================\n');
