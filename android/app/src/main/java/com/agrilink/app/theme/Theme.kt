package com.agrilink.app.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColorScheme = lightColorScheme(
    primary = ForestGreenPrimary,
    onPrimary = OnForestGreenPrimary,
    primaryContainer = ForestGreenPrimaryContainer,
    onPrimaryContainer = OnForestGreenPrimaryContainer,
    secondary = SageSecondary,
    onSecondary = OnSageSecondary,
    secondaryContainer = SageSecondaryContainer,
    onSecondaryContainer = OnSageSecondaryContainer,
    tertiary = HarvestOchreTertiary,
    onTertiary = OnHarvestOchreTertiary,
    tertiaryContainer = HarvestOchreContainer,
    onTertiaryContainer = OnHarvestOchreContainer,
    background = LinenBackground,
    onBackground = OnLinenBackground,
    surface = CardSurface,
    onSurface = OnCardSurface,
    surfaceVariant = WarmNeutralSurfaceVariant,
    onSurfaceVariant = OnWarmNeutralSurfaceVariant,
    outline = StoneOutline,
    outlineVariant = StoneOutlineVariant
)

private val DarkColorScheme = darkColorScheme(
    primary = MintSageDarkPrimary,
    onPrimary = OnMintSageDarkPrimary,
    primaryContainer = ForestGreenDarkPrimaryContainer,
    onPrimaryContainer = OnForestGreenDarkPrimaryContainer,
    secondary = PaleSageDarkSecondary,
    onSecondary = OnPaleSageDarkSecondary,
    secondaryContainer = SageDarkSecondaryContainer,
    onSecondaryContainer = OnSageDarkSecondaryContainer,
    tertiary = WarmAmberDarkTertiary,
    onTertiary = OnWarmAmberDarkTertiary,
    tertiaryContainer = AmberDarkTertiaryContainer,
    onTertiaryContainer = OnAmberDarkTertiaryContainer,
    background = NightForestDarkBackground,
    onBackground = OnNightForestDarkBackground,
    surface = ElevatedDarkSurface,
    onSurface = OnElevatedDarkSurface,
    surfaceVariant = WarmNeutralSurfaceVariant,
    onSurfaceVariant = OnWarmNeutralSurfaceVariant,
    outline = MutedMossDarkOutline
)

@Composable
fun AgriLinkTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.background.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
