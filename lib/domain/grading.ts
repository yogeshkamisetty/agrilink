import { z } from 'zod'
import { CROPS, type CropId } from './crops'

export type Grade = 'A' | 'B' | 'C'
export const GRADES: Grade[] = ['A', 'B', 'C']

/**
 * Commercial grades, mapped onto the AGMARK grading rules for fresh
 * vegetables. A and B are accepted for institutional supply; C fails the
 * AGMARK minimum requirements and is rejected at collection.
 */
export const GRADE_CRITERIA: Record<Grade, { label: string; agmark: string; accepted: boolean; criteria: string }> = {
  A: {
    label: 'Grade A',
    agmark: '≈ AGMARK Class I',
    accepted: true,
    criteria: 'Good quality, firm, characteristic of the variety; uniform size and colour; only slight skin defects on under 10% of pieces; no rot, cracks, bruising or pest damage.',
  },
  B: {
    label: 'Grade B',
    agmark: '≈ AGMARK Class II',
    accepted: true,
    criteria: 'Meets minimum requirements but with mixed size/colour, some shape defects, healed cracks or surface blemishes; still sound and fit for same-day cooking.',
  },
  C: {
    label: 'Grade C',
    agmark: 'Below AGMARK minimum',
    accepted: false,
    criteria: 'Fails AGMARK minimum requirements: visible rot or mould, open cracks, crushed or leaking pieces, pest damage, or over-ripe and soft across the lot.',
  },
}

/** Below this confidence the AI result is shown as advice only and the coordinator must grade manually. */
export const CONFIDENCE_THRESHOLD = 0.6

export const gradeResultSchema = z.object({
  isProduce: z.boolean().describe('false if the photo does not show the expected produce lot'),
  grade: z.enum(['A', 'B', 'C']),
  confidence: z.number().min(0).max(1),
  defects: z.array(z.string().max(120)).max(12),
  reasoning: z.string().max(600),
})

export type GradeResult = z.infer<typeof gradeResultSchema>

export type AiGrading =
  | { status: 'GRADED'; grade: Grade; confidence: number; defects: string[]; reasoning: string; model: string }
  | { status: 'LOW_CONFIDENCE'; grade: Grade | null; confidence: number | null; defects: string[]; reasoning: string; model: string | null }
  | { status: 'UNAVAILABLE'; reason: string }

export function buildGradingPrompt(crop: CropId): string {
  const norm = (crop || '').toUpperCase() as CropId
  const name = CROPS[norm]?.name || CROPS[crop]?.name || crop
  const grades = (Object.entries(GRADE_CRITERIA) as Array<[Grade, (typeof GRADE_CRITERIA)[Grade]]>)
    .map(([g, c]) => `- ${g} (${c.agmark}): ${c.criteria}`)
    .join('\n')
  return [
    `You are grading a farmer's lot of ${name} at a collection point in India, using AGMARK grading rules for fresh vegetables.`,
    'Grade the lot visible in the photo into exactly one grade:',
    grades,
    'Judge only what is visible. Internal rot cannot be seen in a photo — do not claim to detect it.',
    `If the photo does not clearly show a lot of ${name}, set isProduce to false and confidence below 0.3.`,
    'List each visible defect briefly (e.g. "2 cracked fruits near top-left", "uneven ripeness"). Keep reasoning to 2–3 sentences.',
  ].join('\n')
}

/** Classify a validated model response into the three outcomes the UI handles. */
export function interpretGradeResult(result: GradeResult, model: string): AiGrading {
  if (!result.isProduce) {
    return { status: 'LOW_CONFIDENCE', grade: null, confidence: result.confidence, defects: result.defects, reasoning: `Photo does not appear to show the expected produce. ${result.reasoning}`, model }
  }
  if (result.confidence < CONFIDENCE_THRESHOLD) {
    return { status: 'LOW_CONFIDENCE', grade: result.grade, confidence: result.confidence, defects: result.defects, reasoning: result.reasoning, model }
  }
  return { status: 'GRADED', grade: result.grade, confidence: result.confidence, defects: result.defects, reasoning: result.reasoning, model }
}
