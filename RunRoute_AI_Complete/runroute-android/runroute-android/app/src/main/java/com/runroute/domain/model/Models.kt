// Models.kt
package com.runroute.app.domain.model

import com.google.android.gms.maps.model.LatLng

// ── User ──────────────────────────────────────────────────────
data class User(
    val id: String,
    val email: String,
    val name: String,
    val profileImageUrl: String?,
    val plan: String,
    val totalRuns: Int,
    val totalDistanceKm: Double,
    val preferences: UserPreferences?,
)

data class UserPreferences(
    val preferredTerrains: List<String>,
    val defaultDistance: Double,
    val difficulty: String,
    val unit: String,
)

// ── Route ─────────────────────────────────────────────────────
data class RunRoute(
    val id: String,
    val geojson: GeoJsonFeature,
    val distanceKm: Double,
    val estimatedMinutes: Int,
    val elevationGainM: Double,
    val safetyScore: Double,
    val sceneryScore: Double,
    val totalScore: Double?,
    val terrainTags: List<String>,
    val pois: List<PointOfInterest>?,
    val description: String?,
) {
    val latLngList: List<LatLng>
        get() = geojson.geometry.coordinates.mapNotNull { coord ->
            if (coord.size >= 2) LatLng(coord[1], coord[0]) else null
        }

    val terrainEmojis: String
        get() {
            val map = mapOf("park" to "🌳", "riverside" to "🏞️",
                "urban" to "🏙️", "mountain" to "⛰️", "beach" to "🏖️")
            return terrainTags.mapNotNull { map[it] }.joinToString(" ")
        }

    val difficultyLabel: String
        get() = when {
            elevationGainM / distanceKm < 5 -> "쉬움"
            elevationGainM / distanceKm < 15 -> "보통"
            else -> "어려움"
        }
}

data class GeoJsonFeature(
    val type: String,
    val geometry: GeoJsonGeometry,
    val properties: Map<String, String>?,
)

data class GeoJsonGeometry(
    val type: String,
    val coordinates: List<List<Double>>,
)

data class PointOfInterest(
    val name: String,
    val type: String,
    val lat: Double,
    val lng: Double,
    val rating: Double?,
)

// ── Auth ──────────────────────────────────────────────────────
data class AuthResponse(
    val accessToken: String,
    val refreshToken: String,
    val user: User,
)

// ── Recommendation ────────────────────────────────────────────
data class RecommendResponse(
    val routes: List<RunRoute>,
    val metadata: RecommendMetadata?,
)

data class RecommendMetadata(
    val requestedDistanceKm: Double?,
    val generatedAt: String?,
)

// ── Running Record ────────────────────────────────────────────
data class RunningRecord(
    val id: String,
    val route: RunRoute?,
    val startedAt: String,
    val completedAt: String?,
    val actualDistanceKm: Double,
    val durationSeconds: Int?,
    val avgPaceSecPerKm: Double?,
    val avgHeartRate: Int?,
    val calories: Int?,
    val deviceType: String,
) {
    val formattedPace: String
        get() {
            val pace = avgPaceSecPerKm ?: return "--'--\""
            val min = pace.toInt() / 60
            val sec = pace.toInt() % 60
            return "$min'${sec.toString().padStart(2, '0')}\""
        }

    val formattedDuration: String
        get() {
            val dur = durationSeconds ?: return "--:--"
            val h = dur / 3600
            val m = (dur % 3600) / 60
            val s = dur % 60
            return if (h > 0) "$h:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}"
            else "${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}"
        }
}

// ── Navigation ─────────────────────────────────────────────────
data class NavigationSession(
    val id: String,
    val route: RunRoute,
    val navigationData: NavigationData,
)

data class NavigationData(
    val waypoints: List<List<Double>>,
    val totalDistanceKm: Double,
    val estimatedMinutes: Int,
)

data class UserStats(
    val totalRuns: Int,
    val totalDistanceKm: Double,
    val avgDistanceKm: Double,
)

sealed class TerrainType(val id: String, val label: String, val emoji: String) {
    object Park      : TerrainType("park",      "공원", "🌳")
    object Riverside : TerrainType("riverside", "강변", "🏞️")
    object Urban     : TerrainType("urban",     "도심", "🏙️")
    object Mountain  : TerrainType("mountain",  "산길", "⛰️")
    object Beach     : TerrainType("beach",     "해변", "🏖️")

    companion object {
        val all = listOf(Park, Riverside, Urban, Mountain, Beach)
    }
}
