import { NextRequest, NextResponse } from 'next/server'
import {
  demandForecastingService,
  priceEstimationService,
  supplyAllocationService,
  routeOptimizationService,
  qualityVerificationService,
} from '@/lib/services/intelligence'

/**
 * AgriLink Modular Intelligence Layer API Endpoint
 *
 * Exposes deterministic algorithms, operational research solvers, statistical baselines,
 * and simulated verification providers without false "AI" claims.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const service = searchParams.get('service') || 'forecast'

    switch (service) {
      case 'forecast': {
        const crop = searchParams.get('crop') || 'TOMATO'
        const location = searchParams.get('location') || 'Anand'
        const period = (searchParams.get('period') as '7d' | '14d' | '30d') || '7d'
        const result = demandForecastingService.predict({ crop, location, period })
        return NextResponse.json(result)
      }

      case 'pricing': {
        const crop = searchParams.get('crop') || 'TOMATO'
        const grade = (searchParams.get('grade') as 'A' | 'B' | 'C') || 'A'
        const location = searchParams.get('location') || 'Kheda FPO Hub'
        const distanceKm = Number(searchParams.get('distanceKm') || 25)
        const demandFactor = (searchParams.get('demandFactor') as any) || 'HIGH'
        const customMandiRef = searchParams.get('mandiRef') ? Number(searchParams.get('mandiRef')) : undefined

        const result = priceEstimationService.estimate({
          crop,
          grade,
          location,
          distanceKm,
          demandFactor,
          customMandiRef,
        })
        return NextResponse.json(result)
      }

      case 'quality': {
        const crop = searchParams.get('crop') || 'TOMATO'
        const declaredGrade = (searchParams.get('grade') as 'A' | 'B') || 'A'
        const result = await qualityVerificationService.inspectLot({ crop, declaredGrade })
        return NextResponse.json(result)
      }

      default:
        return NextResponse.json(
          { error: `Unknown intelligence service '${service}'. Supported: 'forecast', 'pricing', 'quality'.` },
          { status: 400 }
        )
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Intelligence service execution failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const service = body.service || 'allocation'

    switch (service) {
      case 'allocation': {
        const { order, inventoryLots, fleet } = body
        if (!order || !inventoryLots) {
          return NextResponse.json(
            { error: 'Order requirement and inventoryLots are mandatory for supply allocation.' },
            { status: 400 }
          )
        }
        const plan = supplyAllocationService.allocate(order, inventoryLots, fleet)
        return NextResponse.json(plan)
      }

      case 'route': {
        const { depot, stops, vehicleCapacityKg, startTime } = body
        if (!depot || !stops) {
          return NextResponse.json(
            { error: 'Depot and stops are mandatory for route optimization.' },
            { status: 400 }
          )
        }
        const plan = routeOptimizationService.optimize({
          depot,
          stops,
          vehicleCapacityKg,
          startTime,
        })
        return NextResponse.json(plan)
      }

      case 'quality': {
        const { imageBase64OrUrl, crop, declaredGrade } = body
        const result = await qualityVerificationService.inspectLot({
          imageBase64OrUrl,
          crop: crop || 'TOMATO',
          declaredGrade: declaredGrade || 'A',
        })
        return NextResponse.json(result)
      }

      case 'pricing': {
        const result = priceEstimationService.estimate(body)
        return NextResponse.json(result)
      }

      case 'forecast': {
        const result = demandForecastingService.predict(body)
        return NextResponse.json(result)
      }

      default:
        return NextResponse.json(
          { error: `Unknown intelligence service POST action '${service}'.` },
          { status: 400 }
        )
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Intelligence service processing error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
