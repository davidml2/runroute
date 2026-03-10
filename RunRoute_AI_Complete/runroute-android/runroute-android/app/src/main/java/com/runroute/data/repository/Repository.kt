// RouteRepository.kt
package com.runroute.app.data.repository

import com.runroute.app.data.api.*
import com.runroute.app.domain.model.*
import javax.inject.Inject
import javax.inject.Singleton

// ── Result Wrapper ────────────────────────────────────────────
sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Error(val message: String) : Result<Nothing>()
    object Loading : Result<Nothing>()
}

// ── Mapper Extensions ─────────────────────────────────────────
fun RouteApiModel.toDomain() = RunRoute(
    id = id, distanceKm = distanceKm, estimatedMinutes = estimatedMinutes,
    elevationGainM = elevationGainM, safetyScore = safetyScore,
    sceneryScore = sceneryScore, totalScore = totalScore,
    terrainTags = terrainTags, description = description,
    pois = pois?.map { PointOfInterest(it.name, it.type, it.lat, it.lng, it.rating) },
    geojson = GeoJsonFeature(geojson.type,
        GeoJsonGeometry(geojson.geometry.type, geojson.geometry.coordinates),
        geojson.properties),
)

fun UserApiModel.toDomain() = User(
    id = id, email = email, name = name, profileImageUrl = profileImageUrl,
    plan = plan, totalRuns = totalRuns, totalDistanceKm = totalDistanceKm,
    preferences = preferences?.let {
        UserPreferences(it.preferredTerrains, it.defaultDistance, it.difficulty, it.unit)
    },
)

fun RunningRecordApiModel.toDomain() = RunningRecord(
    id = id, startedAt = startedAt, completedAt = completedAt,
    actualDistanceKm = actualDistanceKm, durationSeconds = durationSeconds,
    avgPaceSecPerKm = avgPaceSecPerKm, avgHeartRate = avgHeartRate,
    calories = calories, deviceType = deviceType,
    route = route?.toDomain(),
)

// ── Route Repository ──────────────────────────────────────────
@Singleton
class RouteRepository @Inject constructor(private val api: ApiService) {

    suspend fun recommendRoutes(
        lat: Double, lng: Double, distanceKm: Double,
        terrains: List<String>, difficulty: String, naturalQuery: String?,
    ): Result<List<RunRoute>> = safeApiCall {
        api.recommendRoutes(RecommendRequest(lat, lng, distanceKm, terrains, difficulty, naturalQuery))
            .routes.map { it.toDomain() }
    }

    suspend fun getRoute(id: String): Result<RunRoute> = safeApiCall {
        api.getRoute(id).toDomain()
    }

    suspend fun startNavigation(routeId: String): Result<NavigationSession> = safeApiCall {
        val response = api.startNavigation(routeId, StartNavigationRequest("mobile"))
        NavigationSession(
            id = response.id,
            route = response.route.toDomain(),
            navigationData = NavigationData(
                response.navigationData.waypoints,
                response.navigationData.totalDistanceKm,
                response.navigationData.estimatedMinutes,
            ),
        )
    }

    suspend fun completeRun(
        sessionId: String, distanceKm: Double, durationSeconds: Int,
        avgPace: Double?, avgHR: Int?, calories: Int?,
    ): Result<Unit> = safeApiCall {
        api.completeRun(sessionId, CompleteRunRequest(distanceKm, durationSeconds, avgPace, avgHR, calories))
        Unit
    }

    suspend fun rateRoute(routeId: String, rating: Int, tags: List<String>): Result<Unit> = safeApiCall {
        api.rateRoute(routeId, RateRouteRequest(rating, tags))
        Unit
    }

    suspend fun saveRoute(routeId: String): Result<Unit> = safeApiCall {
        api.saveRoute(routeId)
        Unit
    }

    suspend fun getNearbyRoutes(lat: Double, lng: Double): Result<List<RunRoute>> = safeApiCall {
        api.getNearbyRoutes(lat, lng).routes.map { it.toDomain() }
    }
}

// ── Auth Repository ────────────────────────────────────────────
@Singleton
class AuthRepository @Inject constructor(
    private val api: ApiService,
    private val tokenManager: TokenManager,
) {
    suspend fun login(email: String, password: String): Result<User> = safeApiCall {
        val response = api.login(LoginRequest(email, password))
        tokenManager.saveTokens(response.accessToken, response.refreshToken)
        response.user.toDomain()
    }

    suspend fun register(email: String, password: String, name: String): Result<User> = safeApiCall {
        val response = api.register(RegisterRequest(email, password, name))
        tokenManager.saveTokens(response.accessToken, response.refreshToken)
        response.user.toDomain()
    }

    suspend fun logout() {
        try { api.logout() } catch (e: Exception) { /* 서버 오류 무시 */ }
        tokenManager.clearTokens()
    }

    fun isLoggedIn(): Boolean = tokenManager.getAccessTokenSync() != null
}

// ── User Repository ────────────────────────────────────────────
@Singleton
class UserRepository @Inject constructor(private val api: ApiService) {

    suspend fun getProfile(): Result<User> = safeApiCall { api.getProfile().toDomain() }

    suspend fun getHistory(): Result<List<RunningRecord>> = safeApiCall {
        api.getHistory().records.map { it.toDomain() }
    }

    suspend fun getStats(): Result<UserStats> = safeApiCall {
        val s = api.getStats()
        UserStats(s.totalRuns, s.totalDistanceKm, s.avgDistanceKm)
    }
}

// ── Safe API Call Helper ──────────────────────────────────────
private suspend fun <T> safeApiCall(call: suspend () -> T): Result<T> = try {
    Result.Success(call())
} catch (e: retrofit2.HttpException) {
    val message = when (e.code()) {
        401 -> "로그인이 필요합니다."
        403 -> "접근 권한이 없습니다."
        404 -> "요청한 정보를 찾을 수 없습니다."
        else -> "서버 오류 (${e.code()})"
    }
    Result.Error(message)
} catch (e: Exception) {
    Result.Error(e.message ?: "알 수 없는 오류")
}
