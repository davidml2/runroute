// ViewModels.swift
import Foundation

// MARK: - Auth ViewModel
@MainActor
final class AuthViewModel: ObservableObject {
    @Published var isLoggedIn = false
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var email = ""
    @Published var password = ""
    @Published var name = ""

    private let api = APIClient.shared

    func login() async {
        guard !email.isEmpty, !password.isEmpty else {
            errorMessage = "이메일과 비밀번호를 입력해주세요."
            return
        }
        isLoading = true
        do {
            let response: AuthResponse = try await api.request(.login(email: email, password: password))
            TokenStorage.shared.accessToken = response.accessToken
            TokenStorage.shared.refreshToken = response.refreshToken
            isLoggedIn = true
        } catch {
            errorMessage = (error as? APIError)?.errorDescription ?? "로그인에 실패했습니다."
        }
        isLoading = false
    }

    func register() async {
        guard !email.isEmpty, !password.isEmpty, !name.isEmpty else {
            errorMessage = "모든 항목을 입력해주세요."
            return
        }
        isLoading = true
        do {
            let response: AuthResponse = try await api.request(.register(email: email, password: password, name: name))
            TokenStorage.shared.accessToken = response.accessToken
            TokenStorage.shared.refreshToken = response.refreshToken
            isLoggedIn = true
        } catch {
            errorMessage = (error as? APIError)?.errorDescription ?? "회원가입에 실패했습니다."
        }
        isLoading = false
    }

    func logout() {
        TokenStorage.shared.clear()
        isLoggedIn = false
    }
}

// MARK: - Profile ViewModel
@MainActor
final class ProfileViewModel: ObservableObject {
    @Published var user: User?
    @Published var stats: UserStats?
    @Published var records: [RunningRecord] = []
    @Published var isLoading = false

    private let api = APIClient.shared

    func loadProfile() async {
        isLoading = true
        async let userResult: User = api.request(.myProfile)
        async let statsResult: UserStats = api.request(.myStats)
        do {
            user = try await userResult
            stats = try await statsResult
        } catch { }
        isLoading = false
    }

    func loadHistory() async {
        do {
            let response = try await api.request(.myHistory(page: 1, limit: 20)) as HistoryResponse
            records = response.records
        } catch { }
    }
}

struct HistoryResponse: Decodable {
    let records: [RunningRecord]
    let total: Int
}

// MARK: - Route Detail ViewModel
@MainActor
final class RouteDetailViewModel: ObservableObject {
    @Published var isSaved = false
    @Published var isLoading = false
    @Published var navigationStarted = false
    @Published var sessionId: String?

    let route: RunRoute
    private let api = APIClient.shared

    init(route: RunRoute) { self.route = route }

    func startNavigation() async {
        isLoading = true
        do {
            let response = try await api.request(.startNavigation(routeId: route.id, deviceType: "mobile")) as NavigationSession
            sessionId = response.id
            navigationStarted = true
        } catch { }
        isLoading = false
    }

    func saveRoute() async {
        do {
            _ = try await api.request(.saveRoute(routeId: route.id, nickname: nil)) as [String: String]
            isSaved = true
        } catch { }
    }
}
