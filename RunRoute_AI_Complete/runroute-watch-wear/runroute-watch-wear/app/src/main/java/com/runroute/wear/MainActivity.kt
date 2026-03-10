// MainActivity.kt (Wear)
package com.runroute.wear

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.*
import androidx.navigation.NavType
import androidx.navigation.navArgument
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.navigation.SwipeDismissableNavHost
import androidx.wear.compose.navigation.composable
import androidx.wear.compose.navigation.rememberSwipeDismissableNavController
import com.runroute.wear.ui.home.WearHomeScreen
import com.runroute.wear.ui.navigation.WearNavigationScreen
import com.runroute.wear.data.WearRoute
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            RunRouteWearApp()
        }
    }
}

@Composable
fun RunRouteWearApp() {
    MaterialTheme {
        val navController = rememberSwipeDismissableNavController()

        // 루트 데이터를 간단히 공유하기 위한 상태
        var selectedRoute by remember { mutableStateOf<WearRoute?>(null) }

        SwipeDismissableNavHost(
            navController = navController,
            startDestination = "home",
        ) {
            composable("home") {
                WearHomeScreen(
                    navController = navController,
                    // 루트 선택 시 콜백
                    onRouteSelected = { route ->
                        selectedRoute = route
                        navController.navigate("navigation/${route.id}")
                    }
                )
            }

            composable(
                route = "navigation/{routeId}",
                arguments = listOf(navArgument("routeId") { type = NavType.StringType })
            ) { backStackEntry ->
                val routeId = backStackEntry.arguments?.getString("routeId") ?: return@composable
                val route = selectedRoute ?: return@composable

                WearNavigationScreen(
                    routeId = routeId,
                    route = route,
                    navController = navController,
                )
            }
        }
    }
}
