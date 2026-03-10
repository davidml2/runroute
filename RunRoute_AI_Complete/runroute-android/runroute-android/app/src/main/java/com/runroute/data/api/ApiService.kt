// ApiService.kt
package com.runroute.app.data.api

import com.google.gson.annotations.SerializedName
import retrofit2.http.*

// ── Request DTOs ───────────────────────────────────────────────
data class LoginRequest(val email: String, val password: String)
data class RegisterRequest(val email: String, val password: String, val name: String)
data class SocialLoginRequest(val provider: String, val token: String)
data class RefreshTokenRequest(val refreshToken: String)
data class RecommendRequest(
    val lat: Double,
    val lng: Double,
    @SerializedName("distanceKm") val distanceKm: Double,
    @SerializedName("preferences") val terrains: List<String>,
    val difficulty: String,
    @SerializedName("naturalQuery") val naturalQuery: String? = null,
)
data class StartNavigationRequest(@SerializedName("deviceType") val deviceType: String)
data class CompleteRunRequest(
    @SerializedName("actualDistanceKm") val actualDistanceKm: Double,
    @SerializedName("durationSeconds") val durationSeconds: Int,
    @SerializedName("avgPaceSecPerKm") val avgPaceSecPerKm: Double? = null,
    @SerializedName("avgHeartRate") val avgHeartRate: Int? = null,
    val calories: Int? = null,
)
data class RateRouteRequest(val rating: Int, val feedbackTags: List<String>)

// ── Retrofit Interface ─────────────────────────────────────────
interface ApiService {

    // Auth
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): AuthApiResponse

    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): AuthApiResponse

    @POST("auth/social")
    suspend fun socialLogin(@Body request: SocialLoginRequest): AuthApiResponse

    @POST("auth/refresh")
    suspend fun refreshToken(@Body request: RefreshTokenRequest): RefreshResponse

    @POST("auth/logout")
    suspend fun logout()

    @GET("auth/me")
    suspend fun getMe(): UserApiModel

    // Routes
    @POST("routes/recommend")
    suspend fun recommendRoutes(@Body request: RecommendRequest): RecommendApiResponse

    @GET("routes/{id}")
    suspend fun getRoute(@Path("id") id: String): RouteApiModel

    @POST("routes/{id}/start")
    suspend fun startNavigation(
        @Path("id") id: String,
        @Body request: StartNavigationRequest,
    ): NavigationSessionApiModel

    @PATCH("routes/sessions/{sessionId}/complete")
    suspend fun completeRun(
        @Path("sessionId") sessionId: String,
        @Body request: CompleteRunRequest,
    ): Map<String, Any>

    @POST("routes/{id}/rate")
    suspend fun rateRoute(
        @Path("id") id: String,
        @Body request: RateRouteRequest,
    ): Map<String, String>

    @POST("routes/{id}/save")
    suspend fun saveRoute(@Path("id") id: String): Map<String, String>

    @GET("routes/nearby")
    suspend fun getNearbyRoutes(
        @Query("lat") lat: Double,
        @Query("lng") lng: Double,
        @Query("radiusKm") radiusKm: Double = 5.0,
    ): NearbyRoutesResponse

    // Users
    @GET("users/me")
    suspend fun getProfile(): UserApiModel

    @GET("users/history")
    suspend fun getHistory(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
    ): HistoryApiResponse

    @GET("users/stats")
    suspend fun getStats(): StatsApiModel
}

// ── API Response Models ────────────────────────────────────────
data class AuthApiResponse(
    @SerializedName("accessToken") val accessToken: String,
    @SerializedName("refreshToken") val refreshToken: String,
    val user: UserApiModel,
)

data class RefreshResponse(@SerializedName("accessToken") val accessToken: String)

data class UserApiModel(
    val id: String,
    val email: String,
    val name: String,
    @SerializedName("profileImageUrl") val profileImageUrl: String?,
    val plan: String,
    @SerializedName("totalRuns") val totalRuns: Int,
    @SerializedName("totalDistanceKm") val totalDistanceKm: Double,
    val preferences: PreferencesApiModel?,
)

data class PreferencesApiModel(
    @SerializedName("preferredTerrains") val preferredTerrains: List<String>,
    @SerializedName("defaultDistance") val defaultDistance: Double,
    val difficulty: String,
    val unit: String,
)

data class RouteApiModel(
    val id: String,
    val geojson: GeoJsonApi,
    @SerializedName("distanceKm") val distanceKm: Double,
    @SerializedName("estimatedMinutes") val estimatedMinutes: Int,
    @SerializedName("elevationGainM") val elevationGainM: Double,
    @SerializedName("safetyScore") val safetyScore: Double,
    @SerializedName("sceneryScore") val sceneryScore: Double,
    @SerializedName("totalScore") val totalScore: Double?,
    @SerializedName("terrainTags") val terrainTags: List<String>,
    val pois: List<PoiApiModel>?,
    val description: String?,
)

data class GeoJsonApi(val type: String, val geometry: GeometryApi, val properties: Map<String, String>?)
data class GeometryApi(val type: String, val coordinates: List<List<Double>>)
data class PoiApiModel(val name: String, val type: String, val lat: Double, val lng: Double, val rating: Double?)

data class RecommendApiResponse(
    val routes: List<RouteApiModel>,
    val metadata: Map<String, Any>?,
)

data class NearbyRoutesResponse(val routes: List<RouteApiModel>)

data class NavigationSessionApiModel(
    val id: String,
    val route: RouteApiModel,
    @SerializedName("navigationData") val navigationData: NavigationDataApi,
)

data class NavigationDataApi(
    val waypoints: List<List<Double>>,
    @SerializedName("totalDistanceKm") val totalDistanceKm: Double,
    @SerializedName("estimatedMinutes") val estimatedMinutes: Int,
)

data class HistoryApiResponse(
    val records: List<RunningRecordApiModel>,
    val total: Int,
)

data class RunningRecordApiModel(
    val id: String,
    val route: RouteApiModel?,
    @SerializedName("startedAt") val startedAt: String,
    @SerializedName("completedAt") val completedAt: String?,
    @SerializedName("actualDistanceKm") val actualDistanceKm: Double,
    @SerializedName("durationSeconds") val durationSeconds: Int?,
    @SerializedName("avgPaceSecPerKm") val avgPaceSecPerKm: Double?,
    @SerializedName("avgHeartRate") val avgHeartRate: Int?,
    val calories: Int?,
    @SerializedName("deviceType") val deviceType: String,
)

data class StatsApiModel(
    @SerializedName("totalRuns") val totalRuns: Int,
    @SerializedName("totalDistanceKm") val totalDistanceKm: Double,
    @SerializedName("avgDistanceKm") val avgDistanceKm: Double,
)
