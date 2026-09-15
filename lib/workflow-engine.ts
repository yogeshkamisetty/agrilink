// lib/workflow-engine.ts
// Unified Real-Time Cross-Role Workflow Engine for AgriLink
// Primary Flow:
// 400 kg declared → 392 kg scale → 370 kg accepted → 370 kg verified inventory
// → buyer order 300 kg → 300 kg reserved → 70 kg remaining
// → dispatch moves 300 kg out of available → delivery sign-off → farmer settlement (370 kg accepted × ₹30 - ₹240 = ₹10,860)

export interface WorkflowCollectionRequest {
  id: string
  requestId: string
  farmerId: string
  farmerName: string
  farmerPhone: string
  village: string
  crop: string
  declaredKg: number
  status: 'REQUESTED' | 'SCHEDULED' | 'HANDED_OVER' | 'WEIGHED'
  scheduledSlot: string
  preferredHub: string
  assignedVehicle?: string
  scaleKg?: number
  lotCode?: string
  createdAt: string
  updatedAt: string
}

export interface WorkflowLot {
  id: string
  lotCode: string
  collectionRequestId: string
  farmerName: string
  crop: string
  scaleKg: number
  acceptedKg: number
  rejectedKg: number
  grade: 'A' | 'B' | 'C'
  confidence: number
  status: 'WEIGHED' | 'QC_IN_PROGRESS' | 'QC_VERIFIED'
  weighbridgeAt: string
  verifiedAt?: string
  qcNotes: string
}

export interface WorkflowVerifiedInventory {
  id: string
  lotCode: string
  crop: string
  totalVerifiedKg: number
  reservedKg: number
  availableKg: number
  grade: string
  storageLocation: string
  fpoName: string
  status: 'IN_STOCK' | 'PARTIALLY_RESERVED' | 'FULLY_ALLOCATED' | 'DISPATCHED'
}

export interface WorkflowBuyerOrder {
  id: string
  code: string
  buyerName: string
  buyerType: string
  crop: string
  qtyTargetKg: number
  pricePerKg: number
  totalAmount: number
  advanceAmount: number
  status: 'POSTED' | 'MATCHED' | 'RESERVED' | 'DISPATCHED' | 'DELIVERED'
  reservedFromLotCode?: string
  deliveryDate: string
  deliveryLocation: string
  orderedAt: string
}

export interface WorkflowDispatch {
  id: string
  dispatchCode: string
  orderCode: string
  crop: string
  qtyKg: number
  fromHub: string
  destination: string
  vehicleNo: string
  driverName: string
  driverPhone: string
  status: 'LOADING' | 'IN_TRANSIT' | 'DELIVERED'
  dispatchedAt?: string
  deliveredAt?: string
}

export interface WorkflowSettlement {
  id: string
  settlementCode: string
  lotCode: string
  orderCode: string
  farmerName: string
  crop: string
  declaredKg: number
  weighedKg: number
  acceptedKg: number
  agreedPricePerKg: number
  grossAmount: number
  weighbridgeFee: number
  transportShare: number
  totalDeductions: number
  netPayable: number
  status: 'CALCULATED' | 'ESCROW_FUNDED' | 'DISBURSED'
  bankAccount: string
  utrCode: string
  settledAt: string
}

export interface WorkflowState {
  stage: number // 1 to 7
  collections: WorkflowCollectionRequest[]
  lots: WorkflowLot[]
  inventory: WorkflowVerifiedInventory[]
  orders: WorkflowBuyerOrder[]
  dispatches: WorkflowDispatch[]
  settlements: WorkflowSettlement[]
  lastAction: string
  timestamp: string
}

const STORAGE_KEY = 'agrilink_primary_workflow_state'

export const INITIAL_PRIMARY_DEMO_STATE: WorkflowState = {
  stage: 1, // Start with declared harvest ready for collection
  collections: [
    {
      id: 'col-1042',
      requestId: 'REQ-COL-1042',
      farmerId: 'f-ravi',
      farmerName: 'Ravi Kumar',
      farmerPhone: '+91 98251 44102',
      village: 'Anand Rural (Plot 01)',
      crop: 'TOMATO',
      declaredKg: 400, // 400 kg declared
      status: 'REQUESTED',
      scheduledSlot: '24 Sep 2026 • 8:00 AM – 10:00 AM',
      preferredHub: 'Mahi Valley FPO Collection Hub #1',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
  ],
  lots: [],
  inventory: [],
  orders: [],
  dispatches: [],
  settlements: [],
  lastAction: 'Initial State: 400 kg Tomato Harvest Declared by Ravi Kumar',
  timestamp: new Date().toISOString(),
}

let memoryState: WorkflowState = { ...INITIAL_PRIMARY_DEMO_STATE }

/** Broadcast workflow sync message to other tabs/windows */
function broadcastSync(state: WorkflowState) {
  memoryState = state
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    const bc = new BroadcastChannel('agrilink_sync')
    bc.postMessage({ type: 'WORKFLOW_STATE_UPDATED', state })
    bc.close()
    window.dispatchEvent(new CustomEvent('agrilink:workflow-updated', { detail: state }))
  } catch (err) {
    console.warn('Workflow broadcast sync error:', err)
  }
}

/** Get current workflow state from storage or initialize default */
export function getWorkflowState(): WorkflowState {
  if (typeof window === 'undefined') return memoryState
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryState))
      return memoryState
    }
    const parsed = JSON.parse(raw) as WorkflowState
    memoryState = parsed
    return parsed
  } catch {
    return memoryState
  }
}

/** Save and broadcast workflow state */
export function setWorkflowState(state: WorkflowState): WorkflowState {
  memoryState = state
  broadcastSync(state)
  return state
}


/**
 * Reset entire flow to baseline:
 * 400 kg declared ready for collection
 */
export function resetWorkflowToDemoBaseline(): WorkflowState {
  const resetState: WorkflowState = {
    ...INITIAL_PRIMARY_DEMO_STATE,
    timestamp: new Date().toISOString(),
  }
  return setWorkflowState(resetState)
}

/**
 * STEP 1: Farmer declares harvest and requests collection (400 kg declared)
 */
export function step1FarmerRequestCollection(qtyKg = 400, crop = 'TOMATO'): WorkflowState {
  const current = getWorkflowState()
  const newCol: WorkflowCollectionRequest = {
    id: `col-${Date.now()}`,
    requestId: `REQ-COL-${Math.floor(1000 + Math.random() * 9000)}`,
    farmerId: 'f-ravi',
    farmerName: 'Ravi Kumar',
    farmerPhone: '+91 98251 44102',
    village: 'Anand Rural',
    crop,
    declaredKg: qtyKg, // 400 kg
    status: 'REQUESTED',
    scheduledSlot: '24 Sep 2026 • 8:00 AM – 10:00 AM',
    preferredHub: 'Mahi Valley FPO Collection Hub #1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const updated: WorkflowState = {
    ...current,
    stage: 1,
    collections: [newCol, ...current.collections.filter((c) => c.id !== 'col-1042')],
    lastAction: `Step 1: Farmer requested collection for ${qtyKg} kg ${crop}`,
    timestamp: new Date().toISOString(),
  }
  return setWorkflowState(updated)
}

/**
 * STEP 2: FPO Coordinator receives and schedules collection route / slot
 */
export function step2FpoScheduleCollection(collectionId?: string): WorkflowState {
  const current = getWorkflowState()
  const target = collectionId ? current.collections.find((c) => c.id === collectionId) : current.collections[0]
  if (!target) return current

  const updatedCollections = current.collections.map((c) =>
    c.id === target.id
      ? {
          ...c,
          status: 'SCHEDULED' as const,
          assignedVehicle: 'Tata Ace 1.5t (AP XX XX 1234)',
          scheduledSlot: '24 Sep 2026 • 8:00 AM – 10:00 AM',
          updatedAt: new Date().toISOString(),
        }
      : c
  )

  const updated: WorkflowState = {
    ...current,
    stage: 2,
    collections: updatedCollections,
    lastAction: `Step 2: FPO scheduled collection slot & vehicle for ${target.declaredKg} kg`,
    timestamp: new Date().toISOString(),
  }
  return setWorkflowState(updated)
}

/**
 * STEP 3: Produce arrives at weighbridge. Scale reading: 392 kg gross (8kg shrinkage/tare)
 */
export function step3ReceiveAndWeigh(scaleGrossKg = 392, collectionId?: string): WorkflowState {
  const current = getWorkflowState()
  const target = collectionId ? current.collections.find((c) => c.id === collectionId) : current.collections[0]
  if (!target) return current

  const lotCode = `LOT-${target.crop.slice(0, 3)}-0924-${scaleGrossKg}`
  const updatedCollections = current.collections.map((c) =>
    c.id === target.id
      ? {
          ...c,
          status: 'WEIGHED' as const,
          scaleKg: scaleGrossKg,
          lotCode,
          updatedAt: new Date().toISOString(),
        }
      : c
  )

  const newLot: WorkflowLot = {
    id: `lot-${Date.now()}`,
    lotCode,
    collectionRequestId: target.requestId,
    farmerName: target.farmerName,
    crop: target.crop,
    scaleKg: scaleGrossKg, // 392 kg
    acceptedKg: 0,
    rejectedKg: 0,
    grade: 'A',
    confidence: 94,
    status: 'WEIGHED',
    weighbridgeAt: new Date().toISOString(),
    qcNotes: 'Weighbridge gross intake complete. Ready for GradeCam AI optical check.',
  }

  const updated: WorkflowState = {
    ...current,
    stage: 3,
    collections: updatedCollections,
    lots: [newLot, ...current.lots.filter((l) => l.lotCode !== lotCode)],
    lastAction: `Step 3: Weighbridge gross scale recorded at ${scaleGrossKg} kg (400 kg declared)`,
    timestamp: new Date().toISOString(),
  }
  return setWorkflowState(updated)
}

/**
 * STEP 4: Quality verification (GradeCam AI / QC inspection).
 * Sorting deduction: 22 kg blemish/undersized → 370 kg accepted Grade A
 * Moves directly into Verified Inventory (370 kg verified)
 */
export function step4QualityVerifyAndCreateInventory(
  acceptedKg = 370,
  rejectedKg = 22,
  grade: 'A' | 'B' | 'C' = 'A'
): WorkflowState {
  const current = getWorkflowState()
  const lot = current.lots[0] || {
    id: 'lot-default',
    lotCode: 'LOT-TOM-0924-392',
    collectionRequestId: 'REQ-COL-1042',
    farmerName: 'Ravi Kumar',
    crop: 'TOMATO',
    scaleKg: 392,
    acceptedKg: 0,
    rejectedKg: 0,
    grade: 'A' as const,
    confidence: 94,
    status: 'WEIGHED' as const,
    weighbridgeAt: new Date().toISOString(),
    qcNotes: '',
  }

  const verifiedLot: WorkflowLot = {
    ...lot,
    acceptedKg, // 370 kg
    rejectedKg, // 22 kg
    grade,
    status: 'QC_VERIFIED',
    verifiedAt: new Date().toISOString(),
    qcNotes: `GradeCam AI surface inspection passed with 94% confidence. ${rejectedKg} kg blemish deduction; ${acceptedKg} kg certified Grade ${grade}.`,
  }

  const newInventory: WorkflowVerifiedInventory = {
    id: `inv-${Date.now()}`,
    lotCode: verifiedLot.lotCode,
    crop: verifiedLot.crop,
    totalVerifiedKg: acceptedKg, // 370 kg
    reservedKg: 0,
    availableKg: acceptedKg, // 370 kg available
    grade,
    storageLocation: 'Anand Hub Cold Room Bay 02',
    fpoName: 'Mahi Valley FPO',
    status: 'IN_STOCK',
  }

  const updated: WorkflowState = {
    ...current,
    stage: 4,
    lots: [verifiedLot, ...current.lots.filter((l) => l.lotCode !== verifiedLot.lotCode)],
    inventory: [newInventory, ...current.inventory.filter((i) => i.lotCode !== verifiedLot.lotCode)],
    lastAction: `Step 4: GradeCam certified ${acceptedKg} kg accepted Grade ${grade} → 370 kg Verified Inventory`,
    timestamp: new Date().toISOString(),
  }
  return setWorkflowState(updated)
}

/**
 * STEP 5: Buyer creates demand order for 300 kg.
 * Global supply allocation engine matches and reserves 300 kg against the 370 kg verified lot.
 * Exactly 70 kg remaining verified stock in the hub!
 */
export function step5BuyerOrderAndReserve(orderQtyKg = 300): WorkflowState {
  const current = getWorkflowState()
  let inv = current.inventory[0]
  if (!inv) {
    // If inventory not yet initialized, initialize with 370 kg
    inv = {
      id: 'inv-init',
      lotCode: 'LOT-TOM-0924-392',
      crop: 'TOMATO',
      totalVerifiedKg: 370,
      reservedKg: 0,
      availableKg: 370,
      grade: 'A',
      storageLocation: 'Anand Hub Cold Room Bay 02',
      fpoName: 'Mahi Valley FPO',
      status: 'IN_STOCK',
    }
  }

  const reservedKg = Math.min(inv.totalVerifiedKg, orderQtyKg) // 300 kg
  const remainingAvailableKg = Math.max(0, inv.totalVerifiedKg - reservedKg) // 70 kg!

  const updatedInventory: WorkflowVerifiedInventory = {
    ...inv,
    reservedKg, // 300 kg reserved
    availableKg: remainingAvailableKg, // 70 kg remaining!
    status: remainingAvailableKg === 0 ? 'FULLY_ALLOCATED' : 'PARTIALLY_RESERVED',
  }

  const newOrder: WorkflowBuyerOrder = {
    id: `ord-${Date.now()}`,
    code: 'AG-1002',
    buyerName: 'PM POSHAN Central Kitchen, Anand',
    buyerType: 'INSTITUTIONAL',
    crop: inv.crop,
    qtyTargetKg: orderQtyKg, // 300 kg
    pricePerKg: 35.0,
    totalAmount: orderQtyKg * 35.0, // ₹10,500
    advanceAmount: Math.round(orderQtyKg * 35.0 * 0.3), // ₹3,150 (30% escrow)
    status: 'RESERVED',
    reservedFromLotCode: inv.lotCode,
    deliveryDate: '24 Sep 2026',
    deliveryLocation: 'PM POSHAN Central Kitchen, Station Road',
    orderedAt: new Date().toISOString(),
  }

  const updated: WorkflowState = {
    ...current,
    stage: 5,
    inventory: [updatedInventory, ...current.inventory.filter((i) => i.id !== inv.id)],
    orders: [newOrder, ...current.orders.filter((o) => o.code !== 'AG-1002')],
    lastAction: `Step 5: Buyer order for ${orderQtyKg} kg matched & reserved. Remaining verified stock: ${remainingAvailableKg} kg`,
    timestamp: new Date().toISOString(),
  }
  return setWorkflowState(updated)
}

/**
 * STEP 6: FPO Logistics Dispatches 300 kg.
 * Moves 300 kg out of available stock to in-transit!
 */
export function step6DispatchConsignment(vehicleNo = 'AP XX XX 1234'): WorkflowState {
  const current = getWorkflowState()
  const order = current.orders[0] || {
    id: 'ord-fallback',
    code: 'AG-1002',
    buyerName: 'PM POSHAN Central Kitchen, Anand',
    buyerType: 'INSTITUTIONAL',
    crop: 'TOMATO',
    qtyTargetKg: 300,
    pricePerKg: 35,
    totalAmount: 10500,
    advanceAmount: 3150,
    status: 'RESERVED' as const,
    reservedFromLotCode: 'LOT-TOM-0924-392',
    deliveryDate: '24 Sep 2026',
    deliveryLocation: 'PM POSHAN Central Kitchen',
    orderedAt: new Date().toISOString(),
  }

  const updatedOrder: WorkflowBuyerOrder = {
    ...order,
    status: 'DISPATCHED',
  }

  const newDispatch: WorkflowDispatch = {
    id: `dsp-${Date.now()}`,
    dispatchCode: 'DSP-1042',
    orderCode: order.code,
    crop: order.crop,
    qtyKg: order.qtyTargetKg, // 300 kg
    fromHub: 'Mahi Valley FPO Hub #1',
    destination: order.deliveryLocation,
    vehicleNo,
    driverName: 'Rameshwar Logistics',
    driverPhone: '+91 98765 43210',
    status: 'IN_TRANSIT',
    dispatchedAt: new Date().toISOString(),
  }

  const updated: WorkflowState = {
    ...current,
    stage: 6,
    orders: [updatedOrder, ...current.orders.filter((o) => o.code !== order.code)],
    dispatches: [newDispatch, ...current.dispatches.filter((d) => d.orderCode !== order.code)],
    lastAction: `Step 6: Dispatched ${order.qtyTargetKg} kg to ${order.buyerName} via ${vehicleNo}`,
    timestamp: new Date().toISOString(),
  }
  return setWorkflowState(updated)
}

/**
 * STEP 7: Delivery Confirmation & Farmer Settlement.
 * Buyer confirms delivery of 300 kg.
 * Farmer settlement ledger is finalized:
 * Formula: Accepted quantity (370 kg) × agreed price (₹30) - disclosed deductions (₹240) = ₹10,860 net payable!
 */
export function step7DeliverAndSettle(): WorkflowState {
  const current = getWorkflowState()

  // Update dispatch & order to DELIVERED
  const updatedOrders = current.orders.map((o) => ({ ...o, status: 'DELIVERED' as const }))
  const updatedDispatches = current.dispatches.map((d) => ({
    ...d,
    status: 'DELIVERED' as const,
    deliveredAt: new Date().toISOString(),
  }))

  const acceptedKg = current.lots[0]?.acceptedKg || 370
  const agreedPricePerKg = 30.0
  const grossAmount = acceptedKg * agreedPricePerKg // ₹11,100
  const weighbridgeFee = 120.0
  const transportShare = 120.0
  const totalDeductions = weighbridgeFee + transportShare // ₹240
  const netPayable = grossAmount - totalDeductions // ₹10,860!

  const settlement: WorkflowSettlement = {
    id: `set-${Date.now()}`,
    settlementCode: 'SET-TOM-0924',
    lotCode: current.lots[0]?.lotCode || 'LOT-TOM-0924-392',
    orderCode: current.orders[0]?.code || 'AG-1002',
    farmerName: 'Ravi Kumar',
    crop: 'TOMATO',
    declaredKg: current.collections[0]?.declaredKg || 400,
    weighedKg: current.collections[0]?.scaleKg || 392,
    acceptedKg, // 370 kg
    agreedPricePerKg, // ₹30/kg
    grossAmount, // ₹11,100
    weighbridgeFee, // ₹120
    transportShare, // ₹120
    totalDeductions, // ₹240
    netPayable, // ₹10,860
    status: 'DISBURSED',
    bankAccount: 'State Bank of India (A/c ...4920)',
    utrCode: 'AGR-2026-98124',
    settledAt: new Date().toISOString(),
  }

  const updated: WorkflowState = {
    ...current,
    stage: 7,
    orders: updatedOrders,
    dispatches: updatedDispatches,
    settlements: [settlement, ...current.settlements.filter((s) => s.settlementCode !== settlement.settlementCode)],
    lastAction: `Step 7: Delivery confirmed! Net settlement ₹${netPayable.toLocaleString('en-IN')} disbursed to Ravi Kumar`,
    timestamp: new Date().toISOString(),
  }
  return setWorkflowState(updated)
}

/**
 * Jump directly to any stage in the primary demo
 */
export function fastForwardToStage(stage: number): WorkflowState {
  if (stage <= 1) return resetWorkflowToDemoBaseline()
  if (stage === 2) {
    step1FarmerRequestCollection(400)
    return step2FpoScheduleCollection()
  }
  if (stage === 3) {
    step1FarmerRequestCollection(400)
    step2FpoScheduleCollection()
    return step3ReceiveAndWeigh(392)
  }
  if (stage === 4) {
    step1FarmerRequestCollection(400)
    step2FpoScheduleCollection()
    step3ReceiveAndWeigh(392)
    return step4QualityVerifyAndCreateInventory(370, 22, 'A')
  }
  if (stage === 5) {
    step1FarmerRequestCollection(400)
    step2FpoScheduleCollection()
    step3ReceiveAndWeigh(392)
    step4QualityVerifyAndCreateInventory(370, 22, 'A')
    return step5BuyerOrderAndReserve(300)
  }
  if (stage === 6) {
    step1FarmerRequestCollection(400)
    step2FpoScheduleCollection()
    step3ReceiveAndWeigh(392)
    step4QualityVerifyAndCreateInventory(370, 22, 'A')
    step5BuyerOrderAndReserve(300)
    return step6DispatchConsignment()
  }
  // Stage 7: Complete
  step1FarmerRequestCollection(400)
  step2FpoScheduleCollection()
  step3ReceiveAndWeigh(392)
  step4QualityVerifyAndCreateInventory(370, 22, 'A')
  step5BuyerOrderAndReserve(300)
  step6DispatchConsignment()
  return step7DeliverAndSettle()
}
