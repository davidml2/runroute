// NavigationScreen.kt
package com.runroute.app.ui.navigation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.android.gms.maps.model.LatLng
import com.runroute.app.data.repository.RouteRepository
import com.runroute.app.data.repository.Result
import com.runroute.app.domain.model.RunRoute
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import java.util.Timer
import java.util.TimerTask
import javax.inject.Inject
import kotlin.math.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.google.maps.android.compose.*
import com.google.android.gms.maps.model.CameraPosition

// ── UI State ──────────────────────────────────────────────────
data class NavUiState(
    val progressKm: Double = 0.0,
    val totalKm: Double = 0.0,
    val elapsedSeconds: Int = 0,
    val currentPace: String = "--'--\"",
    val heartRate: Int = 0,
    val nextInstruction: String = "직진",
    val distanceToTurnM: Double = 0.0,
    val isOffRoute: Boolean = false,
    val isCompleted: Boolean = false,
    val currentLatLng: LatLng? = null,
)

@HiltViewModel
class NavigationViewModel @Inject constructor(
    private val repo: RouteRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(NavUiState())
    val state: StateFlow<NavUiState> = _state.asStateFlow()

    private var timer: Timer? = null
    private var sessionId: String = ""
    lateinit var route: RunRoute

    fun init(route: RunRoute, sessionId: String) {
        this.route = route
        this.sessionId = sessionId
        _state.update { it.copy(totalKm = route.distanceKm) }
        startTimer()
    }

    private fun startTimer() {
        timer = Timer()
        timer?.scheduleAtFixedRate(object : TimerTask() {
            override fun run() {
                _state.update { it.copy(elapsedSeconds = it.elapsedSeconds + 1) }
            }
        }, 1000L, 1000L)
    }

    fun updateLocation(lat: Double, lng: Double) {
        val current = LatLng(lat, lng)
        _state.update { it.copy(currentLatLng = current) }
        checkRouteProgress(lat, lng)
    }

    private fun checkRouteProgress(lat: Double, lng: Double) {
        val coords = route.latLngList
        if (coords.isEmpty()) return

        var minDist = Double.MAX_VALUE
        var closestIdx = 0
        coords.forEachIndexed { idx, point ->
            val d = haversine(lat, lng, point.latitude, point.longitude)
            if (d < minDist) { minDist = d; closestIdx = idx }
        }

        val progressKm = (closestIdx.toDouble() / coords.size) * route.distanceKm
        val isOffRoute = minDist > 50

        _state.update { it.copy(progressKm = progressKm, isOffRoute = isOffRoute) }

        if (progressKm >= route.distanceKm * 0.95) {
            viewModelScope.launch { completeRun() }
        }
    }

    fun completeRun() {
        if (_state.value.isCompleted) return
        timer?.cancel()
        _state.update { it.copy(isCompleted = true) }
        viewModelScope.launch {
            val s = _state.value
            val pace = if (s.elapsedSeconds > 0 && s.progressKm > 0)
                s.elapsedSeconds.toDouble() / s.progressKm else null
            repo.completeRun(sessionId, s.progressKm, s.elapsedSeconds, pace, null,
                (s.progressKm * 65).toInt())
        }
    }

    val elapsedTimeStr: String
        get() {
            val sec = _state.value.elapsedSeconds
            val h = sec / 3600; val m = (sec % 3600) / 60; val s = sec % 60
            return if (h > 0) "$h:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}"
            else "${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}"
        }

    private fun haversine(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val R = 6371000.0
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val a = sin(dLat/2).pow(2) + cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) * sin(dLon/2).pow(2)
        return R * 2 * atan2(sqrt(a), sqrt(1-a))
    }

    override fun onCleared() { timer?.cancel() }
}

// ── Navigation Screen Composable ──────────────────────────────
@Composable
fun NavigationScreen(
    route: RunRoute,
    sessionId: String,
    navController: NavController,
    vm: NavigationViewModel = hiltViewModel(),
) {
    LaunchedEffect(Unit) { vm.init(route, sessionId) }
    val state by vm.state.collectAsState()
    var showExitDialog by remember { mutableStateOf(false) }

    LaunchedEffect(state.isCompleted) {
        if (state.isCompleted) navController.popBackStack()
    }

    Box(modifier = Modifier.fillMaxSize()) {
        // 지도
        val cameraState = rememberCameraPositionState {
            position = CameraPosition.fromLatLngZoom(
                route.latLngList.firstOrNull() ?: LatLng(37.5665, 126.978), 16f
            )
        }
        LaunchedEffect(state.currentLatLng) {
            state.currentLatLng?.let {
                cameraState.position = CameraPosition.fromLatLngZoom(it, 16f)
            }
        }

        GoogleMap(
            modifier = Modifier.fillMaxSize(),
            cameraPositionState = cameraState,
            properties = MapProperties(isMyLocationEnabled = true),
            uiSettings = MapUiSettings(myLocationButtonEnabled = false, zoomControlsEnabled = false),
        ) {
            if (route.latLngList.isNotEmpty()) {
                Polyline(points = route.latLngList, color = Color.Blue, width = 12f)
            }
        }

        // 상단 방향 안내
        TurnBanner(
            instruction = state.nextInstruction,
            distanceM = state.distanceToTurnM,
            isOffRoute = state.isOffRoute,
            modifier = Modifier.align(Alignment.TopCenter).padding(top = 56.dp).padding(horizontal = 16.dp),
        )

        // 중단 버튼
        IconButton(
            onClick = { showExitDialog = true },
            modifier = Modifier.align(Alignment.TopEnd).padding(top = 56.dp, end = 16.dp),
        ) {
            Icon(Icons.Default.Close, contentDescription = "중단", tint = Color.Red)
        }

        // 하단 통계
        RunStatsPanel(
            elapsedTime = vm.elapsedTimeStr,
            progressKm = state.progressKm,
            totalKm = state.totalKm,
            pace = state.currentPace,
            heartRate = state.heartRate,
            modifier = Modifier.align(Alignment.BottomCenter),
        )
    }

    if (showExitDialog) {
        AlertDialog(
            onDismissRequest = { showExitDialog = false },
            title = { Text("러닝 중단") },
            text = { Text("러닝을 중단하면 현재까지의 기록이 저장됩니다.") },
            confirmButton = {
                TextButton(onClick = { vm.completeRun(); showExitDialog = false }) {
                    Text("중단하기", color = Color.Red)
                }
            },
            dismissButton = {
                TextButton(onClick = { showExitDialog = false }) { Text("계속하기") }
            },
        )
    }
}

@Composable
fun TurnBanner(instruction: String, distanceM: Double, isOffRoute: Boolean, modifier: Modifier) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.95f),
        shape = RoundedCornerShape(16.dp),
        shadowElevation = 4.dp,
    ) {
        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(text = instruction, fontSize = 28.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.width(12.dp))
            Column {
                if (isOffRoute) {
                    Text("⚠️ 루트에서 이탈", color = Color(0xFFF59E0B), style = MaterialTheme.typography.bodySmall)
                } else if (distanceM > 0) {
                    Text("${distanceM.toInt()}m 후", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

@Composable
fun RunStatsPanel(
    elapsedTime: String, progressKm: Double, totalKm: Double,
    pace: String, heartRate: Int, modifier: Modifier,
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = Color(0xFF2563EB),
    ) {
        Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            // 진행률 바
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                LinearProgressIndicator(
                    progress = { if (totalKm > 0) (progressKm / totalKm).toFloat().coerceIn(0f, 1f) else 0f },
                    modifier = Modifier.fillMaxWidth().height(6.dp),
                    color = Color.White,
                    trackColor = Color.White.copy(alpha = 0.3f),
                )
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("${String.format("%.2f", progressKm)} km", color = Color.White.copy(0.8f), style = MaterialTheme.typography.labelSmall)
                    Text("${String.format("%.2f", totalKm - progressKm)} km 남음", color = Color.White.copy(0.8f), style = MaterialTheme.typography.labelSmall)
                }
            }
            // 통계
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                NavStat("⏱", "시간", elapsedTime)
                Divider(modifier = Modifier.height(40.dp).width(1.dp), color = Color.White.copy(0.3f))
                NavStat("👟", "페이스", pace)
                Divider(modifier = Modifier.height(40.dp).width(1.dp), color = Color.White.copy(0.3f))
                NavStat("❤️", "심박", if (heartRate > 0) "$heartRate" else "--")
            }
        }
    }
}

@Composable
fun NavStat(emoji: String, label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(emoji, fontSize = 16.sp)
        Text(value, color = Color.White, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
        Text(label, color = Color.White.copy(0.7f), style = MaterialTheme.typography.labelSmall)
    }
}
