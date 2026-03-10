// HomeViewModelTest.kt
package com.runroute.app.ui.home

import app.cash.turbine.test
import com.runroute.app.data.repository.Result
import com.runroute.app.data.repository.RouteRepository
import com.runroute.app.domain.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.*
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.mockito.kotlin.*

@OptIn(ExperimentalCoroutinesApi::class)
class HomeViewModelTest {

    private val testDispatcher = UnconfinedTestDispatcher()
    private lateinit var vm: HomeViewModel
    private val routeRepo: RouteRepository = mock()

    private fun mockRoute(id: String = "r1") = RunRoute(
        id = id, distanceKm = 5.0, estimatedMinutes = 30,
        elevationGainM = 20.0, safetyScore = 80.0, sceneryScore = 75.0,
        totalScore = 78.0, terrainTags = listOf("park"), description = "공원 5km",
        pois = emptyList(), geojson = GeoJsonFeature("Feature",
            GeoJsonGeometry("LineString", listOf(listOf(126.97, 37.56))), null),
    )

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        vm = HomeViewModel(routeRepo)
    }

    @After
    fun tearDown() { Dispatchers.resetMain() }

    @Test
    fun `recommendRoutes - 성공 시 routes 업데이트`() = runTest {
        val routes = listOf(mockRoute("1"), mockRoute("2"), mockRoute("3"))
        whenever(routeRepo.recommendRoutes(any(), any(), any(), any(), any(), anyOrNull()))
            .thenReturn(Result.Success(routes))

        vm.uiState.test {
            val initial = awaitItem()
            assertFalse(initial.isLoading)
            assertTrue(initial.routes.isEmpty())

            vm.recommendRoutes()

            val loading = awaitItem()
            assertTrue(loading.isLoading)

            val result = awaitItem()
            assertFalse(result.isLoading)
            assertEquals(3, result.routes.size)
            assertTrue(result.showRouteSheet)
        }
    }

    @Test
    fun `recommendRoutes - 실패 시 errorMessage 설정`() = runTest {
        whenever(routeRepo.recommendRoutes(any(), any(), any(), any(), any(), anyOrNull()))
            .thenReturn(Result.Error("서버 오류"))

        vm.uiState.test {
            awaitItem() // initial

            vm.recommendRoutes()
            awaitItem() // loading
            val error = awaitItem()
            assertFalse(error.isLoading)
            assertEquals("서버 오류", error.errorMessage)
        }
    }

    @Test
    fun `toggleTerrain - 선택/해제 토글`() {
        vm.toggleTerrain("park")
        assertTrue(vm.uiState.value.selectedTerrains.contains("park"))

        vm.toggleTerrain("park")
        assertFalse(vm.uiState.value.selectedTerrains.contains("park"))
    }

    @Test
    fun `onDistanceChange - 거리 업데이트`() {
        vm.onDistanceChange(10f)
        assertEquals(10f, vm.uiState.value.selectedDistance)
    }
}
