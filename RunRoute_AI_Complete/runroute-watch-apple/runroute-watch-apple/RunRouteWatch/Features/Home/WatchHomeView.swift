// WatchHomeView.swift
// 워치 홈 - 거리 설정 및 루트 추천

import SwiftUI
import CoreLocation

// MARK: - Home ViewModel
@MainActor
final class WatchHomeViewModel: ObservableObject {
    @Published var routes: [WatchRoute] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var selectedDistance: Double = 5.0
    @Published var selectedTerrains: [String] = []
    @Published var currentLat: Double = 37.5665
    @Published var currentLng: Double = 126.9780
    @Published var phase: HomePhase = .configure

    enum HomePhase { case configure, loading, routeList, error }

    private let api = WatchAPIClient.shared
    private let wc = WatchConnectivityManager.shared
    private let location = WatchLocationManager.shared

    init() {
        setupLocationObserver()
        setupWCObserver()
    }

    private func setupLocationObserver() {
        location.onLocationUpdate = { [weak self] lat, lng in
            self?.currentLat = lat
            self?.currentLng = lng
        }
    }

    private func setupWCObserver() {
        wc.onRoutesReceived = { [weak self] routes in
            Task { @MainActor in
                self?.routes = routes
                self?.isLoading = false
                self?.phase = .routeList
            }
        }
    }

    var distanceLabel: String { String(format: "%.0f km", selectedDistance) }

    func increaseDistance() { selectedDistance = min(30, selectedDistance + 1) }
    func decreaseDistance() { selectedDistance = max(1, selectedDistance - 1) }

    func toggleTerrain(_ id: String) {
        if selectedTerrains.contains(id) { selectedTerrains.removeAll { $0 == id } }
        else { selectedTerrains.append(id) }
    }

    func recommendRoutes() {
        isLoading = true
        phase = .loading
        errorMessage = nil

        // iPhone 연결 가능 시 WatchConnectivity 사용, 아니면 직접 API 호출
        if wc.isPhoneReachable {
            wc.requestRoutes(lat: currentLat, lng: currentLng,
                             distanceKm: selectedDistance, terrains: selectedTerrains)
        } else {
            Task {
                do {
                    let result = try await api.recommendRoutes(
                        lat: currentLat, lng: currentLng,
                        distanceKm: selectedDistance, terrains: selectedTerrains
                    )
                    routes = result
                    phase = .routeList
                } catch {
                    errorMessage = "루트를 불러오지 못했어요"
                    phase = .error
                }
                isLoading = false
            }
        }
    }
}

// MARK: - Home View
struct WatchHomeView: View {
    @StateObject private var vm = WatchHomeViewModel()
    @State private var selectedRoute: WatchRoute?

    var body: some View {
        NavigationStack {
            switch vm.phase {
            case .configure:
                configureView
            case .loading:
                loadingView
            case .routeList:
                routeListView
            case .error:
                errorView
            }
        }
        .navigationDestination(item: $selectedRoute) { route in
            WatchNavigationView(route: route)
        }
    }

    // ── 설정 화면 ───────────────────────────────────────────
    private var configureView: some View {
        ScrollView {
            VStack(spacing: 10) {
                // 거리 설정
                VStack(spacing: 6) {
                    Text("목표 거리")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)

                    HStack(spacing: 12) {
                        Button { vm.decreaseDistance() } label: {
                            Image(systemName: "minus.circle.fill")
                                .font(.title2)
                                .foregroundStyle(.blue)
                        }
                        .buttonStyle(.plain)

                        Text(vm.distanceLabel)
                            .font(.system(size: 28, weight: .bold, design: .rounded))
                            .foregroundStyle(.blue)
                            .frame(minWidth: 70)
                            .contentTransition(.numericText())
                            .animation(.spring(response: 0.3), value: vm.selectedDistance)

                        Button { vm.increaseDistance() } label: {
                            Image(systemName: "plus.circle.fill")
                                .font(.title2)
                                .foregroundStyle(.blue)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.vertical, 4)

                Divider()

                // 지형 선택 (작은 버튼들)
                VStack(alignment: .leading, spacing: 4) {
                    Text("지형").font(.system(size: 12)).foregroundStyle(.secondary)
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()),
                                        GridItem(.flexible())], spacing: 6) {
                        ForEach(TerrainWatch.all, id: \.id) { t in
                            Button {
                                vm.toggleTerrain(t.id)
                                WKInterfaceDevice.current().play(.click)
                            } label: {
                                VStack(spacing: 2) {
                                    Text(t.emoji).font(.system(size: 18))
                                    Text(t.label).font(.system(size: 9))
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 5)
                                .background(vm.selectedTerrains.contains(t.id)
                                    ? Color.blue.opacity(0.3) : Color.gray.opacity(0.15))
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(vm.selectedTerrains.contains(t.id) ? Color.blue : Color.clear, lineWidth: 1.5)
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                // 추천 버튼
                Button {
                    WKInterfaceDevice.current().play(.success)
                    vm.recommendRoutes()
                } label: {
                    Label("루트 찾기", systemImage: "figure.run")
                        .font(.system(size: 15, weight: .semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color.blue)
                        .foregroundStyle(.white)
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 4)
        }
        .navigationTitle("RunRoute")
        .navigationBarTitleDisplayMode(.inline)
    }

    // ── 로딩 화면 ───────────────────────────────────────────
    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .progressViewStyle(.circular)
                .scaleEffect(1.5)
                .tint(.blue)
            Text("루트 분석 중...")
                .font(.system(size: 14))
                .foregroundStyle(.secondary)
        }
    }

    // ── 루트 목록 ───────────────────────────────────────────
    private var routeListView: some View {
        List(vm.routes) { route in
            Button {
                WKInterfaceDevice.current().play(.click)
                selectedRoute = route
            } label: {
                WatchRouteRow(route: route)
            }
            .buttonStyle(.plain)
        }
        .navigationTitle("추천 루트")
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button { vm.phase = .configure } label: {
                    Image(systemName: "arrow.left")
                }
            }
        }
    }

    // ── 오류 화면 ───────────────────────────────────────────
    private var errorView: some View {
        VStack(spacing: 12) {
            Image(systemName: "wifi.slash").font(.title).foregroundStyle(.orange)
            Text(vm.errorMessage ?? "오류 발생").font(.system(size: 13)).multilineTextAlignment(.center)
            Button("다시 시도") {
                vm.phase = .configure
            }
            .buttonStyle(.bordered)
            .tint(.blue)
        }
        .padding()
    }
}

// MARK: - Route Row
struct WatchRouteRow: View {
    let route: WatchRoute

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(route.terrainEmoji).font(.title3)
                Text(route.description ?? "\(String(format: "%.1f", route.distanceKm))km")
                    .font(.system(size: 14, weight: .semibold))
                    .lineLimit(1)
                Spacer()
                if let score = route.totalScore {
                    Text("\(Int(score))")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(score >= 80 ? .green : .orange)
                }
            }
            HStack(spacing: 10) {
                Label(String(format: "%.1fkm", route.distanceKm), systemImage: "ruler")
                Label("\(route.estimatedMinutes)분", systemImage: "clock")
            }
            .font(.system(size: 11))
            .foregroundStyle(.secondary)
        }
        .padding(.vertical, 2)
    }
}

// MARK: - Terrain Data
struct TerrainWatch {
    let id: String; let label: String; let emoji: String
    static let all: [TerrainWatch] = [
        .init(id: "park",      label: "공원",  emoji: "🌳"),
        .init(id: "riverside", label: "강변",  emoji: "🏞️"),
        .init(id: "urban",     label: "도심",  emoji: "🏙️"),
        .init(id: "mountain",  label: "산길",  emoji: "⛰️"),
        .init(id: "beach",     label: "해변",  emoji: "🏖️"),
    ]
}
