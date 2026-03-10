// NavigationView.swift
import SwiftUI
import MapKit
import Combine

// MARK: - Navigation ViewModel
@MainActor
final class NavigationViewModel: ObservableObject {
    @Published var progressKm: Double = 0
    @Published var currentPaceStr: String = "--'--\""
    @Published var currentHeartRate: Int = 0
    @Published var elapsedSeconds: Int = 0
    @Published var nextInstruction: String = "직진"
    @Published var distanceToTurnM: Double = 0
    @Published var isOffRoute: Bool = false
    @Published var isCompleted: Bool = false

    let route: RunRoute
    let sessionId: String
    private let api = APIClient.shared
    private let locationManager = LocationManager.shared
    private var timer: Timer?
    private var cancellables = Set<AnyCancellable>()
    private var startDate = Date()

    init(route: RunRoute, sessionId: String) {
        self.route = route
        self.sessionId = sessionId
        startTimer()
        observeLocation()
    }

    var progressPercent: Double {
        guard route.distanceKm > 0 else { return 0 }
        return min(1.0, progressKm / route.distanceKm)
    }

    var remainingKm: Double { max(0, route.distanceKm - progressKm) }

    var elapsedTimeStr: String {
        let h = elapsedSeconds / 3600
        let m = (elapsedSeconds % 3600) / 60
        let s = elapsedSeconds % 60
        if h > 0 { return String(format: "%d:%02d:%02d", h, m, s) }
        return String(format: "%02d:%02d", m, s)
    }

    private func startTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            guard let self else { return }
            Task { @MainActor in self.elapsedSeconds += 1 }
        }
    }

    private func observeLocation() {
        locationManager.$currentLocation
            .compactMap { $0 }
            .sink { [weak self] location in
                self?.updateProgress(location)
            }
            .store(in: &cancellables)
    }

    private func updateProgress(_ location: CLLocation) {
        let coords = route.coordinateList
        guard !coords.isEmpty else { return }

        // 가장 가까운 루트 포인트 찾기
        var minDist = Double.infinity
        var closestIdx = 0
        for (i, coord) in coords.enumerated() {
            let routePoint = CLLocation(latitude: coord.latitude, longitude: coord.longitude)
            let dist = location.distance(from: routePoint)
            if dist < minDist {
                minDist = dist
                closestIdx = i
            }
        }

        // 진행률 업데이트
        progressKm = Double(closestIdx) / Double(coords.count) * route.distanceKm
        isOffRoute = minDist > 50

        // 다음 방향 (단순화)
        if closestIdx + 5 < coords.count {
            let nextCoord = coords[closestIdx + 5]
            let bearing = location.coordinate.bearing(to: nextCoord)
            nextInstruction = bearingToInstruction(bearing)
            distanceToTurnM = minDist
        } else {
            nextInstruction = "도착 지점 근처"
        }

        // 완료 감지
        if progressKm >= route.distanceKm * 0.95 {
            Task { await completeRun() }
        }
    }

    func completeRun() async {
        guard !isCompleted else { return }
        timer?.invalidate()
        isCompleted = true

        do {
            let avgPace = elapsedSeconds > 0 ? Double(elapsedSeconds) / progressKm : nil
            _ = try await api.request(
                .completeRun(
                    sessionId: sessionId,
                    distanceKm: progressKm,
                    durationSeconds: elapsedSeconds,
                    avgPace: avgPace,
                    avgHR: currentHeartRate > 0 ? currentHeartRate : nil,
                    calories: Int(progressKm * 65)
                )
            ) as [String: String]
        } catch {
            print("완료 저장 오류: \(error)")
        }
    }

    private func bearingToInstruction(_ bearing: Double) -> String {
        switch bearing {
        case 315...360, 0..<45:   return "↑ 직진"
        case 45..<135:            return "→ 우회전"
        case 135..<225:           return "↓ 유턴"
        default:                  return "← 좌회전"
        }
    }

    deinit { timer?.invalidate() }
}

// MARK: - Navigation View
struct NavigationView: View {
    let route: RunRoute
    let sessionId: String
    @StateObject private var vm: NavigationViewModel
    @State private var showCompleteAlert = false
    @Environment(\.dismiss) private var dismiss

    init(route: RunRoute, sessionId: String) {
        self.route = route
        self.sessionId = sessionId
        self._vm = StateObject(wrappedValue: NavigationViewModel(route: route, sessionId: sessionId))
    }

    var body: some View {
        ZStack {
            // 배경 지도 (전체화면)
            MapView(routes: [route], selectedRoute: .constant(route))
                .ignoresSafeArea()

            VStack(spacing: 0) {
                // 상단: 다음 방향 안내
                turnBanner
                    .padding(.top, 56)
                    .padding(.horizontal)

                Spacer()

                // 하단: 러닝 통계
                statsPanel
            }
        }
        .navigationBarBackButtonHidden()
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { showCompleteAlert = true } label: {
                    Text("중단").foregroundStyle(.red)
                }
            }
        }
        .alert("러닝 중단", isPresented: $showCompleteAlert) {
            Button("계속하기", role: .cancel) {}
            Button("중단하기", role: .destructive) {
                Task {
                    await vm.completeRun()
                    dismiss()
                }
            }
        } message: {
            Text("러닝을 중단하면 현재까지의 기록이 저장됩니다.")
        }
        .onChange(of: vm.isCompleted) { _, completed in
            if completed { dismiss() }
        }
    }

    // ── 방향 안내 배너 ──────────────────────────────────────────
    private var turnBanner: some View {
        HStack(spacing: 16) {
            Text(vm.nextInstruction)
                .font(.title).fontWeight(.bold)
            VStack(alignment: .leading) {
                if vm.isOffRoute {
                    Label("루트에서 이탈", systemImage: "exclamationmark.triangle")
                        .foregroundStyle(.orange)
                        .font(.subheadline)
                } else {
                    Text("\(Int(vm.distanceToTurnM))m 후")
                        .font(.subheadline).foregroundStyle(.secondary)
                }
            }
            Spacer()
        }
        .padding(16)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    // ── 하단 통계 패널 ──────────────────────────────────────────
    private var statsPanel: some View {
        VStack(spacing: 16) {
            // 진행률 바
            VStack(spacing: 4) {
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 4).fill(Color.white.opacity(0.3))
                        RoundedRectangle(cornerRadius: 4).fill(Color.white)
                            .frame(width: geo.size.width * vm.progressPercent)
                    }
                }
                .frame(height: 6)
                HStack {
                    Text(String(format: "%.2f km", vm.progressKm)).font(.caption)
                    Spacer()
                    Text(String(format: "%.2f km 남음", vm.remainingKm)).font(.caption)
                }
                .foregroundStyle(.white.opacity(0.8))
            }

            // 주요 지표
            HStack(spacing: 0) {
                RunStat(title: "시간", value: vm.elapsedTimeStr, icon: "timer")
                Divider().frame(height: 40).opacity(0.3)
                RunStat(title: "페이스", value: vm.currentPaceStr, icon: "speedometer")
                Divider().frame(height: 40).opacity(0.3)
                RunStat(title: "심박수", value: vm.currentHeartRate > 0 ? "\(vm.currentHeartRate)" : "--", icon: "heart")
            }
        }
        .padding(20)
        .background(Color.blue)
        .foregroundStyle(.white)
    }
}

struct RunStat: View {
    let title: String
    let value: String
    let icon: String

    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon).font(.caption).opacity(0.7)
            Text(value).font(.title3).fontWeight(.bold).monospacedDigit()
            Text(title).font(.caption2).opacity(0.7)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - CLLocationCoordinate2D bearing extension
extension CLLocationCoordinate2D {
    func bearing(to destination: CLLocationCoordinate2D) -> Double {
        let lat1 = latitude * .pi / 180
        let lat2 = destination.latitude * .pi / 180
        let dLng = (destination.longitude - longitude) * .pi / 180
        let y = sin(dLng) * cos(lat2)
        let x = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dLng)
        return atan2(y, x) * 180 / .pi
    }
}
