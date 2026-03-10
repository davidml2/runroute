// WearRepository.kt
package com.runroute.wear.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import retrofit2.http.*
import javax.inject.Inject
import javax.inject.Singleton

val Context.wearDataStore by preferencesDataStore("wear_auth")

// ── Retrofit Service ──────────────────────────────────────────
interface WearApiService {
    @POST("routes/recommend")
    suspend fun recommendRoutes(@Body body: Map<String, @JvmSuppressWildcards Any>): WearRecommendResponse

    @POST("routes/{id}/start")
    suspend fun startNavigation(@Path("id") id: String, @Body body: Map<String, String>): WearNavSession

    @PATCH("routes/sessions/{sid}/complete")
    suspend fun completeRun(@Path("sid") sid: String, @Body body: Map<String, @JvmSuppressWildcards Any>): Map<String, Any>
}

// ── Token Manager (Wear) ──────────────────────────────────────
@Singleton
class WearTokenManager @Inject constructor(@ApplicationContext private val ctx: Context) {
    companion object {
        val ACCESS_TOKEN = stringPreferencesKey("wear_access_token")
    }

    suspend fun getToken(): String? = ctx.wearDataStore.data.map { it[ACCESS_TOKEN] }.first()

    suspend fun saveToken(token: String) {
        ctx.wearDataStore.edit { it[ACCESS_TOKEN] = token }
    }
}

// ── Repository ────────────────────────────────────────────────
@Singleton
class WearRouteRepository @Inject constructor(private val api: WearApiService) {

    suspend fun recommendRoutes(
        lat: Double, lng: Double, distanceKm: Double,
        terrains: List<String>, difficulty: String,
    ): Result<List<WearRoute>> = safeCall {
        api.recommendRoutes(mapOf(
            "lat" to lat, "lng" to lng,
            "distanceKm" to distanceKm,
            "preferences" to terrains,
            "difficulty" to difficulty,
        )).routes.map { it.toDomain() }
    }

    suspend fun startNavigation(routeId: String): Result<WearNavSession> = safeCall {
        api.startNavigation(routeId, mapOf("deviceType" to "watch"))
    }

    suspend fun completeRun(
        sessionId: String, distanceKm: Double, durationSeconds: Int,
        avgPace: Double?, avgHR: Int?,
    ): Result<Unit> = safeCall {
        val body = mutableMapOf<String, Any>(
            "actualDistanceKm" to distanceKm,
            "durationSeconds" to durationSeconds,
            "deviceType" to "watch",
        )
        avgPace?.let { body["avgPaceSecPerKm"] = it }
        avgHR?.let { body["avgHeartRate"] = it }
        api.completeRun(sessionId, body)
        Unit
    }
}

sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Error(val message: String) : Result<Nothing>()
}

private suspend fun <T> safeCall(block: suspend () -> T): Result<T> = try {
    Result.Success(block())
} catch (e: Exception) {
    Result.Error(e.message ?: "오류 발생")
}
