package com.agrilink.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.agrilink.app.model.UserRole
import com.agrilink.app.theme.*
import com.agrilink.app.ui.auth.AuthScreen
import com.agrilink.app.ui.auth.BuyerRegistrationScreen
import com.agrilink.app.ui.auth.OnboardingScreen
import com.agrilink.app.ui.dashboard.DashboardScreen
import com.agrilink.app.ui.features.GradeCamScreen
import com.agrilink.app.ui.features.LogisticsScreen
import com.agrilink.app.ui.features.MarketplaceScreen
import com.agrilink.app.ui.settings.SettingsScreen

enum class ScreenNav(val label: String, val icon: ImageVector) {
    DASHBOARD("Dashboard", Icons.Default.Dashboard),
    MARKETPLACE("Marketplace", Icons.Default.Storefront),
    GRADECAM("GradeCam™", Icons.Default.CameraAlt),
    LOGISTICS("Logistics", Icons.Default.LocalShipping),
    SETTINGS("Account", Icons.Default.AccountCircle)
}

@Composable
fun AgriLinkApp(
    widthSizeClass: WindowWidthSizeClass,
    modifier: Modifier = Modifier
) {
    var isAuthenticated by remember { mutableStateOf(true) }
    var isOnboarded by remember { mutableStateOf(true) }
    var userRole by remember { mutableStateOf(UserRole.FARMER) }
    var isBuyerRegistering by remember { mutableStateOf(false) }
    var currentScreen by remember { mutableStateOf(ScreenNav.DASHBOARD) }

    if (isBuyerRegistering) {
        BuyerRegistrationScreen(
            onRegistrationSuccess = { role ->
                userRole = role
                isBuyerRegistering = false
                isAuthenticated = true
                isOnboarded = true
            },
            onBackToLogin = { isBuyerRegistering = false },
            modifier = modifier
        )
        return
    }

    if (!isAuthenticated) {
        AuthScreen(
            onAuthSuccess = { role ->
                userRole = role
                isAuthenticated = true
                isOnboarded = true
            },
            onNavigateToBuyerRegister = { isBuyerRegistering = true },
            modifier = modifier
        )
        return
    }

    if (!isOnboarded) {
        OnboardingScreen(
            role = userRole,
            onComplete = { isOnboarded = true },
            modifier = modifier
        )
        return
    }

    // Adaptive Navigation Scaffold based on WindowWidthSizeClass
    when (widthSizeClass) {
        WindowWidthSizeClass.Compact -> {
            CompactPhoneScaffold(
                currentScreen = currentScreen,
                onScreenSelected = { currentScreen = it },
                userRole = userRole,
                widthSizeClass = widthSizeClass,
                onSignOut = { isAuthenticated = false },
                modifier = modifier
            )
        }
        WindowWidthSizeClass.Medium -> {
            MediumTabletScaffold(
                currentScreen = currentScreen,
                onScreenSelected = { currentScreen = it },
                userRole = userRole,
                widthSizeClass = widthSizeClass,
                onSignOut = { isAuthenticated = false },
                modifier = modifier
            )
        }
        else -> {
            ExpandedDesktopScaffold(
                currentScreen = currentScreen,
                onScreenSelected = { currentScreen = it },
                userRole = userRole,
                widthSizeClass = widthSizeClass,
                onSignOut = { isAuthenticated = false },
                modifier = modifier
            )
        }
    }
}

// -------------------------------------------------------------------------
// 1. COMPACT (PHONE): Bottom Navigation Bar
// -------------------------------------------------------------------------
@Composable
private fun CompactPhoneScaffold(
    currentScreen: ScreenNav,
    onScreenSelected: (ScreenNav) -> Unit,
    userRole: UserRole,
    widthSizeClass: WindowWidthSizeClass,
    onSignOut: () -> Unit,
    modifier: Modifier = Modifier
) {
    Scaffold(
        bottomBar = {
            NavigationBar(
                containerColor = MaterialTheme.colorScheme.surface,
                tonalElevation = 4.dp
            ) {
                ScreenNav.values().forEach { screen ->
                    val selected = currentScreen == screen
                    NavigationBarItem(
                        selected = selected,
                        onClick = { onScreenSelected(screen) },
                        icon = { Icon(imageVector = screen.icon, contentDescription = screen.label) },
                        label = { Text(screen.label) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = ForestGreenPrimary,
                            selectedTextColor = ForestGreenPrimary,
                            indicatorColor = ForestGreenPrimaryContainer
                        )
                    )
                }
            }
        },
        containerColor = MaterialTheme.colorScheme.background,
        modifier = modifier
    ) { padding ->
        Box(modifier = Modifier.padding(padding)) {
            AppScreenContent(
                screen = currentScreen,
                userRole = userRole,
                widthSizeClass = widthSizeClass,
                onNavigate = onScreenSelected,
                onSignOut = onSignOut
            )
        }
    }
}

// -------------------------------------------------------------------------
// 2. MEDIUM (TABLET): Left Navigation Rail
// -------------------------------------------------------------------------
@Composable
private fun MediumTabletScaffold(
    currentScreen: ScreenNav,
    onScreenSelected: (ScreenNav) -> Unit,
    userRole: UserRole,
    widthSizeClass: WindowWidthSizeClass,
    onSignOut: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(modifier = modifier.fillMaxSize()) {
        NavigationRail(
            containerColor = MaterialTheme.colorScheme.surface,
            header = {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .padding(vertical = 16.dp)
                        .size(44.dp)
                        .background(ForestGreenPrimary, MaterialTheme.shapes.medium)
                ) {
                    Icon(imageVector = Icons.Default.Agriculture, contentDescription = null, tint = Color.White)
                }
            }
        ) {
            Spacer(modifier = Modifier.weight(1f))
            ScreenNav.values().forEach { screen ->
                val selected = currentScreen == screen
                NavigationRailItem(
                    selected = selected,
                    onClick = { onScreenSelected(screen) },
                    icon = { Icon(imageVector = screen.icon, contentDescription = screen.label) },
                    label = { Text(screen.label) },
                    colors = NavigationRailItemDefaults.colors(
                        selectedIconColor = ForestGreenPrimary,
                        selectedTextColor = ForestGreenPrimary,
                        indicatorColor = ForestGreenPrimaryContainer
                    )
                )
            }
            Spacer(modifier = Modifier.weight(1f))
        }

        VerticalDivider(color = MaterialTheme.colorScheme.outlineVariant)

        Box(modifier = Modifier.weight(1f)) {
            AppScreenContent(
                screen = currentScreen,
                userRole = userRole,
                widthSizeClass = widthSizeClass,
                onNavigate = onScreenSelected,
                onSignOut = onSignOut
            )
        }
    }
}

// -------------------------------------------------------------------------
// 3. EXPANDED (DESKTOP): Persistent Left Navigation Drawer
// -------------------------------------------------------------------------
@Composable
private fun ExpandedDesktopScaffold(
    currentScreen: ScreenNav,
    onScreenSelected: (ScreenNav) -> Unit,
    userRole: UserRole,
    widthSizeClass: WindowWidthSizeClass,
    onSignOut: () -> Unit,
    modifier: Modifier = Modifier
) {
    PermanentNavigationDrawer(
        drawerContent = {
            PermanentDrawerSheet(
                modifier = Modifier.width(260.dp),
                drawerContainerColor = MaterialTheme.colorScheme.surface
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier
                                .size(40.dp)
                                .background(ForestGreenPrimary, MaterialTheme.shapes.medium)
                        ) {
                            Icon(imageVector = Icons.Default.Agriculture, contentDescription = null, tint = Color.White)
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = "AgriLink",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                color = ForestGreenPrimary
                            )
                            Text(
                                text = "Enterprise SaaS v2.0",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(28.dp))

                    ScreenNav.values().forEach { screen ->
                        val selected = currentScreen == screen
                        NavigationDrawerItem(
                            label = { Text(screen.label, fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal) },
                            icon = { Icon(imageVector = screen.icon, contentDescription = screen.label) },
                            selected = selected,
                            onClick = { onScreenSelected(screen) },
                            colors = NavigationDrawerItemDefaults.colors(
                                selectedContainerColor = ForestGreenPrimaryContainer,
                                selectedIconColor = ForestGreenPrimary,
                                selectedTextColor = ForestGreenPrimary
                            ),
                            shape = MaterialTheme.shapes.medium,
                            modifier = Modifier.padding(vertical = 4.dp)
                        )
                    }

                    Spacer(modifier = Modifier.weight(1f))

                    // User Profile Snippet in Drawer Footer
                    Surface(
                        color = LinenBackground,
                        shape = MaterialTheme.shapes.medium,
                        border = androidx.compose.foundation.BorderStroke(1.dp, StoneOutline),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.AccountCircle, contentDescription = null, tint = ForestGreenPrimary)
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text("Ramesh Bhai Patel", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                                Text("FPO Pro Member", style = MaterialTheme.typography.labelSmall, color = SageSecondary)
                            }
                        }
                    }
                }
            }
        },
        modifier = modifier
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            AppScreenContent(
                screen = currentScreen,
                userRole = userRole,
                widthSizeClass = widthSizeClass,
                onNavigate = onScreenSelected,
                onSignOut = onSignOut
            )
        }
    }
}

// -------------------------------------------------------------------------
// SCREEN ROUTING DISPATCHER
// -------------------------------------------------------------------------
@Composable
private fun AppScreenContent(
    screen: ScreenNav,
    userRole: UserRole,
    widthSizeClass: WindowWidthSizeClass,
    onNavigate: (ScreenNav) -> Unit,
    onSignOut: () -> Unit
) {
    when (screen) {
        ScreenNav.DASHBOARD -> DashboardScreen(
            userRole = userRole,
            widthSizeClass = widthSizeClass,
            onNavigateToGradeCam = { onNavigate(ScreenNav.GRADECAM) },
            onNavigateToLogistics = { onNavigate(ScreenNav.LOGISTICS) },
            onNavigateToMarketplace = { onNavigate(ScreenNav.MARKETPLACE) },
            onTriggerVoiceAssistant = {}
        )
        ScreenNav.MARKETPLACE -> MarketplaceScreen(
            onBack = { onNavigate(ScreenNav.DASHBOARD) },
            onOrderPlaced = { onNavigate(ScreenNav.DASHBOARD) }
        )
        ScreenNav.GRADECAM -> GradeCamScreen(
            onGradeConfirmed = { onNavigate(ScreenNav.DASHBOARD) },
            onBack = { onNavigate(ScreenNav.DASHBOARD) }
        )
        ScreenNav.LOGISTICS -> LogisticsScreen(
            onBack = { onNavigate(ScreenNav.DASHBOARD) },
            onDispatchRoute = { onNavigate(ScreenNav.DASHBOARD) }
        )
        ScreenNav.SETTINGS -> SettingsScreen(
            userRole = userRole,
            onSignOut = onSignOut
        )
    }
}
