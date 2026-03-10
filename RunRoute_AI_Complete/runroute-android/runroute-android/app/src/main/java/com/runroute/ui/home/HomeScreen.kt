// HomeScreen.kt
package com.runroute.app.ui.home

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
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
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.google.maps.android.compose.*
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.runroute.app.domain.model.RunRoute
import com.runroute.app.domain.model.TerrainType

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    navController: NavController,
    vm: HomeViewModel = hiltViewModel(),
) {
    val state by vm.uiState.collectAsState()
    val sheetState = rememberModalBottomSheetState()

    Box(modifier = Modifier.fillMaxSize()) {
        // ── 배경 지도 ─────────────────────────────────────────
        val cameraPositionState = rememberCameraPositionState {
            position = CameraPosition.fromLatLngZoom(
                LatLng(state.currentLat, state.currentLng), 14f
            )
        }
        GoogleMap(
            modifier = Modifier.fillMaxSize(),
            cameraPositionState = cameraPositionState,
            properties = MapProperties(isMyLocationEnabled = true),
            uiSettings = MapUiSettings(myLocationButtonEnabled = false, zoomControlsEnabled = false),
        ) {
            state.routes.forEach { route ->
                Polyline(
                    points = route.latLngList,
                    color = Color.Blue,
                    width = 10f,
                )
            }
        }

        // ── 상단 도시명 ───────────────────────────────────────
        Surface(
            modifier = Modifier.align(Alignment.TopCenter).padding(top = 56.dp),
            color = MaterialTheme.colorScheme.surface.copy(alpha = 0.9f),
            shape = RoundedCornerShape(20.dp),
        ) {
            Text(
                text = state.cityName,
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            )
        }

        // ── 하단 컨트롤 패널 ──────────────────────────────────
        Surface(
            modifier = Modifier.align(Alignment.BottomCenter).fillMaxWidth().padding(16.dp),
            color = MaterialTheme.colorScheme.surface.copy(alpha = 0.95f),
            shape = RoundedCornerShape(24.dp),
            shadowElevation = 8.dp,
        ) {
            Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                // 자연어 or 슬라이더
                if (state.useNaturalInput) {
                    NaturalQueryInput(query = state.naturalQuery, onQueryChange = vm::onNaturalQueryChange)
                } else {
                    DistanceSlider(
                        distance = state.selectedDistance,
                        onDistanceChange = vm::onDistanceChange,
                    )
                }

                // 지형 선택 + 난이도
                TerrainAndDifficultyRow(
                    selectedTerrains = state.selectedTerrains,
                    selectedDifficulty = state.selectedDifficulty,
                    onTerrainToggle = vm::toggleTerrain,
                    onDifficultyChange = vm::onDifficultyChange,
                )

                // 추천 버튼
                Button(
                    onClick = vm::recommendRoutes,
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    enabled = !state.isLoading,
                    shape = RoundedCornerShape(14.dp),
                ) {
                    if (state.isLoading) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White)
                        Spacer(Modifier.width(8.dp))
                    } else {
                        Icon(Icons.Default.DirectionsRun, contentDescription = null)
                        Spacer(Modifier.width(8.dp))
                    }
                    Text(if (state.isLoading) "루트 분석 중..." else "루트 추천받기", fontWeight = FontWeight.Bold)
                }
            }
        }
    }

    // ── 루트 선택 바텀 시트 ───────────────────────────────────
    if (state.showRouteSheet) {
        ModalBottomSheet(
            onDismissRequest = vm::dismissRouteSheet,
            sheetState = sheetState,
        ) {
            RouteSelectionContent(
                routes = state.routes,
                onRouteSelect = { route ->
                    vm.dismissRouteSheet()
                    navController.navigate("route_detail/${route.id}")
                },
            )
        }
    }

    // ── 에러 스낵바 ───────────────────────────────────────────
    state.errorMessage?.let { msg ->
        AlertDialog(
            onDismissRequest = vm::dismissError,
            title = { Text("오류") },
            text = { Text(msg) },
            confirmButton = { TextButton(onClick = vm::dismissError) { Text("확인") } },
        )
    }
}

// ── 서브 컴포저블 ──────────────────────────────────────────────

@Composable
fun NaturalQueryInput(query: String, onQueryChange: (String) -> Unit) {
    OutlinedTextField(
        value = query,
        onValueChange = onQueryChange,
        placeholder = { Text("\"강변 따라 5km 가볍게\"") },
        leadingIcon = { Icon(Icons.Default.Chat, contentDescription = null) },
        trailingIcon = {
            if (query.isNotEmpty()) {
                IconButton(onClick = { onQueryChange("") }) {
                    Icon(Icons.Default.Clear, contentDescription = null)
                }
            }
        },
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        singleLine = true,
    )
}

@Composable
fun DistanceSlider(distance: Float, onDistanceChange: (Float) -> Unit) {
    Column {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("목표 거리", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(String.format("%.1f km", distance), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
        }
        Slider(value = distance, onValueChange = onDistanceChange, valueRange = 1f..30f, steps = 57)
    }
}

@Composable
fun TerrainAndDifficultyRow(
    selectedTerrains: List<String>,
    selectedDifficulty: String,
    onTerrainToggle: (String) -> Unit,
    onDifficultyChange: (String) -> Unit,
) {
    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        items(TerrainType.all) { terrain ->
            val selected = selectedTerrains.contains(terrain.id)
            FilterChip(
                selected = selected,
                onClick = { onTerrainToggle(terrain.id) },
                label = { Text("${terrain.emoji} ${terrain.label}") },
            )
        }
        item {
            var expanded by remember { mutableStateOf(false) }
            val diffMap = mapOf("easy" to "쉬움", "moderate" to "보통", "hard" to "어려움")
            Box {
                FilterChip(
                    selected = false,
                    onClick = { expanded = true },
                    label = { Text("🔥 ${diffMap[selectedDifficulty] ?: "보통"}") },
                    trailingIcon = { Icon(Icons.Default.ArrowDropDown, contentDescription = null, Modifier.size(16.dp)) },
                )
                DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                    diffMap.forEach { (id, label) ->
                        DropdownMenuItem(text = { Text(label) }, onClick = { onDifficultyChange(id); expanded = false })
                    }
                }
            }
        }
    }
}

@Composable
fun RouteSelectionContent(routes: List<RunRoute>, onRouteSelect: (RunRoute) -> Void) {
    Column(modifier = Modifier.padding(bottom = 32.dp)) {
        Text(
            text = "추천 루트 ${routes.size}개",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
        )
        routes.forEach { route ->
            RouteCard(route = route, onClick = { onRouteSelect(route) })
            Spacer(Modifier.height(8.dp))
        }
    }
}

@Composable
fun RouteCard(route: RunRoute, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        shape = RoundedCornerShape(16.dp),
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Column {
                    Text(text = route.terrainEmojis.ifEmpty { "🏃 러닝 루트" }, style = MaterialTheme.typography.titleMedium)
                    Text(text = route.description ?: "${String.format("%.1f", route.distanceKm)}km 코스", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                route.totalScore?.let { score ->
                    Surface(color = if (score >= 80) Color(0xFF22C55E).copy(0.15f) else Color(0xFFF59E0B).copy(0.15f), shape = RoundedCornerShape(20.dp)) {
                        Text("${score.toInt()}점", modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp), style = MaterialTheme.typography.labelMedium, color = if (score >= 80) Color(0xFF16A34A) else Color(0xFFD97706), fontWeight = FontWeight.Bold)
                    }
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                StatChip("📏", "${String.format("%.1f", route.distanceKm)}km")
                StatChip("⏱️", "${route.estimatedMinutes}분")
                StatChip("⛰️", "${route.elevationGainM.toInt()}m")
                StatChip("🛡️", "${route.safetyScore.toInt()}점")
            }
        }
    }
}

@Composable
fun StatChip(emoji: String, value: String) {
    Text(text = "$emoji $value", style = MaterialTheme.typography.bodySmall)
}
