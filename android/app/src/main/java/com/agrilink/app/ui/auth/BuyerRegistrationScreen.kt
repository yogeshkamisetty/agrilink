package com.agrilink.app.ui.auth

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.agrilink.app.model.UserRole
import com.agrilink.app.theme.*

enum class BuyerTier(
    val title: String,
    val description: String,
    val limitLabel: String,
    val isInstant: Boolean,
    val turnaround: String,
    val icon: ImageVector
) {
    HOUSEHOLD(
        title = "Household",
        description = "Daily & weekly fresh vegetables for family kitchens",
        limitLabel = "1 – 20 kg per order",
        isInstant = true,
        turnaround = "Instant Activation (No Docs)",
        icon = Icons.Default.Home
    ),
    RETAILER(
        title = "Retailer",
        description = "Local vegetable vendors, kirana stores & mandi carts",
        limitLabel = "Up to 500 kg per order",
        isInstant = false,
        turnaround = "24 – 48 Hours Review",
        icon = Icons.Default.Store
    ),
    RESTAURANT(
        title = "Restaurant / Food Service",
        description = "Cloud kitchens, caterers, cafeterias & society messes",
        limitLabel = "100 – 2,000 kg per order",
        isInstant = false,
        turnaround = "24 – 48 Hours Review",
        icon = Icons.Default.Restaurant
    ),
    INSTITUTIONAL(
        title = "Processor / Institutional",
        description = "Flour/dal mills, processing units & hospital canteens",
        limitLabel = "500 kg+ per order",
        isInstant = false,
        turnaround = "24 – 48 Hours Review",
        icon = Icons.Default.Apartment
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BuyerRegistrationScreen(
    onRegistrationSuccess: (UserRole) -> Unit,
    onBackToLogin: () -> Unit,
    modifier: Modifier = Modifier
) {
    var currentStep by remember { mutableStateOf(1) }
    // 1: Welcome Splash
    // 2: Basic Account Details
    // 3: Mobile OTP
    // 4: Buyer Type Selection
    // 5: Address & Details
    // 6: Document Uploads
    // 7: Review & Submit
    // 8: Verification Pending
    // 9: Account Verified!

    var fullName by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var pin by remember { mutableStateOf("") }
    var otpCode by remember { mutableStateOf("") }
    var selectedTier by remember { mutableStateOf(BuyerTier.HOUSEHOLD) }

    var businessName by remember { mutableStateOf("") }
    var gstin by remember { mutableStateOf("") }
    var fssai by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var city by remember { mutableStateOf("Guntur") }
    var pinCode by remember { mutableStateOf("522002") }

    var shopDocUploaded by remember { mutableStateOf(false) }
    var fssaiDocUploaded by remember { mutableStateOf(false) }
    var isSimulatingApproval by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = when (currentStep) {
                            1 -> "Join AgriLink Buyers"
                            2 -> "Step 1: Account Details"
                            3 -> "Step 1b: Verify Mobile"
                            4 -> "Step 2: Buyer Profile"
                            5 -> "Step 3: Delivery Details"
                            6 -> "Step 3b: Documents"
                            7 -> "Step 4: Review & Submit"
                            8 -> "Verification Status"
                            9 -> "Account Verified!"
                            else -> "Buyer Registration"
                        },
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                },
                navigationIcon = {
                    if (currentStep > 1 && currentStep < 8) {
                        IconButton(onClick = { currentStep-- }) {
                            Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                        }
                    } else if (currentStep == 1) {
                        IconButton(onClick = onBackToLogin) {
                            Icon(Icons.Default.ArrowBack, contentDescription = "Back to login")
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface
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
                .padding(horizontal = 20.dp, vertical = 12.dp)
        ) {
            // STEP 1: WELCOME SCREEN
            if (currentStep == 1) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Spacer(modifier = Modifier.height(16.dp))
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier
                            .size(72.dp)
                            .background(ForestGreenPrimaryContainer, CircleShape)
                    ) {
                        Icon(
                            imageVector = Icons.Default.ShoppingBag,
                            contentDescription = null,
                            tint = ForestGreenPrimary,
                            modifier = Modifier.size(38.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "Good Food,\nBrighter Tomorrows.",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Black,
                        color = ForestGreenPrimary,
                        modifier = Modifier.padding(horizontal = 8.dp)
                    )

                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Connect directly with verified smallholder farmers and FPOs. Direct farm-gate harvest, fair transparent prices, and zero middlemen.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    // 4-Tier Quick Cards
                    BuyerTier.values().forEach { tier ->
                        Card(
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(14.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(40.dp)
                                        .background(ForestGreenPrimary.copy(alpha = 0.1f), RoundedCornerShape(10.dp)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(tier.icon, contentDescription = null, tint = ForestGreenPrimary)
                                }
                                Spacer(modifier = Modifier.width(12.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(tier.title, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium)
                                    Text(tier.limitLabel, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                SuggestionChip(
                                    onClick = { },
                                    label = {
                                        Text(
                                            if (tier.isInstant) "Instant" else "24-48h",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.SemiBold
                                        )
                                    }
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))
                    Button(
                        onClick = { currentStep = 2 },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Text("Create Buyer Account", fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.width(8.dp))
                        Icon(Icons.Default.ArrowForward, contentDescription = null)
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                    OutlinedButton(
                        onClick = onBackToLogin,
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Text("Sign In to Existing Account")
                    }
                }
            }

            // STEP 2: BASIC ACCOUNT
            else if (currentStep == 2) {
                Text(
                    text = "Personal & Contact Details",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "We will send your OTP to this mobile number.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Spacer(modifier = Modifier.height(16.dp))

                OutlinedTextField(
                    value = fullName,
                    onValueChange = { fullName = it },
                    label = { Text("Full Name *") },
                    placeholder = { Text("e.g. Priya Sundaram or Ramesh") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = phone,
                    onValueChange = { if (it.length <= 10) phone = it },
                    label = { Text("10-Digit Mobile Number *") },
                    leadingIcon = { Text("+91 ", fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 12.dp)) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Email Address *") },
                    placeholder = { Text("e.g. buyer@example.com") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = pin,
                    onValueChange = { if (it.length <= 6) pin = it },
                    label = { Text("Security PIN / Password (4-6 digits) *") },
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(24.dp))

                Button(
                    onClick = { currentStep = 3 },
                    enabled = fullName.isNotBlank() && phone.length >= 10 && email.contains("@"),
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text("Send Mobile OTP", fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.width(8.dp))
                    Icon(Icons.Default.ArrowForward, contentDescription = null)
                }
            }

            // STEP 3: OTP VERIFICATION
            else if (currentStep == 3) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Spacer(modifier = Modifier.height(16.dp))
                    Icon(
                        imageVector = Icons.Default.PhonelinkRing,
                        contentDescription = null,
                        tint = ForestGreenPrimary,
                        modifier = Modifier.size(54.dp)
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "Verify Mobile Number",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Enter the 6-digit code sent to +91 $phone",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(modifier = Modifier.height(20.dp))

                    OutlinedTextField(
                        value = otpCode,
                        onValueChange = { if (it.length <= 6) otpCode = it },
                        label = { Text("6-Digit OTP") },
                        placeholder = { Text("123456") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(8.dp))
                    AssistChip(
                        onClick = { otpCode = "123456" },
                        label = { Text("Code: 123456") },
                        leadingIcon = { Icon(Icons.Default.VpnKey, contentDescription = null, modifier = Modifier.size(14.dp)) }
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    Button(
                        onClick = { currentStep = 4 },
                        enabled = otpCode.length >= 6,
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Text("Verify & Choose Profile", fontWeight = FontWeight.Bold)
                    }
                }
            }

            // STEP 4: TIER SELECTION
            else if (currentStep == 4) {
                Text(
                    text = "Select Buyer Profile Type",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Limits and verification criteria depend on your profile.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Spacer(modifier = Modifier.height(16.dp))

                BuyerTier.values().forEach { tier ->
                    val isSelected = selectedTier == tier
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = if (isSelected) ForestGreenPrimaryContainer else MaterialTheme.colorScheme.surface
                        ),
                        border = BorderStroke(
                            width = if (isSelected) 2.dp else 1.dp,
                            color = if (isSelected) ForestGreenPrimary else MaterialTheme.colorScheme.outlineVariant
                        ),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 6.dp)
                            .clickable { selectedTier = tier }
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    tier.icon,
                                    contentDescription = null,
                                    tint = if (isSelected) ForestGreenPrimary else MaterialTheme.colorScheme.onSurface
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                                Text(
                                    tier.title,
                                    fontWeight = FontWeight.Bold,
                                    style = MaterialTheme.typography.titleMedium,
                                    color = if (isSelected) OnForestGreenPrimaryContainer else MaterialTheme.colorScheme.onSurface
                                )
                                Spacer(modifier = Modifier.weight(1f))
                                if (tier.isInstant) {
                                    Badge(containerColor = SproutGreenSuccess) {
                                        Text("Instant", color = Color.White, modifier = Modifier.padding(horizontal = 6.dp))
                                    }
                                }
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(tier.description, style = MaterialTheme.typography.bodySmall)
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Order Limit: ${tier.limitLabel}",
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold,
                                color = ForestGreenPrimary
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                Button(
                    onClick = { currentStep = 5 },
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text("Next: Delivery & Business Info", fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.width(8.dp))
                    Icon(Icons.Default.ArrowForward, contentDescription = null)
                }
            }

            // STEP 5: ADDRESS & BUSINESS DETAILS
            else if (currentStep == 5) {
                Text(
                    text = if (selectedTier == BuyerTier.HOUSEHOLD) "Household Delivery Address" else "${selectedTier.title} Business Details",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(16.dp))

                if (selectedTier != BuyerTier.HOUSEHOLD) {
                    OutlinedTextField(
                        value = businessName,
                        onValueChange = { businessName = it },
                        label = { Text("Shop / Business Name *") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedTextField(
                        value = gstin,
                        onValueChange = { gstin = it.uppercase() },
                        label = { Text("GSTIN (Optional for small retail)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedTextField(
                        value = fssai,
                        onValueChange = { fssai = it },
                        label = { Text("FSSAI License No. (If applicable)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                }

                OutlinedTextField(
                    value = address,
                    onValueChange = { address = it },
                    label = { Text("Delivery Address / Mandi Stall *") },
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(12.dp))

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = city,
                        onValueChange = { city = it },
                        label = { Text("City") },
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = pinCode,
                        onValueChange = { pinCode = it },
                        label = { Text("PIN Code") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.weight(1f)
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                Button(
                    onClick = {
                        if (selectedTier == BuyerTier.HOUSEHOLD) {
                            currentStep = 7 // Skip documents for Household
                        } else {
                            currentStep = 6 // Upload docs
                        }
                    },
                    enabled = address.isNotBlank() && (selectedTier == BuyerTier.HOUSEHOLD || businessName.isNotBlank()),
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text(
                        if (selectedTier == BuyerTier.HOUSEHOLD) "Next: Review & Confirm" else "Next: Upload Documents",
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            // STEP 6: DOCUMENT UPLOADS
            else if (currentStep == 6) {
                Text(
                    text = "Upload Business Documents",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Required to verify wholesale limits (${selectedTier.limitLabel}).",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Spacer(modifier = Modifier.height(16.dp))

                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Description, contentDescription = null, tint = ForestGreenPrimary)
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Trade / Shop License", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium)
                            Text(if (shopDocUploaded) "shop_license.pdf (Uploaded)" else "PDF, JPG up to 10MB", style = MaterialTheme.typography.bodySmall)
                        }
                        Button(
                            onClick = { shopDocUploaded = !shopDocUploaded },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (shopDocUploaded) SproutGreenSuccess else ForestGreenPrimary
                            )
                        ) {
                            Text(if (shopDocUploaded) "Uploaded ✓" else "Upload")
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Security, contentDescription = null, tint = ForestGreenPrimary)
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text("FSSAI / Address Proof", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium)
                            Text(if (fssaiDocUploaded) "fssai_cert.pdf (Uploaded)" else "Electricity Bill or FSSAI", style = MaterialTheme.typography.bodySmall)
                        }
                        Button(
                            onClick = { fssaiDocUploaded = !fssaiDocUploaded },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (fssaiDocUploaded) SproutGreenSuccess else ForestGreenPrimary
                            )
                        ) {
                            Text(if (fssaiDocUploaded) "Uploaded ✓" else "Upload")
                        }
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                Button(
                    onClick = { currentStep = 7 },
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text("Next: Review & Submit", fontWeight = FontWeight.Bold)
                }
            }

            // STEP 7: REVIEW & SUBMIT
            else if (currentStep == 7) {
                Text(
                    text = "Review Registration",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(16.dp))

                Card(
                    colors = CardDefaults.cardColors(containerColor = ForestGreenPrimaryContainer),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("Profile Tier: ${selectedTier.title}", fontWeight = FontWeight.Bold)
                        Text("Order Quota: ${selectedTier.limitLabel}", style = MaterialTheme.typography.bodyMedium)
                        Text("Verification: ${selectedTier.turnaround}", style = MaterialTheme.typography.bodySmall)
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("Name: $fullName", fontWeight = FontWeight.SemiBold)
                        Text("Phone: +91 $phone", style = MaterialTheme.typography.bodyMedium)
                        Text("Email: $email", style = MaterialTheme.typography.bodyMedium)
                        if (businessName.isNotBlank()) Text("Business: $businessName", style = MaterialTheme.typography.bodyMedium)
                        Text("Address: $address, $city - $pinCode", style = MaterialTheme.typography.bodyMedium)
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                Button(
                    onClick = {
                        if (selectedTier.isInstant) {
                            currentStep = 9 // Screen 9: Account Verified!
                        } else {
                            currentStep = 8 // Screen 8: Verification Pending
                        }
                    },
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text("Submit Registration", fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.width(8.dp))
                    Icon(Icons.Default.Check, contentDescription = null)
                }
            }

            // STEP 8: VERIFICATION PENDING
            else if (currentStep == 8) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Spacer(modifier = Modifier.height(24.dp))
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier
                            .size(72.dp)
                            .background(HarvestGoldWarning.copy(alpha = 0.2f), CircleShape)
                    ) {
                        Icon(
                            imageVector = Icons.Default.HourglassTop,
                            contentDescription = null,
                            tint = HarvestGoldWarning,
                            modifier = Modifier.size(40.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "Application Under Review",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Black
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Your ${selectedTier.title} registration and documents have been submitted to the district AgriLink FPO office. Turnaround time: 24–48 hours.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    Card(
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Text("District Audit Verification Status:", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelMedium)
                            Spacer(modifier = Modifier.height(6.dp))
                            Button(
                                onClick = { currentStep = 9 },
                                colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("Refresh Verification Status")
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(20.dp))
                    OutlinedButton(
                        onClick = { onRegistrationSuccess(UserRole.BUYER) },
                        modifier = Modifier.fillMaxWidth().height(48.dp)
                    ) {
                        Text("Browse Marketplace (Limited View)")
                    }
                }
            }

            // STEP 9: ACCOUNT VERIFIED!
            else if (currentStep == 9) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Spacer(modifier = Modifier.height(24.dp))
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier
                            .size(80.dp)
                            .background(SproutGreenSuccess.copy(alpha = 0.2f), CircleShape)
                    ) {
                        Icon(
                            imageVector = Icons.Default.VerifiedUser,
                            contentDescription = null,
                            tint = SproutGreenSuccess,
                            modifier = Modifier.size(48.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "Account Verified!",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Black,
                        color = ForestGreenPrimary
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Welcome to AgriLink, $fullName! Your direct farm-gate procurement limit has been activated.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    Card(
                        colors = CardDefaults.cardColors(containerColor = ForestGreenPrimaryContainer),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("Active Profile: ${selectedTier.title}", fontWeight = FontWeight.Bold, color = OnForestGreenPrimaryContainer)
                            Text("Purchase Quota: ${selectedTier.limitLabel}", style = MaterialTheme.typography.bodyMedium)
                            Text("Unloading Hub: $city FPO Cluster", style = MaterialTheme.typography.bodySmall)
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    Button(
                        onClick = { onRegistrationSuccess(UserRole.BUYER) },
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Text("Start Shopping Fresh Farm Harvest", fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.width(8.dp))
                        Icon(Icons.Default.ArrowForward, contentDescription = null)
                    }
                }
            }
        }
    }
}
