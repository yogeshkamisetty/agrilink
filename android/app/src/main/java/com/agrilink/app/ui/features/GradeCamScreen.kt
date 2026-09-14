package com.agrilink.app.ui.features

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.agrilink.app.model.AgmarkGrade
import com.agrilink.app.theme.*
import com.agrilink.app.ui.components.AgmarkGradeBadge
import com.agrilink.app.ui.components.PrimaryActionButton

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GradeCamScreen(
    onGradeConfirmed: (AgmarkGrade) -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    var isAnalyzing by remember { mutableStateOf(false) }
    var hasCapturedPhoto by remember { mutableStateOf(true) }
    var suggestedGrade by remember { mutableStateOf(AgmarkGrade.GRADE_A) }
    var confidenceScore by remember { mutableStateOf(0.94f) }
    var coordinatorOverride by remember { mutableStateOf(false) }
    var overrideReason by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("AI GradeCam™ Quality QC", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        Column(
            modifier = modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Camera Viewfinder Box
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(240.dp)
                    .clip(RoundedCornerShape(18.dp))
                    .background(Color(0xFF1E2822)),
                contentAlignment = Alignment.Center
            ) {
                // Viewfinder Reticle Overlay
                Box(
                    modifier = Modifier
                        .size(170.dp)
                        .border(2.dp, SproutGreenSuccess, RoundedCornerShape(12.dp))
                )

                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.CameraAlt,
                        contentDescription = null,
                        tint = Color.White.copy(alpha = 0.8f),
                        modifier = Modifier.size(44.dp)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Tomato Lot #TM-101 in Frame",
                        color = Color.White,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = "AGMARK Computer Vision Active",
                        color = Color(0xFFA6CDB6),
                        style = MaterialTheme.typography.labelSmall
                    )
                }

                // Top Badge
                Surface(
                    color = Color.Black.copy(alpha = 0.6f),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(12.dp)
                ) {
                    Text(
                        text = "60 FPS · 4K Vision",
                        color = Color.White,
                        style = MaterialTheme.typography.labelSmall,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Inspection Verdict Card
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                shape = RoundedCornerShape(18.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Row(
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column {
                            Text(
                                text = "Computer Vision Verdict",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "Classified against AGMARK 2024 Schedule III",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        AgmarkGradeBadge(grade = suggestedGrade)
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Confidence Meter
                    Row(
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "Model Confidence Score:",
                            style = MaterialTheme.typography.labelMedium
                        )
                        Text(
                            text = "${(confidenceScore * 100).toInt()}% (High Precision)",
                            fontWeight = FontWeight.Bold,
                            color = ForestGreenPrimary
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    LinearProgressIndicator(
                        progress = { confidenceScore },
                        color = ForestGreenPrimary,
                        trackColor = StoneOutlineVariant,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(8.dp)
                            .clip(RoundedCornerShape(4.dp))
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        text = "Visual Criteria Checked:",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    listOf(
                        "Uniform color ripeness (96% conforming)",
                        "Skin firmness & puncture integrity (Zero rupture)",
                        "Surface defect area: 1.2% (AGMARK A threshold ≤ 3%)",
                        "Caliber / Diameter: 52-58 mm (Grade A Class I)"
                    ).forEach { criterion ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(vertical = 3.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.CheckCircle2,
                                contentDescription = null,
                                tint = SproutGreenSuccess,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = criterion,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Coordinator Override Drawer Card
            Card(
                colors = CardDefaults.cardColors(containerColor = WarmNeutralSurfaceVariant),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(imageVector = Icons.Default.EditNote, contentDescription = null, tint = SageSecondary)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Coordinator Manual Override",
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                        Switch(
                            checked = coordinatorOverride,
                            onCheckedChange = { coordinatorOverride = it },
                            colors = SwitchDefaults.colors(checkedThumbColor = ForestGreenPrimary)
                        )
                    }

                    if (coordinatorOverride) {
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = "Any change to the AI suggested grade requires an audit reason logged with the FPO ledger.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedTextField(
                            value = overrideReason,
                            onValueChange = { overrideReason = it },
                            placeholder = { Text("Reason (e.g. slight transit moisture)") },
                            singleLine = true,
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            PrimaryActionButton(
                text = "Accept Grade & Trigger 40% Advance (₹5,600)",
                onClick = { onGradeConfirmed(suggestedGrade) },
                icon = { Icon(imageVector = Icons.Default.Check, contentDescription = null) },
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}
