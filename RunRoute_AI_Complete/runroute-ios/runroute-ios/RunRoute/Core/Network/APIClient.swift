// APIClient.swift
// RunRoute iOS - 네트워크 레이어

import Foundation
import Combine

// MARK: - API Error
enum APIError: LocalizedError {
    case invalidURL
    case unauthorized
    case notFound
    case serverError(Int, String)
    case decodingError
    case networkError(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL:         return "잘못된 URL입니다."
        case .unauthorized:       return "로그인이 필요합니다."
        case .notFound:           return "요청한 정보를 찾을 수 없습니다."
        case .serverError(_, let msg): return msg
        case .decodingError:      return "데이터 처리 중 오류가 발생했습니다."
        case .networkError(let e): return e.localizedDescription
        }
    }
}

// MARK: - API Client
final class APIClient {
    static let shared = APIClient()

    private let baseURL = "https://api.runroute.app/api/v1" // 실제 서버 URL로 변경
    private let session: URLSession
    private let decoder: JSONDecoder

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: config)
        self.decoder = JSONDecoder()
        self.decoder.keyDecodingStrategy = .convertFromSnakeCase
        self.decoder.dateDecodingStrategy = .iso8601
    }

    // MARK: - Core Request
    func request<T: Decodable>(_ endpoint: Endpoint) async throws -> T {
        guard let url = URL(string: baseURL + endpoint.path) else {
            throw APIError.invalidURL
        }

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = endpoint.method.rawValue
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // JWT 토큰 첨부
        if let token = TokenStorage.shared.accessToken {
            urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body = endpoint.body {
            urlRequest.httpBody = try? JSONSerialization.data(withJSONObject: body)
        }

        do {
            let (data, response) = try await session.data(for: urlRequest)
            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.networkError(URLError(.badServerResponse))
            }

            switch httpResponse.statusCode {
            case 200...299:
                do {
                    return try decoder.decode(T.self, from: data)
                } catch {
                    throw APIError.decodingError
                }
            case 401:
                // 토큰 만료 시 갱신 시도
                try await refreshTokenAndRetry()
                return try await request(endpoint)
            case 403:
                throw APIError.unauthorized
            case 404:
                throw APIError.notFound
            default:
                let message = (try? decoder.decode(ErrorResponse.self, from: data))?.message ?? "서버 오류"
                throw APIError.serverError(httpResponse.statusCode, message)
            }
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.networkError(error)
        }
    }

    private func refreshTokenAndRetry() async throws {
        guard let refreshToken = TokenStorage.shared.refreshToken else {
            throw APIError.unauthorized
        }
        let response: RefreshTokenResponse = try await request(
            .refreshToken(refreshToken: refreshToken)
        )
        TokenStorage.shared.accessToken = response.accessToken
    }
}

// MARK: - HTTP Method
enum HTTPMethod: String {
    case GET, POST, PUT, PATCH, DELETE
}

// MARK: - Endpoints
enum Endpoint {
    // Auth
    case login(email: String, password: String)
    case register(email: String, password: String, name: String)
    case socialLogin(provider: String, token: String)
    case refreshToken(refreshToken: String)
    case logout

    // Routes
    case recommendRoutes(lat: Double, lng: Double, distanceKm: Double,
                         terrains: [String], difficulty: String, naturalQuery: String?)
    case getRoute(id: String)
    case startNavigation(routeId: String, deviceType: String)
    case completeRun(sessionId: String, distanceKm: Double, durationSeconds: Int,
                     avgPace: Double?, avgHR: Int?, calories: Int?)
    case rateRoute(routeId: String, rating: Int, tags: [String])
    case saveRoute(routeId: String, nickname: String?)
    case nearbyRoutes(lat: Double, lng: Double, radiusKm: Double)

    // Users
    case myProfile
    case updateProfile(name: String?, imageUrl: String?)
    case myHistory(page: Int, limit: Int)
    case myStats
    case savedRoutes

    var path: String {
        switch self {
        case .login:                        return "/auth/login"
        case .register:                     return "/auth/register"
        case .socialLogin:                  return "/auth/social"
        case .refreshToken:                 return "/auth/refresh"
        case .logout:                       return "/auth/logout"
        case .recommendRoutes:              return "/routes/recommend"
        case .getRoute(let id):             return "/routes/\(id)"
        case .startNavigation(let id, _):   return "/routes/\(id)/start"
        case .completeRun(let sid, _,_,_,_,_): return "/routes/sessions/\(sid)/complete"
        case .rateRoute(let id, _,_):       return "/routes/\(id)/rate"
        case .saveRoute(let id, _):         return "/routes/\(id)/save"
        case .nearbyRoutes:                 return "/routes/nearby"
        case .myProfile:                    return "/users/me"
        case .updateProfile:                return "/users/me"
        case .myHistory:                    return "/users/history"
        case .myStats:                      return "/users/stats"
        case .savedRoutes:                  return "/users/saved-routes"
        }
    }

    var method: HTTPMethod {
        switch self {
        case .login, .register, .socialLogin, .startNavigation, .rateRoute, .saveRoute:
            return .POST
        case .logout, .completeRun:
            return .POST
        case .refreshToken:
            return .POST
        case .updateProfile:
            return .PATCH
        default:
            return .GET
        }
    }

    var body: [String: Any]? {
        switch self {
        case .login(let email, let password):
            return ["email": email, "password": password]
        case .register(let email, let password, let name):
            return ["email": email, "password": password, "name": name]
        case .socialLogin(let provider, let token):
            return ["provider": provider, "token": token]
        case .refreshToken(let token):
            return ["refreshToken": token]
        case let .recommendRoutes(lat, lng, dist, terrains, diff, query):
            var body: [String: Any] = ["lat": lat, "lng": lng, "distanceKm": dist,
                                       "preferences": terrains, "difficulty": diff]
            if let q = query { body["naturalQuery"] = q }
            return body
        case let .startNavigation(_, deviceType):
            return ["deviceType": deviceType]
        case let .completeRun(_, dist, dur, pace, hr, cal):
            var body: [String: Any] = ["actualDistanceKm": dist, "durationSeconds": dur]
            if let p = pace { body["avgPaceSecPerKm"] = p }
            if let h = hr { body["avgHeartRate"] = h }
            if let c = cal { body["calories"] = c }
            return body
        case let .rateRoute(_, rating, tags):
            return ["rating": rating, "feedbackTags": tags]
        case let .saveRoute(_, nickname):
            return nickname.map { ["nickname": $0] } ?? [:]
        default:
            return nil
        }
    }
}

// MARK: - Token Storage
final class TokenStorage {
    static let shared = TokenStorage()
    private let keychain = UserDefaults.standard // 실제론 Keychain 사용

    var accessToken: String? {
        get { keychain.string(forKey: "access_token") }
        set { keychain.set(newValue, forKey: "access_token") }
    }

    var refreshToken: String? {
        get { keychain.string(forKey: "refresh_token") }
        set { keychain.set(newValue, forKey: "refresh_token") }
    }

    func clear() {
        accessToken = nil
        refreshToken = nil
    }
}

// MARK: - Response Models
struct RefreshTokenResponse: Decodable {
    let accessToken: String
}

struct ErrorResponse: Decodable {
    let message: String
}
