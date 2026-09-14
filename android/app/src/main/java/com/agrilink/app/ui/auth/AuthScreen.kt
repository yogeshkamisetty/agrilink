package com.agrilink.app.ui.auth

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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.agrilink.app.model.UserRole
import com.agrilink.app.theme.*
import com.agrilink.app.ui.components.PrimaryActionButton

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AuthScreen(
    onAuthSuccess: (UserRole) -> Unit,
    onNavigateToBuyerRegister: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    var phone by remember { mutableStateOf("") }
    var pin by remember { mutableStateOf("") }
    var isPinVisible by remember { mutableStateOf(false) }
    var isSignUp by remember { mutableStateOf(false) }
    var selectedRole by remember { mutableStateOf(UserRole.FARMER) }
    var recognizedUser by remember { mutableStateOf<String?>(null) }
    var useOtpMode by remember { mutableStateOf(false) }
    var otpSent by remember { mutableStateOf(false) }
    var otpValue by remember { mutableStateOf("") }

    // Simulating real-time lookup
    LaunchedEffect(phone) {
        if (phone == "9825000000") {
            recognizedUser = "Sardar Patel FPO (Coordinator)"
            selectedRole = UserRole.COORDINATOR
        } else if (phone == "9876543210") {
            recognizedUser = "Ramesh Kumar (Farmer - Petlad)"
            selectedRole = UserRole.FARMER
        } else if (phone == "9811002233") {
            recognizedUser = "Akshaya Patra Kitchen (Buyer)"
            selectedRole = UserRole.BUYER
        } else {
            recognizedUser = null
        }
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        Column(
            modifier = modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Brand Mark
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(64.dp)
                    .background(ForestGreenPrimary, RoundedCornerShape(18.dp))
            ) {
                Icon(
                    imageVector = Icons.Default.Agriculture,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(36.dp)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "AgriLink Direct Market",
                style = MaterialTheme.typography.headlineLarge,
                color = MaterialTheme.colorScheme.onBackground,
                fontWeight = FontWeight.Bold
            )

            Text(
                text = if (isSignUp) "Create your farm or procurement account" else "Sign in with your mobile number",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 6.dp)
            )

            Spacer(modifier = Modifier.height(28.dp))

            // Main Auth Card
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                shape = RoundedCornerShape(20.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    // Mobile Number Input
                    Text(
                        text = "10-Digit Mobile Number",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    OutlinedTextField(
                        value = phone,
                        onValueChange = { if (it.length <= 10) phone = it },
                        placeholder = { Text("e.g. 98250 12345") },
                        leadingIcon = {
                            Text(
                                text = "+91 ",
                                style = MaterialTheme.typography.bodyLarge,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(start = 12.dp)
                            )
                        },
                        trailingIcon = {
                            if (recognizedUser != null) {
                                Icon(
                                    imageVector = Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    tint = SproutGreenSuccess
                                )
                            }
                        },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    // Recognition Feedback Pill
                    if (recognizedUser != null) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Surface(
                            color = ForestGreenPrimaryContainer,
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.AccountCircle,
                                    contentDescription = null,
                                    tint = ForestGreenPrimary,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = recognizedUser!!,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = OnForestGreenPrimaryContainer,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(18.dp))

                    if (!useOtpMode) {
                        // MPIN Field
                        Text(
                            text = "Security MPIN",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurface,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        OutlinedTextField(
                            value = pin,
                            onValueChange = { if (it.length <= 6) pin = it },
                            placeholder = { Text("4 to 6 digit MPIN") },
                            visualTransformation = if (isPinVisible) VisualTransformation.None else PasswordVisualTransformation(),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                            trailingIcon = {
                                IconButton(onClick = { isPinVisible = !isPinVisible }) {
                                    Icon(
                                        imageVector = if (isPinVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                        contentDescription = "Toggle PIN visibility"
                                    )
                                }
                            },
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        )
                    } else {
                        // OTP Field
                        Text(
                            text = "One-Time Password (OTP)",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurface,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Row(modifier = Modifier.fillMaxWidth()) {
                            OutlinedTextField(
                                value = otpValue,
                                onValueChange = { if (it.length <= 6) otpValue = it },
                                placeholder = { Text("6-digit code") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.weight(1f)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Button(
                                onClick = { otpSent = true },
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = SageSecondary),
                                modifier = Modifier.height(56.dp)
                            ) {
                                Text(if (otpSent) "Resend" else "Get OTP")
                            }
                        }
                    }

                    // Role selection on Signup
                    if (isSignUp) {
                        Spacer(modifier = Modifier.height(18.dp))
                        Text(
                            text = "Select Network Role",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            UserRole.values().forEach { role ->
                                val isSelected = selectedRole == role
                                FilterChip(
                                    selected = isSelected,
                                    onClick = { selectedRole = role },
                                    label = { Text(role.displayName, fontSize = 12.sp) },
                                    shape = RoundedCornerShape(8.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    PrimaryActionButton(
                        text = if (isSignUp) "Create Account" else "Sign In",
                        onClick = { onAuthSuccess(selectedRole) },
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    // Secondary Mode Toggles
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        TextButton(onClick = { useOtpMode = !useOtpMode }) {
                            Text(
                                text = if (useOtpMode) "Use MPIN Login" else "Login with SMS OTP",
                                style = MaterialTheme.typography.labelMedium,
                                color = SageSecondary
                            )
                        }

                        TextButton(onClick = { isSignUp = !isSignUp }) {
                            Text(
                                text = if (isSignUp) "Already registered? Sign in" else "New user? Register",
                                style = MaterialTheme.typography.labelMedium,
                                color = ForestGreenPrimary,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            OutlinedButton(
                onClick = onNavigateToBuyerRegister,
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = ForestGreenPrimary),
                border = BorderStroke(1.5.dp, ForestGreenPrimary.copy(alpha = 0.5f)),
                modifier = Modifier.fillMaxWidth().height(48.dp)
            ) {
                Icon(Icons.Default.ShoppingBag, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Register as Verified Buyer (Tiered Flow)", fontWeight = FontWeight.Bold, fontSize = 13.sp)
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Sample Shortcut Pills
            Text(
                text = "Sample Personas:",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                AssistChip(
                    onClick = {
                        phone = "9876543210"
                        pin = "1234"
                        selectedRole = UserRole.FARMER
                    },
                    label = { Text("🌾 Farmer") }
                )
                AssistChip(
                    onClick = {
                        phone = "9811002233"
                        pin = "1234"
                        selectedRole = UserRole.BUYER
                    },
                    label = { Text("🏥 Buyer") }
                )
                AssistChip(
                    onClick = {
                        phone = "9825000000"
                        pin = "1234"
                        selectedRole = UserRole.COORDINATOR
                    },
                    label = { Text("🏢 FPO Admin") }
                )
            }
        }
    }
}
