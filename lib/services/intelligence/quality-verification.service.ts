import { ServiceDisclosure } from './types'

export interface QualityInspectionInput {
  imageBase64OrUrl?: string
  crop: string
  declaredGrade?: 'A' | 'B'
  ambientTempC?: number
}

export interface DefectItem {
  defect: string
  severityScore: number // 0 - 100
  thresholdAllowed: number
  status: 'PASS' | 'WARN' | 'FAIL'
}

export interface QualityInspectionResult {
  providerName: string
  modelType: 'SIMULATED_MOCK_CLASSIFIER'
  isSimulated: boolean
  crop: string
  predictedGrade: 'A' | 'B' | 'C'
  confidenceScorePct: number
  defectBreakdown: DefectItem[]
  ripenessPercentage: number
  firmnessIndex: 'FIRM_OPTIMAL' | 'SLIGHT_SOFTENING' | 'EXCESSIVE_SOFTNESS'
  brixEstimatedSugar: number
  recommendedAction: 'ACCEPT_GRADE_A' | 'ACCEPT_GRADE_B' | 'REJECT_UNFIT'
  universalAccuracyClaimed: false
  accuracyNotice: string
  disclosure: ServiceDisclosure
  disclaimer: string
}

/**
 * Pluggable Quality Verification Provider Interface
 * Allows seamless replacement by production edge-TFLite / cloud computer vision service later.
 */
export interface QualityVisionProvider {
  providerName: string
  isSimulated: boolean
  analyze(input: QualityInspectionInput): Promise<QualityInspectionResult>
}

/**
 * Clearly labelled Simulated / Mock Provider for SIH Prototype.
 * Explicitly avoids universal accuracy claims and provides transparent test bounds.
 */
export class SimulatedAgmarkVisionProvider implements QualityVisionProvider {
  providerName = 'AgriLink Vision (Simulated MobileNet-v3 Agmark Prototype)'
  isSimulated = true

  async analyze(input: QualityInspectionInput): Promise<QualityInspectionResult> {
    const crop = (input.crop || 'TOMATO').toUpperCase()
    const declaredGrade = input.declaredGrade || 'A'

    // Deterministic simulation producing realistic AGMARK Class-I & Class-II metrics
    // Slight variance based on image length or crop
    const isHighGrade = declaredGrade === 'A'

    const defects: DefectItem[] = [
      {
        defect: 'Skin Blemishes & Scabs',
        severityScore: isHighGrade ? 3.1 : 7.8,
        thresholdAllowed: 10.0,
        status: isHighGrade ? 'PASS' : 'WARN',
      },
      {
        defect: 'Geometric Shape Uniformity',
        severityScore: isHighGrade ? 2.4 : 6.2,
        thresholdAllowed: 8.0,
        status: 'PASS',
      },
      {
        defect: 'Rot / Fungal Lesions',
        severityScore: 0.0,
        thresholdAllowed: 1.0,
        status: 'PASS',
      },
      {
        defect: 'Color Maturity Variance',
        severityScore: isHighGrade ? 4.2 : 8.5,
        thresholdAllowed: 12.0,
        status: isHighGrade ? 'PASS' : 'WARN',
      },
    ]

    const predictedGrade = isHighGrade ? 'A' : 'B'
    const confidenceScore = isHighGrade ? 94 : 88

    return {
      providerName: this.providerName,
      modelType: 'SIMULATED_MOCK_CLASSIFIER',
      isSimulated: true,
      crop,
      predictedGrade,
      confidenceScorePct: confidenceScore,
      defectBreakdown: defects,
      ripenessPercentage: isHighGrade ? 89 : 82,
      firmnessIndex: isHighGrade ? 'FIRM_OPTIMAL' : 'SLIGHT_SOFTENING',
      brixEstimatedSugar: crop === 'TOMATO' ? 5.2 : 4.8,
      recommendedAction: isHighGrade ? 'ACCEPT_GRADE_A' : 'ACCEPT_GRADE_B',
      universalAccuracyClaimed: false,
      accuracyNotice:
        'Mock/Simulated Classification Provider. Not a universal ground-truth classifier. Calibrated for Solanaceae (Tomato) under 5500K daylight balance; manual coordinator review mandatory for any lot rejection.',
      disclosure: {
        serviceKind: 'QUALITY_VERIFICATION',
        algorithmFamily: 'SIMULATED_VISION_PROTOTYPE',
        algorithmName: 'Simulated MobileNet-v3 AGMARK Defect Classifier',
        isSimulated: true,
        dataSource: 'Synthetic Benchmark dataset modeled on AGMARK Fruit & Vegetable Grading Standards',
        universalAccuracyClaimed: false,
        disclaimer:
          'Simulated classification provider for SIH prototype. Replaceable by real TensorFlow Lite / ONNX edge runtime in production.',
        operationalLimitations: [
          'Synthetic benchmark values calibrated for prototype demonstration.',
          'Requires calibrated top-down lighting and clean crate backdrop in physical deployment.',
          'Coordinator physical verification is required for statutory acceptance.',
        ],
      },
      disclaimer: 'Simulated quality inspection prototype. Universal accuracy is not claimed.',
    }
  }
}

export class QualityVerificationService {
  private provider: QualityVisionProvider

  constructor(provider?: QualityVisionProvider) {
    this.provider = provider || new SimulatedAgmarkVisionProvider()
  }

  setProvider(provider: QualityVisionProvider) {
    this.provider = provider
  }

  getProvider(): QualityVisionProvider {
    return this.provider
  }

  async inspectLot(input: QualityInspectionInput): Promise<QualityInspectionResult> {
    return this.provider.analyze(input)
  }
}

export const qualityVerificationService = new QualityVerificationService()
