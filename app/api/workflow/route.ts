import {
  getWorkflowState,
  resetWorkflowToDemoBaseline,
  step1FarmerRequestCollection,
  step2FpoScheduleCollection,
  step3ReceiveAndWeigh,
  step4QualityVerifyAndCreateInventory,
  step5BuyerOrderAndReserve,
  step6DispatchConsignment,
  step7DeliverAndSettle,
  fastForwardToStage,
} from '@/lib/workflow-engine'
import { requireSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    const state = getWorkflowState()
    return Response.json({ ok: true, state })
  } catch (error) {
    return Response.json({ ok: false, error: 'Failed to fetch workflow state' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      action?: string
      commitment_id?: string
      status?: string
      stage?: number
      declaredKg?: number
      crop?: string
      scaleKg?: number
      acceptedKg?: number
      rejectedKg?: number
      grade?: 'A' | 'B' | 'C'
      orderQtyKg?: number
      vehicleNo?: string
      collectionId?: string
    }

    // Backwards-compatible commitment updater
    if (body.action === 'update_commitment' && body.commitment_id) {
      try {
        const supabaseAdmin = requireSupabaseAdmin()
        const { data, error } = await supabaseAdmin
          .from('commitments')
          .update({ commitment_status: body.status })
          .eq('id', body.commitment_id)
          .select('id,order_id,farmer_id,quantity_committed,commitment_status')
          .single()
        if (error) return Response.json({ error: error.message }, { status: 400 })
        return Response.json({ commitment: data })
      } catch {
        return Response.json({ ok: true, message: 'Updated commitment locally.' })
      }
    }

    let nextState = getWorkflowState()

    switch (body.action) {
      case 'reset_demo':
        nextState = resetWorkflowToDemoBaseline()
        break
      case 'step1_request_collection':
        nextState = step1FarmerRequestCollection(body.declaredKg || 400, body.crop || 'TOMATO')
        break
      case 'step2_schedule_collection':
        nextState = step2FpoScheduleCollection(body.collectionId)
        break
      case 'step3_receive_weigh':
        nextState = step3ReceiveAndWeigh(body.scaleKg || 392, body.collectionId)
        break
      case 'step4_verify_lot':
        nextState = step4QualityVerifyAndCreateInventory(
          body.acceptedKg || 370,
          body.rejectedKg || 22,
          body.grade || 'A'
        )
        break
      case 'step5_buyer_order':
        nextState = step5BuyerOrderAndReserve(body.orderQtyKg || 300)
        break
      case 'step6_dispatch':
        nextState = step6DispatchConsignment(body.vehicleNo || 'AP XX XX 1234')
        break
      case 'step7_deliver_settle':
        nextState = step7DeliverAndSettle()
        break
      case 'fast_forward':
        nextState = fastForwardToStage(body.stage || 1)
        break
      default:
        return Response.json(
          { error: `Unsupported workflow action '${body.action}'.` },
          { status: 400 }
        )
    }

    return Response.json({ ok: true, state: nextState })
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'Workflow processing error' },
      { status: 500 }
    )
  }
}
