// WatchModels.swift
// RunRoute Apple Watch - 워치 전용 모델 및 네트워크

import Foundation
import CoreLocation
import HealthKit

// MARK: - Watch Route Model
struct WatchRoute: Identifiable, Codable {
    let id: String
    let distanceKm: Double
    let estimatedMinutes: Int
    let elevationGainM: Double
    let safetyScore: Double
    let sceneryScore: Double
    let totalScore: Double?
    let terrainTags: [String]
    let description: String?
    let coordinates: [[Double]] // [[lng, lat], ...]

    var latLngList: [(lat: Double, lng: Double)] {
        coordinates.compactMap { c in
            guard c.count >= 2 else { return nil }
            return (lat: c[1], lng: c[0])
        }
    }

    var terrainEmoji: String {
        let map = ["park": "🌳", "riverside": "🏞️", "urban": "🏙️",
                   "mountain": "⛰️", "beach": "🏖️"]
        return terrainTags.compactMap { map[$0] }.first ?? "🏃"
    }

    var difficultyColor: String {
        switch elevationGainM / distanceKm {
        case ..<5:  return "green"
        case ..<15: return "orange"
        default:    return "red"
        }
    }
}

struct WatchRecommendResponse: Codable {
    let routes: [WatchRoute]
}

struct WatchNavSession: Codable {
    let sessionId: String
    let route: WatchRoute
}

// MARK: - Running State (워치 실행 중 상태)
struct RunningState {
    var progressKm: Double = 0
    var elapsedSeconds: Int = 0
    var currentPaceSecPerKm: Double = 0
    var heartRate: Int = 0
    var calories: Int = 0
    var isOffRoute: Bool = false
    var nextInstruction: String = "직진"
    var distanceToTurnM: Double = 0

    var progressPercent: Double { min(1.0, progressKm / max(1, totalKm)) }
    var totalKm: Double = 0

    var formattedElapsed: String {
        let h = elapsedSeconds / 3600
        let m = (elapsedSeconds % 3600) / 60
        let s = elapsedSeconds % 60
        if h > 0 { return String(format: "%d:%02d:%02d", h, m, s) }
        return String(format: "%02d:%02d", m, s)
    }

    var formattedPace: String {
        guard currentPaceSecPerKm > 0 else { return "--'--\"" }
        let min = Int(currentPaceSecPerKm) / 60
        let sec = Int(currentPaceSecPerKm) % 60
        return "\(min)'\(String(format: "%02d", sec))\""
    }
}

// MARK: - Watch API Client
final class WatchAPIClient {
    static let shared = WatchAPIClient()
    private let baseURL = "https://api.runroute.app/api/v1"
    private let session: URLSession
    private let decoder: JSONDecoder

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 20
        self.session = URLSession(configuration: config)
        self.decoder = JSONDecoder()
        self.decoder.keyDecodingStrategy = .convertFromSnakeCase
    }

    func recommendRoutes(lat: Double, lng: Double, distanceKm: Double,
                         terrains: [String]) async throws -> [WatchRoute] {
        let body: [String: Any] = [
            "lat": lat, "lng": lng,
            "distanceKm": distanceKm,
            "preferences": terrains,
            "difficulty": "moderate"
        ]
        let response: WatchRecommendResponse = try await post("/routes/recommend", body: body)
        return response.routes
    }

    func startNavigation(routeId: String) async throws -> WatchNavSession {
        return try await post("/routes/\(routeId)/start", body: ["deviceType": "watch"])
    }

    func completeRun(sessionId: String, distanceKm: Double,
                     durationSeconds: Int, avgPace: Double?, avgHR: Int?) async throws {
        var body: [String: Any] = [
            "actualDistanceKm": distanceKm,
            "durationSeconds": durationSeconds,
        ]
        if let p = avgPace { body["avgPaceSecPerKm"] = p }
        if let h = avgHR { body["avgHeartRate"] = h }
        body["deviceType"] = "watch"
        _ = try? await post("/routes/sessions/\(sessionId)/complete", body: body) as [String: String]
    }

    // MARK: - Generic POST
    private func post<T: Decodable>(_ path: String, body: [String: Any]) async throws -> T {
        guard let url = URL(string: baseURL + path) else { throw URLError(.badURL) }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = WatchTokenStorage.shared.accessToken {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, _) = try await session.data(for: req)
        return try decoder.decode(T.self, from: data)
    }
}

// MARK: - Token Storage (Watch Keychain)
final class WatchTokenStorage {
    static let shared = WatchTokenStorage()
    private let defaults = UserDefaults.standard

    var accessToken: String? {
        get { defaults.string(forKey: "watch_access_token") }
        set { defaults.set(newValue, forKey: "watch_access_token") }
    }
}
