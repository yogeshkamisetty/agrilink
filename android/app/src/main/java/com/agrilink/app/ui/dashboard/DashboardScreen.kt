package com.agrilink.app.ui.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.agrilink.app.model.*
import com.agrilink.app.theme.*
import com.agrilink.app.ui.components.*

@Composable
fun DashboardScreen(
    userRole: UserRole,
    widthSizeClass: WindowWidthSizeClass,
    onNavigateToGradeCam: () -> Unit,
    onNavigateToLogistics: () -> Unit,
    onNavigateToMarketplace: () -> Unit,
    onTriggerVoiceAssistant: () -> Unit,
    modifier: Modifier = Modifier
) {
    when (widthSizeClass) {
        WindowWidthSizeClass.Compact -> {
            PhoneDashboardContent(
                userRole = userRole,
                onNavigateToGradeCam = onNavigateToGradeCam,
                onNavigateToLogistics = onNavigateToLogistics,
                onNavigateToMarketplace = onNavigateToMarketplace,
                onTriggerVoiceAssistant = onTriggerVoiceAssistant,
                modifier = modifier
            )
        }
        WindowWidthSizeClass.Medium -> {
            TabletDashboardContent(
                userRole = userRole,
                onNavigateToGradeCam = onNavigateToGradeCam,
                onNavigateToLogistics = onNavigateToLogistics,
                onNavigateToMarketplace = onNavigateToMarketplace,
                onTriggerVoiceAssistant = onTriggerVoiceAssistant,
                modifier = modifier
            )
        }
        else -> {
            DesktopDashboardContent(
                userRole = userRole,
                onNavigateToGradeCam = onNavigateToGradeCam,
                onNavigateToLogistics = onNavigateToLogistics,
                onNavigateToMarketplace = onNavigateToMarketplace,
                onTriggerVoiceAssistant = onTriggerVoiceAssistant,
                modifier = modifier
            )
        }
    }
}

// -------------------------------------------------------------------------
// COMPACT (PHONE) DASHBOARD: Single-Column, Thumb-Reachable
// -------------------------------------------------------------------------
@Composable
private fun PhoneDashboardContent(
    userRole: UserRole,
    onNavigateToGradeCam: () -> Unit,
    onNavigateToLogistics: () -> Unit,
    onNavigateToMarketplace: () -> Unit,
    onTriggerVoiceAssistant: () -> Unit,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = 16.dp),
        contentPadding = PaddingValues(top = 16.dp, bottom = 80.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Welcome Header & Voice Pill
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Hello, Ramesh Bhai 👋",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground
                    )
                    Text(
                        text = "${userRole.displayName} · Petlad Cluster",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                VoiceAgentPillButton(onTriggerVoice = onTriggerVoiceAssistant)
            }
        }

        // Live Mandi Corridor Banner
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = ForestGreenPrimaryContainer),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.TrendingUp,
                        contentDescription = null,
                        tint = ForestGreenPrimary,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "AGMARKNET Modal Rate: Tomato ₹24.50/kg",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = OnForestGreenPrimaryContainer
                        )
                        Text(
                            text = "AgriLink floor price protected at ≥ Mandi + 18%",
                            style = MaterialTheme.typography.bodySmall,
                            color = OnForestGreenPrimaryContainer.copy(alpha = 0.8f)
                        )
                    }
                }
            }
        }

        // High-Level Financial / Operational Metrics
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                MetricSummaryCard(
                    title = if (userRole == UserRole.FARMER) "Escrow Balance" else "Committed Volume",
                    value = if (userRole == UserRole.FARMER) "₹18,420" else "4,200 kg",
                    caption = if (userRole == UserRole.FARMER) "40% harvest advance credited" else "84% fulfilled",
                    trendLabel = "+18.2%",
                    modifier = Modifier.weight(1f)
                )
                MetricSummaryCard(
                    title = "Transit Spoilage",
                    value = "3.2%",
                    caption = "Mandi avg: 24%",
                    trendLabel = "-84% Loss",
                    trendPositive = true,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        // Quick Primary Actions
        item {
            Text(
                text = "Field Operations",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )
        }

        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(
                    onClick = onNavigateToGradeCam,
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                    modifier = Modifier
                        .weight(1f)
                        .height(52.dp)
                ) {
                    Icon(imageVector = Icons.Default.CameraAlt, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("AI GradeCam™", fontWeight = FontWeight.SemiBold)
                }

                OutlinedButton(
                    onClick = onNavigateToMarketplace,
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier
                        .weight(1f)
                        .height(52.dp)
                ) {
                    Icon(imageVector = Icons.Default.Storefront, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Marketplace", fontWeight = FontWeight.SemiBold)
                }
            }
        }

        // Active Lot Slips / Commitments List
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Active Commitments & Lots",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground
                )
                TextButton(onClick = onNavigateToLogistics) {
                    Text("View Routes (${VRP_STOPS_COUNT})", color = ForestGreenPrimary, fontWeight = FontWeight.SemiBold)
                }
            }
        }

        items(SAMPLE_LOTS) { lot ->
            LotSlipCard(lot = lot, onInspect = onNavigateToGradeCam)
        }
    }
}

// -------------------------------------------------------------------------
// MEDIUM (TABLET) DASHBOARD: Two-Pane Master-Detail
// -------------------------------------------------------------------------
@Composable
private fun TabletDashboardContent(
    userRole: UserRole,
    onNavigateToGradeCam: () -> Unit,
    onNavigateToLogistics: () -> Unit,
    onNavigateToMarketplace: () -> Unit,
    onTriggerVoiceAssistant: () -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedLot by remember { mutableStateOf(SAMPLE_LOTS.first()) }

    Row(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(20.dp),
        horizontalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Left Column (50%): Metrics & Master Lots List
        LazyColumn(
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight(),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Operational Overview",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold
                    )
                    VoiceAgentPillButton(onTriggerVoice = onTriggerVoiceAssistant)
                }
            }

            item {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    MetricSummaryCard(
                        title = "Escrow Payouts",
                        value = "₹18,420",
                        caption = "40% advance disbursed",
                        trendLabel = "Active",
                        modifier = Modifier.weight(1f)
                    )
                    MetricSummaryCard(
                        title = "Committed Produce",
                        value = "1,500 kg",
                        caption = "Quality verified",
                        trendLabel = "+12% MoM",
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            item {
                Text(
                    text = "Live Produce Lots",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }

            items(SAMPLE_LOTS) { lot ->
                val isSelected = lot.id == selectedLot.id
                LotSlipCard(
                    lot = lot,
                    isSelected = isSelected,
                    onInspect = { selectedLot = lot }
                )
            }
        }

        // Right Column (50%): Detail Pane & Inspection Actions
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            shape = RoundedCornerShape(18.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight()
                .padding(bottom = 16.dp)
        ) {
            LotDetailPane(
                lot = selectedLot,
                onLaunchGradeCam = onNavigateToGradeCam,
                onViewLogistics = onNavigateToLogistics
            )
        }
    }
}

// -------------------------------------------------------------------------
// EXPANDED (DESKTOP) DASHBOARD: 3-Column Operational Command Center
// -------------------------------------------------------------------------
@Composable
private fun DesktopDashboardContent(
    userRole: UserRole,
    onNavigateToGradeCam: () -> Unit,
    onNavigateToLogistics: () -> Unit,
    onNavigateToMarketplace: () -> Unit,
    onTriggerVoiceAssistant: () -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedLot by remember { mutableStateOf(SAMPLE_LOTS.first()) }

    Row(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(24.dp),
        horizontalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        // Column 1: Analytics & Master Feeds (35%)
        LazyColumn(
            modifier = Modifier
                .weight(0.35f)
                .fillMaxHeight(),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            item {
                Text(
                    text = "FPO Command Console",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Anand District Agri-Link Node #04",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            item {
                MetricSummaryCard(
                    title = "Direct Realization Uplift",
                    value = "+18.2%",
                    caption = "vs. Mandi middleman cut",
                    trendLabel = "Target Met",
                    modifier = Modifier.fillMaxWidth()
                )
            }

            item {
                MetricSummaryCard(
                    title = "CO₂e Avoided via Spoilage",
                    value = "840 kg",
                    caption = "Cold-chain 2-opt routing",
                    trendLabel = "Eco-Certified",
                    modifier = Modifier.fillMaxWidth()
                )
            }

            item {
                Text(
                    text = "Incoming Harvest Lots",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(top = 10.dp)
                )
            }

            items(SAMPLE_LOTS) { lot ->
                LotSlipCard(
                    lot = lot,
                    isSelected = lot.id == selectedLot.id,
                    onInspect = { selectedLot = lot }
                )
            }
        }

        // Column 2: Selected Lot Detail & AI Inspection (35%)
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            shape = RoundedCornerShape(18.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
            modifier = Modifier
                .weight(0.35f)
                .fillMaxHeight()
        ) {
            LotDetailPane(
                lot = selectedLot,
                onLaunchGradeCam = onNavigateToGradeCam,
                onViewLogistics = onNavigateToLogistics
            )
        }

        // Column 3: Logistics & Route Telemetry (30%)
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            shape = RoundedCornerShape(18.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
            modifier = Modifier
                .weight(0.30f)
                .fillMaxHeight()
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text(
                    text = "Fleet & Routing Status",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Tata Ace (GJ-07-TY-4912) En Route",
                    style = MaterialTheme.typography.bodyMedium,
                    color = ForestGreenPrimary,
                    fontWeight = FontWeight.SemiBold
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Route summary box
                Surface(
                    color = LinenBackground,
                    shape = RoundedCornerShape(12.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, StoneOutline),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            horizontalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Total Distance:", style = MaterialTheme.typography.bodyMedium)
                            Text("28.4 km", fontWeight = FontWeight.Bold)
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        Row(
                            horizontalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Consolidated Load:", style = MaterialTheme.typography.bodyMedium)
                            Text("1,200 kg / 1,500 kg", fontWeight = FontWeight.Bold)
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        Row(
                            horizontalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Savings vs Solitary:", style = MaterialTheme.typography.bodyMedium)
                            Text("₹840 (37%)", fontWeight = FontWeight.Bold, color = SproutGreenSuccess)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                PrimaryActionButton(
                    text = "Open Logistics Map",
                    onClick = onNavigateToLogistics,
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedButton(
                    onClick = onNavigateToMarketplace,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth().height(48.dp)
                ) {
                    Text("Direct Marketplace Catalog", fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

// -------------------------------------------------------------------------
// REUSABLE LOT CARD & DETAIL COMPONENTS
// -------------------------------------------------------------------------
@Composable
fun LotSlipCard(
    lot: LotSlip,
    isSelected: Boolean = false,
    onInspect: () -> Unit
) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) ForestGreenPrimaryContainer else MaterialTheme.colorScheme.surface
        ),
        shape = RoundedCornerShape(14.dp),
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (isSelected) ForestGreenPrimary else MaterialTheme.colorScheme.outlineVariant
        ),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onInspect() }
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = "${lot.cropName} · ${lot.acceptedKg.toInt()} kg",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                AgmarkGradeBadge(grade = lot.aiGrade)
            }

            Spacer(modifier = Modifier.height(6.dp))

            Row(
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = "Farmer: ${lot.farmerName} (${lot.village})",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = "₹${lot.advancePaid.toInt()} Advance Paid",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                    color = HarvestOchreTertiary
                )
            }
        }
    }
}

@Composable
fun LotDetailPane(
    lot: LotSlip,
    onLaunchGradeCam: () -> Unit,
    onViewLogistics: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(20.dp)
    ) {
        Row(
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column {
                Text(
                    text = lot.code,
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "${lot.cropName} Harvest Lot",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            AgmarkGradeBadge(grade = lot.aiGrade)
        }

        Spacer(modifier = Modifier.height(18.dp))

        // AI Vision Confidence Meter
        Surface(
            color = LinenBackground,
            shape = RoundedCornerShape(12.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, StoneOutline),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Row(
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("AI GradeCam™ Confidence:", style = MaterialTheme.typography.labelMedium)
                    Text("${(lot.aiConfidence * 100).toInt()}% Confidence", fontWeight = FontWeight.Bold, color = ForestGreenPrimary)
                }
                Spacer(modifier = Modifier.height(8.dp))
                LinearProgressIndicator(
                    progress = { lot.aiConfidence },
                    color = ForestGreenPrimary,
                    trackColor = StoneOutlineVariant,
                    modifier = Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp))
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Defects identified: ${lot.aiDefects.joinToString(", ")}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Financial Breakdown Card
        Surface(
            color = HarvestOchreContainer,
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Text("Escrow Financial Settlement", fontWeight = FontWeight.Bold, color = OnHarvestOchreContainer)
                Spacer(modifier = Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                    Text("Gross Realization:", style = MaterialTheme.typography.bodyMedium)
                    Text("₹${lot.grossAmount.toInt()}", fontWeight = FontWeight.Bold)
                }
                Spacer(modifier = Modifier.height(4.dp))
                Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                    Text("40% Instant Advance:", style = MaterialTheme.typography.bodyMedium)
                    Text("₹${lot.advancePaid.toInt()} (Paid)", color = SproutGreenSuccess, fontWeight = FontWeight.Bold)
                }
                Spacer(modifier = Modifier.height(4.dp))
                Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                    Text("Balance (Post-Inspection):", style = MaterialTheme.typography.bodyMedium)
                    Text("₹${lot.balancePayable.toInt()}", fontWeight = FontWeight.Bold)
                }
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
            OutlinedButton(
                onClick = onViewLogistics,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.weight(1f).height(48.dp)
            ) {
                Text("View Stop")
            }
            PrimaryActionButton(
                text = "Launch GradeCam™",
                onClick = onLaunchGradeCam,
                modifier = Modifier.weight(1f)
            )
        }
    }
}

private const val VRP_STOPS_COUNT = 3

private val SAMPLE_LOTS = listOf(
    LotSlip(
        id = "lot-1",
        code = "LOT-TM-101",
        farmerName = "Ramesh Bhai Patel",
        village = "Petlad",
        cropName = "Tomato",
        weighedKg = 520.0,
        acceptedKg = 500.0,
        aiGrade = AgmarkGrade.GRADE_A,
        aiConfidence = 0.94f,
        aiDefects = listOf("Minor surface discoloration < 2%"),
        overrideByCoordinator = false,
        grossAmount = 14000.0,
        advancePaid = 5600.0,
        balancePayable = 8400.0,
        isSettled = false
    ),
    LotSlip(
        id = "lot-2",
        code = "LOT-WH-102",
        farmerName = "Suresh Bhai Solanki",
        village = "Boriavi",
        cropName = "Wheat",
        weighedKg = 610.0,
        acceptedKg = 600.0,
        aiGrade = AgmarkGrade.GRADE_A,
        aiConfidence = 0.91f,
        aiDefects = listOf("Moisture standard: 11.2%"),
        overrideByCoordinator = false,
        grossAmount = 16800.0,
        advancePaid = 6720.0,
        balancePayable = 10080.0,
        isSettled = false
    ),
    LotSlip(
        id = "lot-3",
        code = "LOT-ON-103",
        farmerName = "Pravin Bhai Parmar",
        village = "Vaso",
        cropName = "Onion",
        weighedKg = 415.0,
        acceptedKg = 400.0,
        aiGrade = AgmarkGrade.GRADE_B,
        aiConfidence = 0.86f,
        aiDefects = listOf("Minor skin peeling"),
        overrideByCoordinator = true,
        overrideReason = "Approved under Grade B local standard",
        grossAmount = 9600.0,
        advancePaid = 3840.0,
        balancePayable = 5760.0,
        isSettled = false
    )
)
