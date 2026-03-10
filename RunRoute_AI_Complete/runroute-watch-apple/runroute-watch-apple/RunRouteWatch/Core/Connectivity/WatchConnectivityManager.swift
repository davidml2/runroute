// WatchConnectivityManager.swift
// iPhone ↔ Apple Watch 양방향 통신

import WatchConnectivity
import Combine

// MARK: - 메시지 키 상수
enum WCMessageKey {
    static let type            = "type"
    static let routes          = "routes"
    static let sessionId       = "sessionId"
    static let routeId         = "routeId"
    static let accessToken     = "accessToken"
    static let locationUpdate  = "locationUpdate"
    static let navUpdate       = "navUpdate"
    static let completeRun     = "completeRun"
}

enum WCMessageType: String {
    case routesReady       = "routes_ready"       // iPhone → Watch: 추천 루트
    case tokenSync         = "token_sync"          // iPhone → Watch: 토큰 동기리
    case navUpdate         = "nav_update"           // iPhone → Watch: 내비 업데이트
    case requestRoutes     = "request_routes"       // Watch → iPhone: 추천 요청
    case startNavigation   = "start_navigation"     // Watch → iPhone: 내비 시작
    case locationUpdate    = "location_update"      // Watch → iPhone: 위치
    case runCompleted      = "run_completed"        // Watch → iPhone: 완료
}

final class WatchConnectivityManager: NSObject, ObservableObject {
    static let shared = WatchConnectivityManager()

    @Published var receivedRoutes: [WatchRoute] = []
    @Published var isPhoneReachable: Bool = false
    @Published var navInstruction: String = "직진"
    @Published var isConnected: Bool = false

    var onRoutesReceived: (([WatchRoute]) -> Void)?
    var onNavUpdate: ((String, Double) -> Void)?
    var onTokenReceived: ((String) -> Void)?

    override init() {
        super.init()
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    // ── Watch → iPhone 메시지 전송 ──────────────────────────
    func requestRoutes(lat: Double, lng: Double, distanceKm: Double, terrains: [String]) {
        send([
            WCMessageKey.type: WCMessageType.requestRoutes.rawValue,
            "lat": lat, "lng": lng,
            "distanceKm": distanceKm,
            "terrains": terrains,
        ])
    }

    func sendLocationUpdate(lat: Double, lng: Double, sessionId: String) {
        send([
            WCMessageKey.type: WCMessageType.locationUpdate.rawValue,
            WCMessageKey.sessionId: sessionId,
            "lat": lat, "lng": lng,
            "timestamp": Date().timeIntervalSince1970,
        ])
    }

    func sendRunCompleted(sessionId: String, distanceKm: Double,
                          durationSeconds: Int, avgPace: Double, avgHR: Int) {
        send([
            WCMessageKey.type: WCMessageType.runCompleted.rawValue,
            WCMessageKey.sessionId: sessionId,
            "distanceKm": distanceKm,
            "durationSeconds": durationSeconds,
            "avgPace": avgPace,
            "avgHR": avgHR,
        ])
    }

    // ── 내부 전송 ───────────────────────────────────────────
    private func send(_ message: [String: Any]) {
        guard WCSession.default.isReachable else {
            // 연결 안 됨 - 나중에 전송
            try? WCSession.default.updateApplicationContext(message)
            return
        }
        WCSession.default.sendMessage(message, replyHandler: nil, errorHandler: { error in
            print("WC 전송 오류: \(error.localizedDescription)")
        })
    }

    // ── 햅틱 피드백 ────────────────────────────────────────
    func haptic(_ type: WKHapticType) {
        WKInterfaceDevice.current().play(type)
    }
}

// MARK: - WCSessionDelegate
extension WatchConnectivityManager: WCSessionDelegate {
    func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {
        DispatchQueue.main.async {
            self.isConnected = state == .activated
            self.isPhoneReachable = session.isReachable
        }
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async {
            self.isPhoneReachable = session.isReachable
        }
    }

    // iPhone에서 받은 메시지 처리
    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        guard let typeStr = message[WCMessageKey.type] as? String,
              let type = WCMessageType(rawValue: typeStr) else { return }

        DispatchQueue.main.async {
            switch type {
            case .routesReady:
                if let data = message[WCMessageKey.routes] as? Data,
                   let routes = try? JSONDecoder().decode([WatchRoute].self, from: data) {
                    self.receivedRoutes = routes
                    self.onRoutesReceived?(routes)
                    self.haptic(.success)
                }
            case .tokenSync:
                if let token = message[WCMessageKey.accessToken] as? String {
                    WatchTokenStorage.shared.accessToken = token
                    self.onTokenReceived?(token)
                }
            case .navUpdate:
                let instruction = message["instruction"] as? String ?? "직진"
                let distance = message["distanceM"] as? Double ?? 0
                self.navInstruction = instruction
                self.onNavUpdate?(instruction, distance)
            default:
                break
            }
        }
    }

    func session(_ session: WCSession, didReceiveApplicationContext context: [String: Any]) {
        self.session(session, didReceiveMessage: context)
    }
}
