// WearModels.kt
package com.runroute.wear.data

import com.google.android.gms.maps.model.LatLng
import kotlin.math.*

// ── Domain Models ─────────────────────────────────────────────
data class WearRoute(
    val id: String,
    val distanceKm: Double,
    val estimatedMinutes: Int,
    val elevationGainM: Double,
    val safetyScore: Double,
    val sceneryScore: Double,
    val totalScore: Double?,
    val terrainTags: List<String>,
    val description: String?,
    val coordinates: List<List<Double>>,
) {
    val latLngList: List<Pair<Double, Double>>
        get() = coordinates.mapNotNull { c ->
            if (c.size >= 2) Pair(c[1], c[0]) else null
        }

    val terrainEmoji: String
        get() = mapOf("park" to "🌳", "riverside" to "🏞️",
            "urban" to "🏙️", "mountain" to "⛰️", "beach" to "🏖️")
            .entries.firstOrNull { it.key in terrainTags }?.value ?: "🏃"
}

data class RunningState(
    val progressKm: Double = 0.0,
    val totalKm: Double = 0.0,
    val elapsedSeconds: Int = 0,
    val currentPaceSecPerKm: Double = 0.0,
    val heartRateBpm: Int = 0,
    val calories: Int = 0,
    val isOffRoute: Boolean = false,
    val nextInstruction: String = "직진",
) {
    val progressPercent: Float get() = (progressKm / totalKm.coerceAtLeast(1.0)).toFloat().coerceIn(0f, 1f)
    val remainingKm: Double get() = (totalKm - progressKm).coerceAtLeast(0.0)

    val formattedElapsed: String
        get() {
            val h = elapsedSeconds / 3600
            val m = (elapsedSeconds % 3600) / 60
            val s = elapsedSeconds % 60
            return if (h > 0) "$h:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}"
            else "${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}"
        }

    val formattedPace: String
        get() {
            if (currentPaceSecPerKm <= 0) return "--'--\""
            val min = currentPaceSecPerKm.toInt() / 60
            val sec = currentPaceSecPerKm.toInt() % 60
            return "$min'${sec.toString().padStart(2,'0')}\""
        }
}

// ── API Response DTOs ─────────────────────────────────────────
data class WearRecommendResponse(val routes: List<WearRouteDto>)

data class WearRouteDto(
    val id: String,
    val distanceKm: Double,
    val estimatedMinutes: Int,
    val elevationGainM: Double = 0.0,
    val safetyScore: Double = 70.0,
    val sceneryScore: Double = 65.0,
    val totalScore: Double? = null,
    val terrainTags: List<String> = emptyList(),
    val description: String? = null,
    val geojson: WearGeoJson? = null,
) {
    fun toDomain() = WearRoute(
        id = id, distanceKm = distanceKm, estimatedMinutes = estimatedMinutes,
        elevationGainM = elevationGainM, safetyScore = safetyScore,
        sceneryScore = sceneryScore, totalScore = totalScore,
        terrainTags = terrainTags, description = description,
        coordinates = geojson?.geometry?.coordinates ?: emptyList(),
    )
}

data class WearGeoJson(val type: String, val geometry: WearGeometry, val properties: Map<String, String>?)
data class WearGeometry(val type: String, val coordinates: List<List<Double>>)

data class WearNavSession(val id: String, val route: WearRouteDto)

// ── Haversine Distance ─────────────────────────────────────────
fun haversineMeters(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
    val R = 6371000.0
    val dLat = Math.toRadians(lat2 - lat1)
    val dLon = Math.toRadians(lon2 - lon1)
    val a = sin(dLat / 2).pow(2) + cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) * sin(dLon / 2).pow(2)
    return R * 2 * atan2(sqrt(a), sqrt(1 - a))
}
