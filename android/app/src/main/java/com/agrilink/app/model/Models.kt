package com.agrilink.app.model

enum class UserRole(val displayName: String) {
    FARMER("Farmer"),
    BUYER("Institutional Buyer"),
    COORDINATOR("FPO Coordinator")
}

enum class OrderStage(val label: String) {
    POSTED("Order Placed"),
    FUNDED("Advance in Escrow"),
    SOURCING("Collecting Commitments"),
    COLLECTING("Pickup & Quality Check"),
    DISPATCHED("Truck En Route"),
    SETTLED("Fully Paid to Bank"),
    REJECTED("Rejected")
}

enum class AgmarkGrade(val label: String) {
    GRADE_A("Grade A (Export/Premium)"),
    GRADE_B("Grade B (Standard Market)"),
    GRADE_C("Grade C (Commercial Secondary)")
}

data class CropItem(
    val id: String,
    val name: String,
    val localName: String,
    val category: String, // Vegetables, Grains & pulses
    val availableKg: Double,
    val indicativePricePerKg: Double,
    val mandiPricePerKg: Double,
    val grade: String,
    val region: String
)

data class LiveOrder(
    val id: String,
    val code: String,
    val buyerName: String,
    val cropName: String,
    val quantityKg: Double,
    val pricePerKg: Double,
    val deliveryDate: String,
    val deliveryLocation: String,
    val purpose: String,
    val stage: OrderStage,
    val isBulk: Boolean,
    val advanceAmount: Double,
    val allocatedFarmerName: String? = null
)

data class LotSlip(
    val id: String,
    val code: String,
    val farmerName: String,
    val village: String,
    val cropName: String,
    val weighedKg: Double,
    val acceptedKg: Double,
    val aiGrade: AgmarkGrade,
    val aiConfidence: Float, // 0.0 to 1.0
    val aiDefects: List<String>,
    val overrideByCoordinator: Boolean,
    val overrideReason: String? = null,
    val grossAmount: Double,
    val advancePaid: Double,
    val balancePayable: Double,
    val isSettled: Boolean
)

data class RouteStop(
    val sequence: Int,
    val farmerName: String,
    val village: String,
    val pickupKg: Double,
    val distanceKm: Double,
    val isCompleted: Boolean = false
)

data class VrpRoutePlan(
    val id: String,
    val vehicleType: String,
    val vehiclePlate: String,
    val totalDistanceKm: Double,
    val totalLoadKg: Double,
    val capacityKg: Double,
    val estimatedCost: Double,
    val co2AvoidedKg: Double,
    val stops: List<RouteStop>
)

enum class PlanTier(val title: String, val priceInr: Int) {
    COMMUNITY("Free Community", 0),
    PRO("FPO Growth Pro", 2499),
    ENTERPRISE("Enterprise Institutional", 9999)
}

data class SaaSSubscription(
    val currentTier: PlanTier,
    val farmersRegistered: Int,
    val maxFarmersAllowed: Int,
    val monthlyScansUsed: Int,
    val maxMonthlyScans: Int,
    val billingCycleEnd: String
)

data class UserProfile(
    val id: String,
    val fullName: String,
    val phone: String,
    val role: UserRole,
    val villageOrOrg: String,
    val isAadhaarVerified: Boolean,
    val aadhaarLast4: String? = null,
    val preferredLanguage: String = "English"
)
