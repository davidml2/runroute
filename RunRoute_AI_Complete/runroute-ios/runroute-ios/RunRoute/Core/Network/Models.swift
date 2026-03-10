// Models.swift
// RunRoute iOS - 도메인 모델

import Foundation
import CoreLocation
import MapKit

// MARK: - User
struct User: Codable, Identifiable {
    let id: String
    let email: String
    let name: String
    let profileImageUrl: String?
    let plan: String
    let planExpiresAt: Date?
    let totalRuns: Int
    let totalDistanceKm: Double
    let preferences: UserPreferences?
    let createdAt: Date?
}

struct UserPreferences: Codable {
    var preferredTerrains: [String]
    var defaultDistance: Double
    var difficulty: String
    var unit: String
    var language: String
}

// MARK: - Route
struct RunRoute: Codable, Identifiable {
    let id: String
    let geojson: GeoJsonFeature
    let distanceKm: Double
    let estimatedMinutes: Int
    let elevationGainM: Double
    let safetyScore: Double
    let sceneryScore: Double
    let totalScore: Double?
    let terrainTags: [String]
    let pois: [PointOfInterest]?
    let description: String?

    var coordinateList: [CLLocationCoordinate2D] {
        geojson.geometry.coordinates.compactMap { coord in
            guard coord.count >= 2 else { return nil }
            return CLLocationCoordinate2D(latitude: coord[1], longitude: coord[0])
        }
    }

    var terrainEmojis: String {
        let map = ["park": "🌳", "riverside": "🏞️", "urban": "🏙️",
                   "mountain": "⛰️", "beach": "🏖️"]
        return terrainTags.compactMap { map[$0] }.joined(separator: " ")
    }

    var difficultyLabel: String {
        if elevationGainM / distanceKm < 5 { return "쉬움" }
        if elevationGainM / distanceKm < 15 { return "보통" }
        return "어려움"
    }
}

struct GeoJsonFeature: Codable {
    let type: String
    let geometry: GeoJsonGeometry
    let properties: [String: String]?
}

struct GeoJsonGeometry: Codable {
    let type: String
    let coordinates: [[Double]]
}

struct PointOfInterest: Codable, Identifiable {
    var id: String { name }
    let name: String
    let type: String
    let lat: Double
    let lng: Double
    let rating: Double?
}

// MARK: - Recommendation Response
struct RecommendResponse: Codable {
    let routes: [RunRoute]
    let metadata: RecommendMetadata?
}

struct RecommendMetadata: Codable {
    let location: LocationData?
    let requestedDistanceKm: Double?
    let generatedAt: String?
}

struct LocationData: Codable {
    let lat: Double
    let lng: Double
}

// MARK: - Navigation
struct NavigationSession: Codable, Identifiable {
    let id: String  // sessionId
    let route: RunRoute
    let navigationData: NavigationData
}

struct NavigationData: Codable {
    let waypoints: [[Double]]
    let totalDistanceKm: Double
    let estimatedMinutes: Int
}

struct NavigationUpdate {
    let currentPos: CLLocationCoordinate2D
    let nextTurn: TurnInstruction
    let progressKm: Double
    let totalKm: Double
}

struct TurnInstruction {
    let direction: String  // "straight" | "left" | "right" | "arrive"
    let distanceM: Double
    let instruction: String
}

// MARK: - Running Record
struct RunningRecord: Codable, Identifiable {
    let id: String
    let route: RunRoute?
    let startedAt: Date
    let completedAt: Date?
    let actualDistanceKm: Double
    let durationSeconds: Int?
    let avgPaceSecPerKm: Double?
    let avgHeartRate: Int?
    let calories: Int?
    let deviceType: String

    var formattedPace: String {
        guard let pace = avgPaceSecPerKm else { return "--'--\"" }
        let min = Int(pace) / 60
        let sec = Int(pace) % 60
        return "\(min)'\(String(format: "%02d", sec))\""
    }

    var formattedDuration: String {
        guard let dur = durationSeconds else { return "--:--" }
        let h = dur / 3600
        let m = (dur % 3600) / 60
        let s = dur % 60
        if h > 0 { return String(format: "%d:%02d:%02d", h, m, s) }
        return String(format: "%02d:%02d", m, s)
    }
}

// MARK: - Auth
struct AuthResponse: Codable {
    let accessToken: String
    let refreshToken: String
    let user: User
}

struct UserStats: Codable {
    let totalRuns: Int
    let totalDistanceKm: Double
    let avgDistanceKm: Double
}
