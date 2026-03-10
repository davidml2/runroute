// HomeScreen.kt (Wear)
package com.runroute.wear.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.runroute.wear.data.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.items
import androidx.wear.compose.material.*

// ── ViewModel ─────────────────────────────────────────────────
data class WearHomeState(
    val phase: Phase = Phase.Configure,
    val routes: List<WearRoute> = emptyList(),
    val selectedDistance: Int = 5,
    val selectedTerrains: List<String> = emptyList(),
    val selectedDifficulty: String = "moderate",
    val error: String? = null,
) { enum class Phase { Configure, Loading, RouteList, Error } }

@HiltViewModel
class WearHomeViewModel @Inject constructor(private val repo: WearRouteRepository) : ViewModel() {

    private val _state = MutableStateFlow(WearHomeState())
    val state: StateFlow<WearHomeState> = _state.asStateFlow()

    var currentLat = 37.5665
    var currentLng = 126.9780

    fun increaseDistance() = _state.update { it.copy(selectedDistance = (it.selectedDistance + 1).coerceAtMost(30)) }
    fun decreaseDistance() = _state.update { it.copy(selectedDistance = (it.selectedDistance - 1).coerceAtLeast(1)) }
    fun toggleTerrain(id: String) = _state.update {
        val t = it.selectedTerrains.toMutableList()
        if (id in t) t.remove(id) else t.add(id)
        it.copy(selectedTerrains = t)
    }
    fun setDifficulty(d: String) = _state.update { it.copy(selectedDifficulty = d) }

    fun recommend() {
        _state.update { it.copy(phase = WearHomeState.Phase.Loading, error = null) }
        viewModelScope.launch {
            val s = _state.value
            when (val r = repo.recommendRoutes(currentLat, currentLng,
                s.selectedDistance.toDouble(), s.selectedTerrains, s.selectedDifficulty)) {
                is Result.Success -> _state.update { it.copy(routes = r.data, phase = WearHomeState.Phase.RouteList) }
                is Result.Error   -> _state.update { it.copy(error = r.message, phase = WearHomeState.Phase.Error) }
            }
        }
    }
    fun reset() = _state.update { it.copy(phase = WearHomeState.Phase.Configure) }
}

// ── Home Screen ───────────────────────────────────────────────
@Composable
fun WearHomeScreen(navController: NavController, vm: WearHomeViewModel = hiltViewModel()) {
    val state by vm.state.collectAsState()

    when (state.phase) {
        WearHomeState.Phase.Configure  -> ConfigureScreen(state, vm)
        WearHomeState.Phase.Loading    -> LoadingScreen()
        WearHomeState.Phase.RouteList  -> RouteListScreen(state.routes, navController, vm::reset)
        WearHomeState.Phase.Error      -> ErrorScreen(state.error, vm::reset)
    }
}

// ── 설정 화면 ──────────────────────────────────────────────────
@Composable
fun ConfigureScreen(state: WearHomeState, vm: WearHomeViewModel) {
    ScalingLazyColumn(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        item {
            Text("🏃 RunRoute", fontSize = 14.sp, fontWeight = FontWeight.Bold,
                color = MaterialTheme.colors.primary, modifier = Modifier.padding(vertical = 4.dp))
        }

        // 거리 설정
        item {
            Chip(
                modifier = Modifier.fillMaxWidth(),
                colors = ChipDefaults.secondaryChipColors(),
                onClick = {},
                label = {
                    Row(modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically) {
                        Button(onClick = vm::decreaseDistance,
                            modifier = Modifier.size(28.dp),
                            colors = ButtonDefaults.primaryButtonColors()) {
                            Text("-", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        }
                        Text("${state.selectedDistance} km", fontSize = 18.sp,
                            fontWeight = FontWeight.Bold, color = MaterialTheme.colors.primary)
                        Button(onClick = vm::increaseDistance,
                            modifier = Modifier.size(28.dp),
                            colors = ButtonDefaults.primaryButtonColors()) {
                            Text("+", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            )
        }

        // 지형 선택
        item {
            Row(modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly) {
                listOf("park" to "🌳", "riverside" to "🏞️", "urban" to "🏙️").forEach { (id, emoji) ->
                    CompactChip(
                        onClick = { vm.toggleTerrain(id) },
                        colors = if (id in state.selectedTerrains)
                            ChipDefaults.primaryChipColors()
                        else ChipDefaults.secondaryChipColors(),
                        label = { Text(emoji, fontSize = 16.sp) },
                    )
                }
            }
        }
        item {
            Row(modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly) {
                listOf("mountain" to "⛰️", "beach" to "🏖️").forEach { (id, emoji) ->
                    CompactChip(
                        onClick = { vm.toggleTerrain(id) },
                        colors = if (id in state.selectedTerrains)
                            ChipDefaults.primaryChipColors()
                        else ChipDefaults.secondaryChipColors(),
                        label = { Text(emoji, fontSize = 16.sp) },
                    )
                }
            }
        }

        // 추천 버튼
        item {
            Button(
                onClick = vm::recommend,
                modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                colors = ButtonDefaults.primaryButtonColors(),
            ) {
                Text("루트 찾기", fontWeight = FontWeight.Bold)
            }
        }
    }
}

// ── 로딩 화면 ─────────────────────────────────────────────────
@Composable
fun LoadingScreen() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
            CircularProgressIndicator(modifier = Modifier.size(40.dp), strokeWidth = 4.dp, indicatorColor = MaterialTheme.colors.primary)
            Text("분석 중...", fontSize = 13.sp, color = MaterialTheme.colors.onSurface.copy(0.7f))
        }
    }
}

// ── 루트 목록 ─────────────────────────────────────────────────
@Composable
fun RouteListScreen(routes: List<WearRoute>, navController: NavController, onBack: () -> Unit) {
    ScalingLazyColumn(modifier = Modifier.fillMaxSize()) {
        item {
            Row(modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically) {
                Text("추천 루트", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                CompactChip(onClick = onBack, label = { Text("←", fontSize = 12.sp) })
            }
        }
        items(routes) { route ->
            WearRouteChip(route = route, onClick = {
                navController.navigate("navigation/${route.id}")
            })
        }
    }
}

@Composable
fun WearRouteChip(route: WearRoute, onClick: () -> Unit) {
    Chip(
        modifier = Modifier.fillMaxWidth(),
        onClick = onClick,
        colors = ChipDefaults.secondaryChipColors(),
        label = {
            Row(modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically) {
                Text(route.terrainEmoji, fontSize = 20.sp)
                Column(modifier = Modifier.weight(1f).padding(horizontal = 8.dp)) {
                    Text(
                        text = route.description ?: "${String.format("%.1f", route.distanceKm)}km",
                        fontSize = 12.sp, fontWeight = FontWeight.Medium,
                        maxLines = 1, overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        text = "${String.format("%.1f", route.distanceKm)}km · ${route.estimatedMinutes}분",
                        fontSize = 10.sp, color = MaterialTheme.colors.onSurface.copy(0.6f),
                    )
                }
                route.totalScore?.let { score ->
                    Text("${score.toInt()}",
                        fontSize = 12.sp, fontWeight = FontWeight.Bold,
                        color = if (score >= 80) Color(0xFF4ADE80) else Color(0xFFFBBF24))
                }
            }
        }
    )
}

// ── 오류 화면 ─────────────────────────────────────────────────
@Composable
fun ErrorScreen(error: String?, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.padding(16.dp)) {
            Text("📡", fontSize = 28.sp)
            Text(error ?: "오류 발생", fontSize = 12.sp, textAlign = TextAlign.Center,
                color = MaterialTheme.colors.onSurface.copy(0.8f))
            Button(onClick = onRetry, colors = ButtonDefaults.primaryButtonColors()) {
                Text("다시 시도")
            }
        }
    }
}
