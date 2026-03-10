// NavigationScreen.kt (Wear)
package com.runroute.wear.ui.navigation

import android.location.Location
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.runroute.wear.data.*
import com.runroute.wear.health.WearHealthManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import java.util.Timer
import java.util.TimerTask
import javax.inject.Inject
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.material.*

// ── ViewModel ─────────────────────────────────────────────────
enum class NavPhase { PreStart, Running, Completed }
enum class ActiveMetric { Pace, HeartRate, Calories }

data class WearNavState(
    val phase: NavPhase = NavPhase.PreStart,
    val runState: RunningState = RunningState(),
    val activeMetric: ActiveMetric = ActiveMetric.Pace,
    val showStopConfirm: Boolean = false,
)

@HiltViewModel
class WearNavViewModel @Inject constructor(
    private val repo: WearRouteRepository,
    private val health: WearHealthManager,
) : ViewModel() {

    private val _state = MutableStateFlow(WearNavState())
    val state: StateFlow<WearNavState> = _state.asStateFlow()

    lateinit var route: WearRoute
    private var sessionId = ""
    private var timer: Timer? = null

    fun initRoute(route: WearRoute) {
        this.route = route
        _state.update { it.copy(runState = RunningState(totalKm = route.distanceKm)) }
    }

    // ── 러닝 시작 ─────────────────────────────────────────────
    fun startRun() {
        viewModelScope.launch {
            // HealthServices 운동 시작
            health.startExercise()

            // 서버 세션 시작
            when (val r = repo.startNavigation(route.id)) {
                is Result.Success -> sessionId = r.data.id
                is Result.Error   -> sessionId = java.util.UUID.randomUUID().toString()
            }

            _state.update { it.copy(phase = NavPhase.Running) }
            startTimer()
        }
    }

    // ── 러닝 완료 ─────────────────────────────────────────────
    fun completeRun() {
        if (_state.value.phase != NavPhase.Running) return
        timer?.cancel()
        viewModelScope.launch {
            val (avgHR, cal, _) = health.endExercise()
            val runState = _state.value.runState
            val avgPace = if (runState.elapsedSeconds > 0 && runState.progressKm > 0)
                runState.elapsedSeconds.toDouble() / runState.progressKm else null

            repo.completeRun(sessionId, runState.progressKm,
                runState.elapsedSeconds, avgPace, avgHR.takeIf { it > 0 })

            _state.update { it.copy(phase = NavPhase.Completed) }
        }
    }

    fun toggleStopConfirm(show: Boolean) = _state.update { it.copy(showStopConfirm = show) }

    fun cycleMetric() {
        val next = when (_state.value.activeMetric) {
            ActiveMetric.Pace      -> ActiveMetric.HeartRate
            ActiveMetric.HeartRate -> ActiveMetric.Calories
            ActiveMetric.Calories  -> ActiveMetric.Pace
        }
        _state.update { it.copy(activeMetric = next) }
    }

    fun updateLocation(lat: Double, lng: Double) {
        val coords = route.latLngList
        if (coords.isEmpty()) return
        var minDist = Double.MAX_VALUE; var closestIdx = 0
        coords.forEachIndexed { i, (cLat, cLng) ->
            val d = haversineMeters(lat, lng, cLat, cLng)
            if (d < minDist) { minDist = d; closestIdx = i }
        }
        val progress = (closestIdx.toDouble() / coords.size) * route.distanceKm
        val isOff = minDist > 50

        _state.update { s -> s.copy(runState = s.runState.copy(
            progressKm = progress, isOffRoute = isOff,
            nextInstruction = if (isOff) "루트 이탈" else calcInstruction(lat, lng, coords, closestIdx),
        )) }

        if (progress >= route.distanceKm * 0.95) completeRun()
    }

    private fun startTimer() {
        timer = Timer()
        timer?.scheduleAtFixedRate(object : TimerTask() {
            override fun run() {
                viewModelScope.launch(Dispatchers.Main) {
                    val hr = health.heartRate.value
                    val cal = health.calories.value.toInt()
                    _state.update { s ->
                        val elapsed = s.runState.elapsedSeconds + 1
                        val pace = if (s.runState.progressKm > 0) elapsed.toDouble() / s.runState.progressKm else 0.0
                        s.copy(runState = s.runState.copy(
                            elapsedSeconds = elapsed, heartRateBpm = hr,
                            calories = cal, currentPaceSecPerKm = pace,
                        ))
                    }
                }
            }
        }, 1000L, 1000L)
    }

    private fun calcInstruction(lat: Double, lng: Double, coords: List<Pair<Double, Double>>, idx: Int): String {
        val nextIdx = (idx + 3).coerceAtMost(coords.size - 1)
        val (nLat, nLng) = coords[nextIdx]
        val bearing = Math.toDegrees(Math.atan2(nLng - lng, nLat - lat))
        return when {
            bearing in -45.0..45.0     -> "↑ 직진"
            bearing in 45.0..135.0     -> "→ 우회전"
            bearing in -135.0..-45.0   -> "← 좌회전"
            else                       -> "↓ 유턴"
        }
    }

    override fun onCleared() { timer?.cancel() }
}

// ── Navigation Screen ─────────────────────────────────────────
@Composable
fun WearNavigationScreen(
    routeId: String,
    route: WearRoute,
    navController: NavController,
    vm: WearNavViewModel = hiltViewModel(),
) {
    LaunchedEffect(Unit) { vm.initRoute(route) }
    val state by vm.state.collectAsState()

    LaunchedEffect(state.phase) {
        if (state.phase == NavPhase.Completed) {
            delay(3000); navController.popBackStack()
        }
    }

    when (state.phase) {
        NavPhase.PreStart  -> PreStartScreen(route, vm::startRun)
        NavPhase.Running   -> RunningScreen(state, vm)
        NavPhase.Completed -> CompletedScreen(state.runState)
    }
}

// ── 시작 전 ──────────────────────────────────────────────────
@Composable
fun PreStartScreen(route: WearRoute, onStart: () -> Unit) {
    ScalingLazyColumn(modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally) {
        item { Text(route.terrainEmoji, fontSize = 36.sp, modifier = Modifier.padding(top = 8.dp)) }
        item {
            Text(route.description ?: "${String.format("%.1f", route.distanceKm)}km",
                fontSize = 13.sp, fontWeight = FontWeight.Medium, textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 8.dp))
        }
        item {
            Row(modifier = Modifier.fillMaxWidth().padding(4.dp),
                horizontalArrangement = Arrangement.SpaceEvenly) {
                WearStatBox("거리", "${String.format("%.1f", route.distanceKm)}km")
                WearStatBox("시간", "${route.estimatedMinutes}분")
                WearStatBox("안전", "${route.safetyScore.toInt()}점")
            }
        }
        item {
            Button(onClick = onStart, modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                colors = ButtonDefaults.primaryButtonColors()) {
                Text("▶ 시작", fontWeight = FontWeight.Bold, fontSize = 15.sp)
            }
        }
    }
}

// ── 러닝 중 화면 ─────────────────────────────────────────────
@Composable
fun RunningScreen(state: WearNavState, vm: WearNavViewModel) {
    val runState = state.runState

    Box(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize().padding(4.dp),
            horizontalAlignment = Alignment.CenterHorizontally) {

            // 방향 안내
            DirectionBanner(instruction = runState.nextInstruction, isOffRoute = runState.isOffRoute)

            Spacer(Modifier.height(4.dp))

            // 원형 진행률 + 중앙 지표 (탭으로 전환)
            Box(modifier = Modifier.size(100.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(
                    progress = runState.progressPercent,
                    modifier = Modifier.fillMaxSize(),
                    strokeWidth = 6.dp,
                    indicatorColor = MaterialTheme.colors.primary,
                    trackColor = MaterialTheme.colors.onSurface.copy(0.15f),
                )
                // 중앙 클릭 가능 지표
                Column(horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.clickableNoRipple { vm.cycleMetric() }) {
                    when (state.activeMetric) {
                        ActiveMetric.Pace -> {
                            Text(runState.formattedPace, fontSize = 18.sp,
                                fontWeight = FontWeight.Bold, color = Color.White)
                            Text("/km", fontSize = 9.sp, color = Color.White.copy(0.6f))
                        }
                        ActiveMetric.HeartRate -> {
                            Text(if (runState.heartRateBpm > 0) "${runState.heartRateBpm}" else "--",
                                fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Color(0xFFFF6B6B))
                            Text("bpm", fontSize = 9.sp, color = Color.White.copy(0.6f))
                        }
                        ActiveMetric.Calories -> {
                            Text("${runState.calories}", fontSize = 20.sp,
                                fontWeight = FontWeight.Bold, color = Color(0xFFFFB347))
                            Text("kcal", fontSize = 9.sp, color = Color.White.copy(0.6f))
                        }
                    }
                }
            }

            Spacer(Modifier.height(4.dp))

            // 하단 통계
            Row(modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly) {
                WearSmallStat("⏱", runState.formattedElapsed)
                WearSmallStat("📏", String.format("%.2f", runState.progressKm))
                WearSmallStat("🏁", String.format("%.2f", runState.remainingKm))
            }

            Spacer(Modifier.height(4.dp))

            // 중단 버튼
            CompactChip(
                onClick = { vm.toggleStopConfirm(true) },
                colors = ChipDefaults.chipColors(backgroundColor = Color(0xFFDC2626).copy(0.2f)),
                label = { Text("■ 중단", fontSize = 11.sp, color = Color(0xFFDC2626)) },
            )
        }

        // 중단 확인 다이얼로그
        if (state.showStopConfirm) {
            StopConfirmDialog(
                onConfirm = { vm.toggleStopConfirm(false); vm.completeRun() },
                onCancel = { vm.toggleStopConfirm(false) },
            )
        }
    }
}

// ── 완료 화면 ─────────────────────────────────────────────────
@Composable
fun CompletedScreen(runState: RunningState) {
    ScalingLazyColumn(modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally) {
        item { Text("🎉", fontSize = 36.sp, modifier = Modifier.padding(top = 8.dp)) }
        item { Text("러닝 완료!", fontSize = 16.sp, fontWeight = FontWeight.Bold) }
        item {
            Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)) {
                WearResultRow("거리", String.format("%.2f km", runState.progressKm))
                WearResultRow("시간", runState.formattedElapsed)
                WearResultRow("페이스", runState.formattedPace + " /km")
                if (runState.heartRateBpm > 0) WearResultRow("심박수", "${runState.heartRateBpm} bpm")
                if (runState.calories > 0) WearResultRow("칼로리", "${runState.calories} kcal")
            }
        }
    }
}

// ── 방향 배너 ─────────────────────────────────────────────────
@Composable
fun DirectionBanner(instruction: String, isOffRoute: Boolean) {
    Chip(
        modifier = Modifier.fillMaxWidth(),
        onClick = {},
        colors = ChipDefaults.chipColors(
            backgroundColor = if (isOffRoute) Color(0xFFF59E0B).copy(0.2f)
                              else MaterialTheme.colors.primary.copy(0.15f)
        ),
        label = {
            Text(
                text = instruction,
                fontSize = 13.sp, fontWeight = FontWeight.SemiBold,
                color = if (isOffRoute) Color(0xFFFBBF24) else Color.White,
            )
        },
    )
}

// ── Stop Confirm ──────────────────────────────────────────────
@Composable
fun StopConfirmDialog(onConfirm: () -> Unit, onCancel: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize().background(Color.Black.copy(0.7f)),
        contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.padding(16.dp)) {
            Text("중단할까요?", fontSize = 14.sp, fontWeight = FontWeight.Bold)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = onCancel, colors = ButtonDefaults.secondaryButtonColors(),
                    modifier = Modifier.weight(1f)) { Text("계속") }
                Button(onClick = onConfirm, colors = ButtonDefaults.primaryButtonColors(),
                    modifier = Modifier.weight(1f)) { Text("중단") }
            }
        }
    }
}

// ── 서브 컴포저블 ────────────────────────────────────────────
@Composable
fun WearStatBox(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colors.primary)
        Text(label, fontSize = 9.sp, color = MaterialTheme.colors.onSurface.copy(0.6f))
    }
}

@Composable
fun WearSmallStat(emoji: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(emoji, fontSize = 12.sp)
        Text(value, fontSize = 11.sp, fontWeight = FontWeight.Medium)
    }
}

@Composable
fun WearResultRow(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, fontSize = 11.sp, color = MaterialTheme.colors.onSurface.copy(0.6f))
        Text(value, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
    }
}

fun Modifier.clickableNoRipple(onClick: () -> Unit): Modifier = this.then(
    Modifier.clickable(indication = null, interactionSource = remember { androidx.compose.foundation.interaction.MutableInteractionSource() }, onClick = onClick)
)

fun Modifier.background(color: Color): Modifier = this.then(
    Modifier // 실제 구현에서는 androidx.compose.foundation.background 사용
)
