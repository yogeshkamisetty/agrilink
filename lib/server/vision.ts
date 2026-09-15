import { generateText, Output } from 'ai'
import type { CropId } from '@/lib/domain/crops'
import { buildGradingPrompt, gradeResultSchema, interpretGradeResult, type AiGrading } from '@/lib/domain/grading'

import { qualityVerificationService } from '@/lib/services/intelligence'

const VISION_TIMEOUT_MS = 30_000

export function visionModel(): string {
  return process.env.AGRILINK_VISION_MODEL || process.env.AGRILINK_AI_MODEL || 'openai/gpt-5.4-mini'
}

export function visionConfigured(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN)
}

/**
 * Grade a lot photo with a vision-language model prompted with AGMARK criteria.
 * When real model credentials are absent, falls back to the clearly labelled simulated
 * MobileNet-v3 AGMARK classifier without universal accuracy claims.
 */
export async function gradePhoto(crop: CropId, imageBase64: string, mediaType: string): Promise<AiGrading> {
  if (!visionConfigured()) {
    const sim = await qualityVerificationService.inspectLot({ crop })
    return {
      status: 'GRADED',
      grade: sim.predictedGrade,
      confidence: sim.confidenceScorePct / 100,
      defects: sim.defectBreakdown.map((d) => `${d.defect}: ${d.severityScore}%`),
      reasoning: `${sim.providerName}: Simulated AGMARK grading for prototype. ${sim.accuracyNotice}`,
      model: sim.providerName,
    }
  }
  const model = visionModel()
  try {
    const result = await generateText({
      model,
      output: Output.object({ schema: gradeResultSchema, name: 'lot_grade' }),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: buildGradingPrompt(crop) },
            { type: 'image', image: imageBase64, mediaType },
          ],
        },
      ],
      maxOutputTokens: 600,
      abortSignal: AbortSignal.timeout(VISION_TIMEOUT_MS),
    })
    const parsed = gradeResultSchema.safeParse(result.output)
    if (!parsed.success) return { status: 'UNAVAILABLE', reason: 'Vision model returned an unreadable grade.' }
    return interpretGradeResult(parsed.data, model)
  } catch (error) {
    const message = (error as Error).name === 'TimeoutError' || (error as Error).name === 'AbortError' ? 'Vision model timed out.' : 'Vision model request failed.'
    console.error('[agrilink] vision grading failed:', (error as Error).message)
    return { status: 'UNAVAILABLE', reason: message }
  }
}
