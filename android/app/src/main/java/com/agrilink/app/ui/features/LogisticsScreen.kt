package com.agrilink.app.ui.features

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.agrilink.app.model.RouteStop
import com.agrilink.app.theme.*
import com.agrilink.app.ui.components.PrimaryActionButton

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LogisticsScreen(
    onBack: () -> Unit,
    onDispatchRoute: () -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedVehicle by remember { mutableStateOf("Tata Ace (1.5t)") }
    var isDispatched by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Smart 2-Opt Logistics & Fleet", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        LazyColumn(
            modifier = modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            contentPadding = PaddingValues(top = 16.dp, bottom = 80.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Fleet vehicle selector
            item {
                Text(
                    text = "Consolidated Run Vehicle Sizing",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    listOf("Tata Ace (1.5t)", "Eicher 407 (3.5t)", "Mahindra Bolero (1.2t)").forEach { v ->
                        val isSelected = selectedVehicle == v
                        FilterChip(
                            selected = isSelected,
                            onClick = { selectedVehicle = v },
                            label = { Text(v) },
                            shape = RoundedCornerShape(8.dp)
                        )
                    }
                }
            }

            // Route Metrics Overview Card
            item {
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
                                    text = "Anand District Collection Run #08",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = "Tata Ace (GJ-07-TY-4912) · 3 Farms Consolidated",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            Surface(
                                color = ForestGreenPrimaryContainer,
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    text = "Optimal 2-Opt",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = ForestGreenPrimary,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Total Runway", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text("28.4 km", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                            }
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Produce Carried", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text("1,500 kg", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                            }
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Logistics Cost", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text("₹1.18 / kg", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = ForestGreenPrimary)
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        // Efficiency comparison banner
                        Surface(
                            color = Color(0xFFE6EFE8),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(10.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Default.Eco, contentDescription = null, tint = ForestGreenPrimary, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "Saved 37% fuel & 14.2 kg CO₂e vs. sending separate vehicles",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = OnForestGreenPrimaryContainer,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }
                }
            }

            // Sequenced Stop Waypoints
            item {
                Text(
                    text = "Waypoint Execution Sequence (Pickups Before Drop)",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground
                )
            }

            items(SAMPLE_STOPS) { stop ->
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    shape = RoundedCornerShape(14.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier
                                .size(36.dp)
                                .background(
                                    if (stop.sequence == 4) ForestGreenPrimary else SageSecondaryContainer,
                                    CircleShape
                                )
                        ) {
                            Text(
                                text = if (stop.sequence == 4) "D" else "${stop.sequence}",
                                color = if (stop.sequence == 4) Color.White else OnSageSecondaryContainer,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Spacer(modifier = Modifier.width(14.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = if (stop.sequence == 4) "Delivery: ${stop.farmerName}" else "Pickup: ${stop.farmerName}",
                                style = MaterialTheme.typography.bodyLarge,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "${stop.village} · ${stop.pickupKg.toInt()} kg ${if (stop.sequence == 4) "unload" else "produce"}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Text(
                            text = "+${stop.distanceKm} km",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = SageSecondary
                        )
                    }
                }
            }

            // Dispatch Action
            item {
                Spacer(modifier = Modifier.height(10.dp))
                PrimaryActionButton(
                    text = if (isDispatched) "Route Dispatched to Driver (GJ-07-TY-4912)" else "Confirm & Dispatch Collection Run",
                    onClick = {
                        isDispatched = true
                        onDispatchRoute()
                    },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
    }
}

private val SAMPLE_STOPS = listOf(
    RouteStop(1, "Ramesh Bhai Patel", "Petlad Farm Node", 500.0, 6.2),
    RouteStop(2, "Suresh Bhai Solanki", "Boriavi Collection Shed", 600.0, 8.4),
    RouteStop(3, "Pravin Bhai Parmar", "Vaso Aggregation Center", 400.0, 5.8),
    RouteStop(4, "Akshaya Patra Kitchen", "Anand Central Processing Depot", 1500.0, 8.0)
)
