package com.agrilink.app.ui.features

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.agrilink.app.model.CropItem
import com.agrilink.app.theme.*
import com.agrilink.app.ui.components.PrimaryActionButton

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MarketplaceScreen(
    onBack: () -> Unit,
    onOrderPlaced: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedCategory by remember { mutableStateOf("All") }
    var selectedCrop by remember { mutableStateOf<CropItem?>(SAMPLE_CATALOG.first()) }
    var orderQuantityKg by remember { mutableStateOf(500) }
    var selectedPurpose by remember { mutableStateOf("Mid-day meal kitchen weekly supply") }
    var isOrderSubmitted by remember { mutableStateOf(false) }

    val isBulk = orderQuantityKg >= 50
    val unitPrice = selectedCrop?.indicativePricePerKg ?: 26.0
    val totalAmount = orderQuantityKg * unitPrice
    val advanceAmount = totalAmount * 0.40

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Direct Farm Marketplace", fontWeight = FontWeight.Bold) },
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
            // Category Filter Pills
            item {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(listOf("All", "Vegetables", "Grains & pulses")) { cat ->
                        FilterChip(
                            selected = selectedCategory == cat,
                            onClick = { selectedCategory = cat },
                            label = { Text(cat) },
                            shape = RoundedCornerShape(8.dp)
                        )
                    }
                }
            }

            // Catalog Grid Cards
            item {
                Text(
                    text = "Live Harvest Inventory Available Now",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground
                )
            }

            items(SAMPLE_CATALOG.filter { selectedCategory == "All" || it.category == selectedCategory }) { crop ->
                val isSelected = selectedCrop?.id == crop.id
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
                        .clickable { selectedCrop = crop }
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier
                                .size(48.dp)
                                .background(SageSecondaryContainer, RoundedCornerShape(10.dp))
                        ) {
                            Text(
                                text = when (crop.name) {
                                    "Tomato" -> "🍅"
                                    "Wheat" -> "🌾"
                                    "Paddy (Rice)" -> "🍚"
                                    "Onion" -> "🧅"
                                    else -> "🥔"
                                },
                                fontSize = 24.sp
                            )
                        }
                        Spacer(modifier = Modifier.width(14.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = crop.name,
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "(${crop.localName})",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            Text(
                                text = "${crop.availableKg.toInt()} kg committed · ${crop.region}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = "₹${crop.indicativePricePerKg.toInt()}/kg",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = ForestGreenPrimary
                            )
                            Text(
                                text = "Mandi: ₹${crop.mandiPricePerKg.toInt()}",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }

            // Order Builder / Escrow Advance Checkout Card
            item {
                Spacer(modifier = Modifier.height(8.dp))
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
                            Text(
                                text = "Procure ${selectedCrop?.name ?: "Produce"}",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold
                            )
                            Surface(
                                color = if (isBulk) ForestGreenPrimaryContainer else HarvestOchreContainer,
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    text = if (isBulk) "Bulk Pool (≥50kg)" else "Small Direct (<50kg)",
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isBulk) ForestGreenPrimary else HarvestOchreTertiary,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        // Quantity Selector
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Procurement Quantity (kg):", style = MaterialTheme.typography.bodyMedium)
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                IconButton(
                                    onClick = { if (orderQuantityKg > 50) orderQuantityKg -= 50 },
                                    modifier = Modifier.size(36.dp)
                                ) {
                                    Icon(Icons.Default.RemoveCircleOutline, contentDescription = "Decrease")
                                }
                                Text(
                                    text = "$orderQuantityKg kg",
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 8.dp)
                                )
                                IconButton(
                                    onClick = { orderQuantityKg += 50 },
                                    modifier = Modifier.size(36.dp)
                                ) {
                                    Icon(Icons.Default.AddCircleOutline, contentDescription = "Increase")
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        // Purpose selector presets
                        Text(
                            text = "Institutional Purpose:",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = selectedPurpose,
                            style = MaterialTheme.typography.bodyMedium,
                            color = ForestGreenPrimary,
                            fontWeight = FontWeight.SemiBold
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        // Financial Escrow Breakdown Box
                        Surface(
                            color = HarvestOchreContainer,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Text("40% Escrow Advance Requirement", fontWeight = FontWeight.Bold, color = OnHarvestOchreContainer)
                                Spacer(modifier = Modifier.height(6.dp))
                                Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                                    Text("Order Value ($orderQuantityKg kg @ ₹${unitPrice.toInt()}):", style = MaterialTheme.typography.bodySmall)
                                    Text("₹${totalAmount.toInt()}", fontWeight = FontWeight.SemiBold)
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                                Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                                    Text("40% Advance Locked in Escrow:", style = MaterialTheme.typography.bodySmall)
                                    Text("₹${advanceAmount.toInt()}", fontWeight = FontWeight.Bold, color = SproutGreenSuccess)
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "Farmers harvest only after advance is locked in FPO escrow.",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = OnHarvestOchreContainer.copy(alpha = 0.8f)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(20.dp))

                        PrimaryActionButton(
                            text = if (isOrderSubmitted) "Order #AG-1004 Placed (Advance Locked)" else "Commit ₹${advanceAmount.toInt()} Advance & Place Order",
                            onClick = {
                                isOrderSubmitted = true
                                onOrderPlaced("AG-1004")
                            },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }
        }
    }
}

private val SAMPLE_CATALOG = listOf(
    CropItem("crop-1", "Tomato", "टमाटर", "Vegetables", 1200.0, 26.0, 22.0, "Grade A", "Petlad & Boriavi"),
    CropItem("crop-2", "Wheat", "गेहूं", "Grains & pulses", 1500.0, 28.0, 24.5, "Grade A", "Vasad & Borsad"),
    CropItem("crop-3", "Paddy (Rice)", "धान", "Grains & pulses", 1200.0, 25.0, 21.0, "Grade A", "Anand & Kheda"),
    CropItem("crop-4", "Onion", "प्याज़", "Vegetables", 800.0, 24.0, 20.0, "Grade A", "Anklav & Vaso"),
    CropItem("crop-5", "Potato", "आलू", "Vegetables", 950.0, 18.0, 15.0, "Grade B", "Bakrol & Petlad")
)
