/**
 * AgriLink Intelligence Layer - Modular Contracts & Shared Types
 *
 * System Directive: Do NOT falsely brand deterministic algorithms, operational research
 * solvers, rule-based heuristics, or simulated providers as "AI".
 *
 * Every service must explicitly disclose its methodology, baseline data, and limitations.
 */

export type ServiceKind =
  | 'DEMAND_FORECASTING'
  | 'PRICE_ESTIMATION'
  | 'SUPPLY_ALLOCATION'
  | 'ROUTE_OPTIMIZATION'
  | 'QUALITY_VERIFICATION'

export type AlgorithmFamily =
  | 'STATISTICAL_TIME_SERIES'       // Moving average, seasonality decomposition, damped exponential smoothing
  | 'DETERMINISTIC_RULE_ENGINE'     // Cost-plus, transparent grade/demand/logistics formula
  | 'OPERATIONAL_RESEARCH_VRP'      // Clarke-Wright savings heuristic, 2-Opt TSP
  | 'GREEDY_MULTI_CRITERIA_MATCH'   // Constrained inventory allocation solver
  | 'SIMULATED_VISION_PROTOTYPE'    // Clearly labelled mock/heuristic classifier for prototype evaluation
  | 'PRODUCTION_MACHINE_LEARNING'   // Trained model weights (MobileNet, YOLO, TFLite)

export interface ServiceDisclosure {
  serviceKind: ServiceKind
  algorithmFamily: AlgorithmFamily
  algorithmName: string
  isSimulated: boolean
  dataSource: string
  universalAccuracyClaimed: boolean
  disclaimer: string
  operationalLimitations?: string[]
}
