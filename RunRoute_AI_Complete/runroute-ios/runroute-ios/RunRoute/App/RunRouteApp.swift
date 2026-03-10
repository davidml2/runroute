// RunRouteApp.swift
import SwiftUI

@main
struct RunRouteApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            if appState.isLoggedIn {
                MainTabView()
                    .environmentObject(appState)
            } else {
                AuthView()
                    .environmentObject(appState)
            }
        }
    }
}

// MARK: - App State
final class AppState: ObservableObject {
    @Published var isLoggedIn: Bool

    init() {
        isLoggedIn = TokenStorage.shared.accessToken != nil
        setupNotifications()
    }

    private func setupNotifications() {
        NotificationCenter.default.addObserver(forName: .userLoggedIn, object: nil, queue: .main) { [weak self] _ in
            self?.isLoggedIn = true
        }
        NotificationCenter.default.addObserver(forName: .userLoggedOut, object: nil, queue: .main) { [weak self] _ in
            self?.isLoggedIn = false
        }
    }
}

// MARK: - Main Tab View
struct MainTabView: View {
    var body: some View {
        TabView {
            HomeView()
                .tabItem {
                    Label("홈", systemImage: "map.fill")
                }

            HistoryView()
                .tabItem {
                    Label("기록", systemImage: "list.bullet.clipboard")
                }

            ProfileView()
                .tabItem {
                    Label("프로필", systemImage: "person.fill")
                }
        }
        .tint(.blue)
    }
}

// MARK: - History View
struct HistoryView: View {
    @StateObject private var vm = ProfileViewModel()

    var body: some View {
        NavigationStack {
            List {
                ForEach(vm.records) { record in
                    RecordRow(record: record)
                }
            }
            .navigationTitle("러닝 기록")
            .task { await vm.loadHistory() }
            .overlay {
                if vm.records.isEmpty && !vm.isLoading {
                    ContentUnavailableView("러닝 기록이 없습니다",
                        systemImage: "figure.run",
                        description: Text("첫 러닝을 시작해보세요!"))
                }
            }
        }
    }
}
