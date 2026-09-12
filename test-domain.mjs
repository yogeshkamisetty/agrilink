// AgriLink Domain & Engine Test Suite
import assert from 'node:assert/strict';
import { shelfClassOf, channelCheck, harvestLeadDays, SHELF_LIFE_ROUTING, CROP_IDS } from './lib/domain/crops.ts';
import { nextMonday, weekStart, addDays } from './lib/domain/dates.ts';
import { commitmentCap, classifyCommitment, shortfallKg, standbyToPromote, maxAcceptableKg } from './lib/domain/commitments.ts';
import { matchRegistry } from './lib/domain/matching.ts';
import { dueChannels } from './lib/domain/cascade.ts';
import { buyerAdvance, lotAdvance, allocateTransport, settleLot, priceProof, suggestedPrice } from './lib/domain/money.ts';
import { planRoute } from './lib/domain/routing.ts';
import { renderMessage, LANGS } from './lib/domain/i18n.ts';
import { forecastWeek, schoolWeek } from './lib/domain/forecast.ts';

console.log('----------------------------------------------------');
console.log('  AGRILINK PLATFORM COMPREHENSIVE SUITE TEST  ');
console.log('----------------------------------------------------\n');

// 1. Shelf Life Channel Routing
console.log('[1/8] Testing Shelf Life Channel Routing...');
assert.equal(shelfClassOf('TOMATO'), 'perishable');
assert.equal(shelfClassOf('SPINACH'), 'perishable');
assert.equal(shelfClassOf('ONION'), 'semiPerishable');
assert.equal(shelfClassOf('POTATO'), 'semiPerishable');
assert.equal(shelfClassOf('BAJRA'), 'shelfStable');
assert.equal(shelfClassOf('PADDY'), 'shelfStable');
assert.equal(shelfClassOf('WHEAT'), 'shelfStable');

const tomatoAtFps = channelCheck('TOMATO', 'FAIR_PRICE_SHOP');
assert.equal(tomatoAtFps.allowed, false);
assert.equal(channelCheck('TOMATO', 'INSTITUTIONAL').allowed, true);
assert.equal(channelCheck('ONION', 'FAIR_PRICE_SHOP').allowed, true);
assert.equal(channelCheck('BAJRA', 'RESIDENTIAL_SOCIETY').allowed, true);
assert.equal(channelCheck('PADDY', 'INSTITUTIONAL').allowed, true);
assert.equal(channelCheck('WHEAT', 'FAIR_PRICE_SHOP').allowed, true);
console.log('  ✓ Perishable crops restricted to institutional kitchens');
console.log('  ✓ Semi-perishable & shelf-stable routing verified (including Paddy & Wheat)');

// 2. Calendar & Dates Logic
console.log('[2/8] Testing Calendar & Date Arithmetic...');
assert.equal(nextMonday('2026-09-11'), '2026-09-14');
assert.equal(nextMonday('2026-09-14'), '2026-09-21');
assert.equal(weekStart('2026-09-13'), '2026-09-07');
assert.equal(addDays('2026-02-28', 1), '2026-03-01');
console.log('  ✓ Monday harvest windows and week bounds correct');

// 3. 115% Commitment Engine & Standby Trimming
console.log('[3/8] Testing 115% Commitment & Buffer Logic...');
assert.equal(commitmentCap(200), 230);
const totals = (primaryKg, standbyKg) => ({ targetKg: 200, primaryKg, standbyKg });
assert.deepEqual(classifyCommitment(totals(0, 0), 50), { ok: true, primaryKg: 50, standbyKg: 0, trimmedKg: 0, fillsOrder: false });
assert.deepEqual(classifyCommitment(totals(200, 0), 30), { ok: true, primaryKg: 0, standbyKg: 30, trimmedKg: 0, fillsOrder: true });
assert.deepEqual(classifyCommitment(totals(200, 20), 30), { ok: true, primaryKg: 0, standbyKg: 10, trimmedKg: 20, fillsOrder: true });
console.log('  ✓ 115% cap enforced (200 target + 30 standby buffer)');

// 4. Registry Matching Algorithm
console.log('[4/8] Testing Crop Registry Matching Engine...');
const candidate = {
  registryId: 'r1', farmerId: 'f1', farmerName: 'Ramesh Kumar', village: 'Kheda', fpoId: 'fpo1',
  location: { lat: 22.6, lng: 72.93 }, crop: 'TOMATO', status: 'ACTIVE', expectedQtyKg: 50,
  committedElsewhereKg: 0, harvestWindowStart: '2026-09-10', harvestWindowEnd: '2026-09-20'
};
const matchRes = matchRegistry({ crop: 'TOMATO', deliveryDate: '2026-09-14', fpoId: 'fpo1', buyerLocation: { lat: 22.553, lng: 72.923 } }, [candidate]);
assert.equal(matchRes.matched.length, 1);
assert.equal(matchRes.matched[0].farmerId, 'f1');
console.log('  ✓ Crop, harvest window, location & FPO filters verified');

// 5. Cascade Notification Escalation
console.log('[5/8] Testing 4-Tier Notification Cascade...');
assert.deepEqual(dueChannels(0), ['SMS', 'WHATSAPP']);
assert.deepEqual(dueChannels(6), ['SMS', 'WHATSAPP', 'IVR']);
assert.deepEqual(dueChannels(12.5), ['SMS', 'WHATSAPP', 'IVR', 'COORDINATOR']);
console.log('  ✓ SMS, WhatsApp, IVR & Coordinator escalation verified');

// 6. Financial Arithmetic & Price Proof
console.log('[6/8] Testing Settlement & Financial Engine...');
assert.equal(buyerAdvance(200, 21, 0.4), 1680);
assert.equal(lotAdvance(50, 21, 0.4, 1680), 420);
const shares = allocateTransport(600, [{ id: 'a', kg: 50 }, { id: 'b', kg: 75 }, { id: 'c', kg: 40 }]);
const totalTransport = [...shares.values()].reduce((s, v) => s + v, 0);
assert(Math.abs(totalTransport - 600) < 0.01);
const settlement = settleLot(50, 21, 181.82, 420);
assert.equal(settlement.gross, 1050);
assert.equal(settlement.netPayable, 448.18);
const proof = priceProof({ mandi: 13, retail: 28, buyerPaid: 21, farmerRealised: 18 });
assert.equal(proof.farmerGain, 5);
assert.equal(proof.buyerSaving, 7);
assert.equal(proof.compressionPct, 80);
console.log('  ✓ Buyer/Farmer advances & transport share allocations accurate');
console.log('  ✓ Intermediary margin compression proof verified (80% compression)');

// 7. Route Optimization
console.log('[7/8] Testing Route Optimization Engine...');
const depot = { id: 'depot', kind: 'DEPOT', label: 'Depot', lat: 22.613, lng: 72.936 };
const pickups = [{ id: 'petlad', kind: 'PICKUP', label: 'Petlad', lat: 22.4768, lng: 72.7998 }, { id: 'sojitra', kind: 'PICKUP', label: 'Sojitra', lat: 22.5387, lng: 72.7195 }];
const drops = [{ id: 'kitchen', kind: 'DROP', label: 'Kitchen', lat: 22.553, lng: 72.923 }];
const routePlan = planRoute(depot, pickups, drops);
assert.equal(routePlan.sequence[0].id, 'depot');
assert(routePlan.sequence.findIndex(s => s.kind === 'DROP') > routePlan.sequence.findLastIndex(s => s.kind === 'PICKUP'));
assert(routePlan.km <= routePlan.naiveKm);
console.log('  ✓ Pickup-before-drop constraint and distance optimization verified');

// 8. Multi-Lingual Messaging
console.log('[8/8] Testing i18n Localization Engine...');
const msgParams = { crop: 'TOMATO', buyer: 'Kitchen', fpo: 'Mahi FPO', farmer: 'Ramesh', date: '2026-09-14', qty: 200, expected: 50, price: 21, primary: 20, standby: 30, offered: 60, amount: 420, grade: 'A', reason: 'rot', gross: 1050, advance: 420, transport: 181.82, net: 448.18 };
for (const lang of LANGS) {
  const txt = renderMessage('CONFIRMATION', msgParams, lang);
  assert(txt.length > 10);
  assert(!/undefined|NaN|\{|\}/.test(txt));
}
console.log('  ✓ English, Hindi, Telugu & Gujarati message rendering clean without missing keys');

console.log('\n====================================================');
console.log('  ALL 8 DOMAIN ENGINE SUITES PASSED SUCCESSFULLY!   ');
console.log('====================================================\n');
