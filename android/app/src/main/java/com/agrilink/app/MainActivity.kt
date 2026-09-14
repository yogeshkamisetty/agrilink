package com.agrilink.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.material3.windowsizeclass.ExperimentalMaterial3WindowSizeClassApi
import androidx.compose.material3.windowsizeclass.calculateWindowSizeClass
import androidx.compose.ui.Modifier
import com.agrilink.app.theme.AgriLinkTheme
import com.agrilink.app.ui.AgriLinkApp

class MainActivity : ComponentActivity() {
    @OptIn(ExperimentalMaterial3WindowSizeClassApi::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            val windowSizeClass = calculateWindowSizeClass(this)
            AgriLinkTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    AgriLinkApp(widthSizeClass = windowSizeClass.widthSizeClass)
                }
            }
        }
    }
}
