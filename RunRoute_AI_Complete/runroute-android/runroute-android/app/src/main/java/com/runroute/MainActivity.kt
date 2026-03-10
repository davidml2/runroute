// MainActivity.kt
package com.runroute.app

import android.Manifest
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.*
import com.runroute.app.ui.auth.AuthScreen
import com.runroute.app.ui.auth.AuthViewModel
import com.runroute.app.ui.home.HomeScreen
import com.runroute.app.ui.navigation.NavigationScreen
import com.runroute.app.ui.theme.RunRouteTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    private val locationPermission = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { /* 권한 결과 처리 */ }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        locationPermission.launch(arrayOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
        ))

        setContent {
            RunRouteTheme {
                RunRouteApp()
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RunRouteApp() {
    val navController = rememberNavController()
    val authVm: AuthViewModel = hiltViewModel()
    val isLoggedIn by remember { derivedStateOf { authVm.isLoggedIn } }

    if (!isLoggedIn) {
        AuthScreen(onSuccess = { /* 재구성으로 자동 이동 */ })
    } else {
        Scaffold(
            bottomBar = { BottomNavBar(navController) }
        ) { innerPadding ->
            NavHost(
                navController = navController,
                startDestination = "home",
                modifier = Modifier.padding(innerPadding),
            ) {
                composable("home") { HomeScreen(navController) }
                composable("history") { HistoryScreen() }
                composable("profile") { ProfileScreen(onLogout = { authVm.logout() }) }
                composable("navigation/{routeId}/{sessionId}") { backStack ->
                    // TODO: pass route object via SavedStateHandle or ViewModel
                    Text("내비게이션 화면")
                }
            }
        }
    }
}

@Composable
fun BottomNavBar(navController: NavHostController) {
    val navBackStack by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStack?.destination?.route

    NavigationBar {
        NavigationBarItem(
            selected = currentRoute == "home",
            onClick = { navController.navigate("home") { launchSingleTop = true } },
            icon = { Icon(Icons.Default.Map, contentDescription = null) },
            label = { Text("홈") },
        )
        NavigationBarItem(
            selected = currentRoute == "history",
            onClick = { navController.navigate("history") { launchSingleTop = true } },
            icon = { Icon(Icons.Default.List, contentDescription = null) },
            label = { Text("기록") },
        )
        NavigationBarItem(
            selected = currentRoute == "profile",
            onClick = { navController.navigate("profile") { launchSingleTop = true } },
            icon = { Icon(Icons.Default.Person, contentDescription = null) },
            label = { Text("프로필") },
        )
    }
}

// ── History Screen ──────────────────────────────────────────
@Composable
fun HistoryScreen() {
    // ProfileViewModel 재사용
    Text("러닝 기록 화면")
}

// ── Profile Screen ──────────────────────────────────────────
@Composable
fun ProfileScreen(onLogout: () -> Unit) {
    Text("프로필 화면")
}
