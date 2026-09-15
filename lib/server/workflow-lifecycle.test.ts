import { describe, expect, it, beforeEach } from 'vitest'
import {
  INITIAL_PRIMARY_DEMO_STATE,
  step1FarmerRequestCollection,
  step2FpoScheduleCollection,
  step3ReceiveAndWeigh,
  step4QualityVerifyAndCreateInventory,
  step5BuyerOrderAndReserve,
  step6DispatchConsignment,
  step7DeliverAndSettle,
  fastForwardToStage,
  resetWorkflowToDemoBaseline,
} from '../workflow-engine'

describe('SIH Primary Flow End-to-End Workflow & Demo Progression', () => {
  beforeEach(() => {
    resetWorkflowToDemoBaseline()
  })

  it('verifies the initial baseline state with 400 kg declared harvest', () => {
    const s1 = step1FarmerRequestCollection(400, 'TOMATO')
    expect(s1.stage).toBe(1)
    expect(s1.collections).toHaveLength(1)
    expect(s1.collections[0].declaredKg).toBe(400)
    expect(s1.collections[0].status).toBe('REQUESTED')
  })

  it('progresses from 400 kg declared to 392 kg gross on weighbridge scale', () => {
    step1FarmerRequestCollection(400, 'TOMATO')
    const s2 = step2FpoScheduleCollection()
    expect(s2.stage).toBe(2)
    expect(s2.collections[0].status).toBe('SCHEDULED')
    expect(s2.collections[0].assignedVehicle).toContain('Tata Ace')

    const s3 = step3ReceiveAndWeigh(392)
    expect(s3.stage).toBe(3)
    expect(s3.collections[0].status).toBe('WEIGHED')
    expect(s3.collections[0].scaleKg).toBe(392)
    expect(s3.lots[0].scaleKg).toBe(392)
  })

  it('performs GradeCam QC resulting in 370 kg accepted and creates 370 kg verified inventory', () => {
    step1FarmerRequestCollection(400, 'TOMATO')
    step2FpoScheduleCollection()
    step3ReceiveAndWeigh(392)

    const s4 = step4QualityVerifyAndCreateInventory(370, 22, 'A')
    expect(s4.stage).toBe(4)
    expect(s4.lots[0].acceptedKg).toBe(370)
    expect(s4.lots[0].rejectedKg).toBe(22)
    expect(s4.lots[0].grade).toBe('A')

    // Verified Inventory check
    expect(s4.inventory).toHaveLength(1)
    expect(s4.inventory[0].totalVerifiedKg).toBe(370)
    expect(s4.inventory[0].availableKg).toBe(370)
    expect(s4.inventory[0].reservedKg).toBe(0)
  })

  it('matches buyer order for 300 kg, reserves 300 kg, leaving exactly 70 kg remaining verified inventory', () => {
    step1FarmerRequestCollection(400, 'TOMATO')
    step2FpoScheduleCollection()
    step3ReceiveAndWeigh(392)
    step4QualityVerifyAndCreateInventory(370, 22, 'A')

    const s5 = step5BuyerOrderAndReserve(300)
    expect(s5.stage).toBe(5)
    expect(s5.orders).toHaveLength(1)
    expect(s5.orders[0].qtyTargetKg).toBe(300)
    expect(s5.orders[0].status).toBe('RESERVED')

    // Inventory reservation check: 300 kg reserved, 70 kg remaining
    expect(s5.inventory[0].totalVerifiedKg).toBe(370)
    expect(s5.inventory[0].reservedKg).toBe(300)
    expect(s5.inventory[0].availableKg).toBe(70)
    expect(s5.inventory[0].status).toBe('PARTIALLY_RESERVED')
  })

  it('dispatches 300 kg moving stock out of available, confirms delivery and disburses ₹10,860 farmer settlement', () => {
    step1FarmerRequestCollection(400, 'TOMATO')
    step2FpoScheduleCollection()
    step3ReceiveAndWeigh(392)
    step4QualityVerifyAndCreateInventory(370, 22, 'A')
    step5BuyerOrderAndReserve(300)

    const s6 = step6DispatchConsignment('AP XX XX 1234')
    expect(s6.stage).toBe(6)
    expect(s6.orders[0].status).toBe('DISPATCHED')
    expect(s6.dispatches[0].qtyKg).toBe(300)
    expect(s6.dispatches[0].status).toBe('IN_TRANSIT')

    const s7 = step7DeliverAndSettle()
    expect(s7.stage).toBe(7)
    expect(s7.orders[0].status).toBe('DELIVERED')
    expect(s7.dispatches[0].status).toBe('DELIVERED')

    // Exact settlement calculation:
    // 370 kg accepted × ₹30.00 agreed rate = ₹11,100 gross
    // Disclosed deductions: ₹120 weighbridge + ₹120 shared transport = ₹240
    // Net payable = ₹11,100 - ₹240 = ₹10,860
    expect(s7.settlements).toHaveLength(1)
    const set = s7.settlements[0]
    expect(set.acceptedKg).toBe(370)
    expect(set.agreedPricePerKg).toBe(30)
    expect(set.grossAmount).toBe(11100)
    expect(set.totalDeductions).toBe(240)
    expect(set.netPayable).toBe(10860)
    expect(set.status).toBe('DISBURSED')
    expect(set.bankAccount).toContain('...4920')
  })

  it('validates fastForwardToStage to any step in the primary flow', () => {
    const s4 = fastForwardToStage(4)
    expect(s4.stage).toBe(4)
    expect(s4.inventory[0].totalVerifiedKg).toBe(370)

    const s7 = fastForwardToStage(7)
    expect(s7.stage).toBe(7)
    expect(s7.settlements[0].netPayable).toBe(10860)
  })
})
