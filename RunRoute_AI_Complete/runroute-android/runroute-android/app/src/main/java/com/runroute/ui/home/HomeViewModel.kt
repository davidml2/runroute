// HomeViewModel.kt
package com.runroute.app.ui.home

import android.location.Geocoder
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.android.gms.location.FusedLocationProviderClient
import com.runroute.app.data.repository.Result
import com.runroute.app.data.repository.RouteRepository
import com.runroute.app.domain.model.RunRoute
import com.runroute.app.domain.model.TerrainType
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

// ── UI State ──────────────────────────────────────────────────
data class HomeUiState(
    val routes: List<RunRoute> = emptyList(),
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val selectedDistance: Float = 5f,
    val selectedTerrains: List<String> = emptyList(),
    val selectedDifficulty: String = "moderate",
    val naturalQuery: String = "",
    val useNaturalInput: Boolean = false,
    val cityName: String = "현재 위치",
    val currentLat: Double = 37.5665,
    val currentLng: Double = 126.9780,
    val showRouteSheet: Boolean = false,
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val routeRepository: RouteRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    // ── 위치 업데이트 ───────────────────────────────────────────
    fun updateLocation(lat: Double, lng: Double) {
        _uiState.update { it.copy(currentLat = lat, currentLng = lng) }
    }

    fun updateCityName(name: String) {
        _uiState.update { it.copy(cityName = name) }
    }

    // ── 입력 변경 ───────────────────────────────────────────────
    fun onDistanceChange(distance: Float) {
        _uiState.update { it.copy(selectedDistance = distance) }
    }

    fun toggleTerrain(terrainId: String) {
        val current = _uiState.value.selectedTerrains.toMutableList()
        if (current.contains(terrainId)) current.remove(terrainId)
        else current.add(terrainId)
        _uiState.update { it.copy(selectedTerrains = current) }
    }

    fun onDifficultyChange(difficulty: String) {
        _uiState.update { it.copy(selectedDifficulty = difficulty) }
    }

    fun onNaturalQueryChange(query: String) {
        _uiState.update { it.copy(naturalQuery = query) }
    }

    fun toggleInputMode() {
        _uiState.update { it.copy(useNaturalInput = !it.useNaturalInput) }
    }

    fun dismissError() {
        _uiState.update { it.copy(errorMessage = null) }
    }

    fun dismissRouteSheet() {
        _uiState.update { it.copy(showRouteSheet = false) }
    }

    // ── 루트 추천 ───────────────────────────────────────────────
    fun recommendRoutes() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }

            val state = _uiState.value
            val result = routeRepository.recommendRoutes(
                lat = state.currentLat,
                lng = state.currentLng,
                distanceKm = state.selectedDistance.toDouble(),
                terrains = state.selectedTerrains,
                difficulty = state.selectedDifficulty,
                naturalQuery = if (state.naturalQuery.isBlank()) null else state.naturalQuery,
            )

            when (result) {
                is Result.Success -> _uiState.update {
                    it.copy(
                        routes = result.data,
                        isLoading = false,
                        showRouteSheet = result.data.isNotEmpty(),
                    )
                }
                is Result.Error -> _uiState.update {
                    it.copy(isLoading = false, errorMessage = result.message)
                }
                else -> {}
            }
        }
    }

    val distanceLabel: String
        get() = String.format("%.1f km", _uiState.value.selectedDistance)
}
