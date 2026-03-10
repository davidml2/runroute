// WatchNavigationView.swift
// 워치 러닝 내비게이션 - 크라운/제스처 인터랙션 + 햅틱

import SwiftUI
import CoreLocation
import Combine

// MARK: - Navigation ViewModel
@MainActor
final class WatchNavViewModel: ObservableObject {
    @Published var runState = RunningState()
    @Published var phase: NavPhase = .preStart
    @Published var sessionId: String = ""
    @Published var activeMetric: Metric = .pace

    enum NavPhase { case preStart, running, completed }
    enum Metric: CaseIterable { case pace, heartRate, calories }

    private let api = WatchAPIClient.shared
    private let wc = WatchConnectivityManager.shared
    private let hk = WatchHealthKitManager.shared
    private let location = WatchLocationManager.shared
    private var timer: Timer?
    private var cancellables = Set<AnyCancellable>()

    let route: WatchRoute

    init(route: WatchRoute) {
        self.route = route
        runState.totalKm = route.distanceKm
    }

    // MARK: - 러닝 시작
    func startRun() async {
        // HealthKit 워크아웃 시작
        await hk.requestAuthorization()
        await hk.startWorkout()

        // 내비게이션 세션 시작 (직접 API or WatchConnectivity)
        do {
            let session = try await api.startNavigation(routeId: route.id)
            sessionId = session.sessionId
        } catch {
            sessionId = UUID().uuidString // 오프라인 폴백
        }

        location.startTracking()
        startTimer()
        phase = .running
        WKInterfaceDevice.current().play(.start)
    }

    // MARK: - 러닝 완료
    func finishRun() async {
        guard phase == .running else { return }
        timer?.invalidate()
        location.stopTracking()

        let (avgHR, cal, _) = await hk.endWorkout()

        // 서버 저장
        let avgPace = runState.elapsedSeconds > 0 && runState.progressKm > 0
            ? Double(runState.elapsedSeconds) / runState.progressKm : nil

        await api.completeRun(
            sessionId: sessionId,
            distanceKm: runState.progressKm,
            durationSeconds: runState.elapsedSeconds,
            avgPace: avgPace,
            avgHR: avgHR > 0 ? avgHR : nil
        )

        // iPhone에도 알림
        wc.sendRunCompleted(sessionId: sessionId, distanceKm: runState.progressKm,
                            durationSeconds: runState.elapsedSeconds,
                            avgPace: avgPace ?? 0, avgHR: avgHR)

        phase = .completed
        WKInterfaceDevice.current().play(.success)
    }

    // MARK: - 타이머 & 위치 업데이트
    private func startTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self else { return }
                self.runState.elapsedSeconds += 1
                self.runState.heartRate = self.hk.currentHeartRate
                self.runState.calories = Int(self.hk.calories)

                // 페이스 계산
                if self.runState.progressKm > 0 && self.runState.elapsedSeconds > 0 {
                    self.runState.currentPaceSecPerKm =
                        Double(self.runState.elapsedSeconds) / self.runState.progressKm
                }

                // 위치 기반 진행률 업데이트
                if let loc = self.location.lastLocation {
                    self.updateProgress(lat: loc.coordinate.latitude, lng: loc.coordinate.longitude)
                }

                // 위치 iPhone 전송 (10초마다)
                if self.runState.elapsedSeconds % 10 == 0,
                   let loc = self.location.lastLocation {
                    self.wc.sendLocationUpdate(lat: loc.coordinate.latitude,
                                               lng: loc.coordinate.longitude,
                                               sessionId: self.sessionId)
                }
            }
        }
    }

    private func updateProgress(lat: Double, lng: Double) {
        let coords = route.latLngList
        guard !coords.isEmpty else { return }

        var minDist = Double.infinity
        var closestIdx = 0
        for (i, c) in coords.enumerated() {
            let d = haversine(lat, lng, c.lat, c.lng)
            if d < minDist { minDist = d; closestIdx = i }
        }

        let newProgress = (Double(closestIdx) / Double(coords.count)) * route.distanceKm
        runState.progressKm = newProgress
        runState.isOffRoute = minDist > 50

        // 루트 이탈 햅틱
        if runState.isOffRoute { WKInterfaceDevice.current().play(.failure) }

        // 완료 감지
        if newProgress >= route.distanceKm * 0.95 {
            Task { await finishRun() }
        }
    }

    private func haversine(_ lat1: Double, _ lon1: Double, _ lat2: Double, _ lon2: Double) -> Double {
        let R = 6371000.0
        let dLat = (lat2 - lat1) * .pi / 180
        let dLon = (lon2 - lon1) * .pi / 180
        let a = sin(dLat/2)*sin(dLat/2) + cos(lat1 * .pi/180) * cos(lat2 * .pi/180) * sin(dLon/2)*sin(dLon/2)
        return R * 2 * atan2(sqrt(a), sqrt(1-a))
    }

    func nextMetric() {
        let all = Metric.allCases
        let idx = all.firstIndex(of: activeMetric) ?? 0
        activeMetric = all[(idx + 1) % all.count]
        WKInterfaceDevice.current().play(.click)
    }

    deinit { timer?.invalidate() }
}

// MARK: - Navigation View
struct WatchNavigationView: View {
    let route: WatchRoute
    @StateObject private var vm: WatchNavViewModel
    @State private var showStopAlert = false
    @Environment(\.dismiss) private var dismiss

    init(route: WatchRoute) {
        self.route = route
        self._vm = StateObject(wrappedValue: WatchNavViewModel(route: route))
    }

    var body: some View {
        Group {
            switch vm.phase {
            case .preStart: preStartView
            case .running:  runningView
            case .completed: completedView
            }
        }
        .navigationBarBackButtonHidden(vm.phase == .running)
        .onChange(of: vm.phase) { _, phase in
            if phase == .completed {
                DispatchQueue.main.asyncAfter(deadline: .now() + 3) { dismiss() }
            }
        }
    }

    // ── 시작 전 화면 ─────────────────────────────────────────
    private var preStartView: some View {
        VStack(spacing: 12) {
            Text(route.terrainEmoji).font(.system(size: 40))
            Text(route.description ?? "\(String(format: "%.1f", route.distanceKm))km")
                .font(.system(size: 14, weight: .semibold))
                .multilineTextAlignment(.center)

            HStack(spacing: 16) {
                VStack {
                    Text(String(format: "%.1f", route.distanceKm))
                        .font(.system(size: 20, weight: .bold)).foregroundStyle(.blue)
                    Text("km").font(.system(size: 10)).foregroundStyle(.secondary)
                }
                VStack {
                    Text("\(route.estimatedMinutes)")
                        .font(.system(size: 20, weight: .bold)).foregroundStyle(.green)
                    Text("분").font(.system(size: 10)).foregroundStyle(.secondary)
                }
                VStack {
                    Text("\(Int(route.safetyScore))")
                        .font(.system(size: 20, weight: .bold)).foregroundStyle(.orange)
                    Text("안전").font(.system(size: 10)).foregroundStyle(.secondary)
                }
            }

            Button {
                Task { await vm.startRun() }
            } label: {
                Label("시작", systemImage: "play.fill")
                    .font(.system(size: 16, weight: .bold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(Color.green)
                    .foregroundStyle(.white)
                    .clipShape(Capsule())
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 4)
    }

    // ── 러닝 중 화면 ─────────────────────────────────────────
    private var runningView: some View {
        VStack(spacing: 0) {
            // 상단: 방향 안내
            directionBanner
                .padding(.top, 4)

            Spacer()

            // 중앙: 주요 지표 (탭으로 전환)
            mainMetric
                .onTapGesture { vm.nextMetric() }

            Spacer()

            // 하단: 진행률 + 시간
            progressSection

            // 종료 버튼
            Button {
                WKInterfaceDevice.current().play(.notification)
                showStopAlert = true
            } label: {
                Image(systemName: "stop.circle.fill")
                    .font(.system(size: 28))
                    .foregroundStyle(.red)
            }
            .buttonStyle(.plain)
            .padding(.bottom, 4)
        }
        .alert("러닝 중단", isPresented: $showStopAlert) {
            Button("계속", role: .cancel) {}
            Button("중단", role: .destructive) {
                Task { await vm.finishRun() }
            }
        }
    }

    // ── 방향 안내 배너 ───────────────────────────────────────
    private var directionBanner: some View {
        HStack(spacing: 6) {
            Text(vm.runState.isOffRoute ? "⚠️" : directionEmoji)
                .font(.system(size: 20))
            VStack(alignment: .leading, spacing: 1) {
                Text(vm.runState.isOffRoute ? "이탈" : vm.runState.nextInstruction)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(vm.runState.isOffRoute ? .orange : .primary)
                if !vm.runState.isOffRoute && vm.runState.distanceToTurnM > 0 {
                    Text("\(Int(vm.runState.distanceToTurnM))m")
                        .font(.system(size: 10))
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(vm.runState.isOffRoute ? Color.orange.opacity(0.15) : Color.blue.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .padding(.horizontal, 4)
    }

    // ── 주요 지표 (탭해서 전환) ──────────────────────────────
    @ViewBuilder
    private var mainMetric: some View {
        VStack(spacing: 2) {
            switch vm.activeMetric {
            case .pace:
                Text(vm.runState.formattedPace)
                    .font(.system(size: 32, weight: .bold, design: .rounded))
                    .contentTransition(.numericText())
                Text("/ km").font(.system(size: 11)).foregroundStyle(.secondary)
            case .heartRate:
                HStack(alignment: .lastTextBaseline, spacing: 2) {
                    Text(vm.runState.heartRate > 0 ? "\(vm.runState.heartRate)" : "--")
                        .font(.system(size: 36, weight: .bold, design: .rounded))
                        .foregroundStyle(.red)
                    Text("bpm").font(.system(size: 11)).foregroundStyle(.secondary)
                }
            case .calories:
                HStack(alignment: .lastTextBaseline, spacing: 2) {
                    Text("\(vm.runState.calories)")
                        .font(.system(size: 36, weight: .bold, design: .rounded))
                        .foregroundStyle(.orange)
                    Text("kcal").font(.system(size: 11)).foregroundStyle(.secondary)
                }
            }
            // 지표 인디케이터 점
            HStack(spacing: 4) {
                ForEach(WatchNavViewModel.Metric.allCases, id: \.self) { m in
                    Circle()
                        .fill(m == vm.activeMetric ? Color.white : Color.gray.opacity(0.5))
                        .frame(width: 5, height: 5)
                }
            }
        }
        .animation(.easeInOut(duration: 0.2), value: vm.activeMetric)
    }

    // ── 진행률 섹션 ─────────────────────────────────────────
    private var progressSection: some View {
        VStack(spacing: 4) {
            // 진행률 링
            ZStack {
                Circle()
                    .stroke(Color.white.opacity(0.15), lineWidth: 4)
                Circle()
                    .trim(from: 0, to: vm.runState.progressPercent)
                    .stroke(Color.blue, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .animation(.easeInOut(duration: 0.5), value: vm.runState.progressPercent)

                VStack(spacing: 0) {
                    Text(vm.runState.formattedElapsed)
                        .font(.system(size: 14, weight: .bold, design: .monospaced))
                    Text(String(format: "%.2f km", vm.runState.progressKm))
                        .font(.system(size: 10))
                        .foregroundStyle(.secondary)
                }
            }
            .frame(width: 70, height: 70)
        }
    }

    // ── 완료 화면 ────────────────────────────────────────────
    private var completedView: some View {
        VStack(spacing: 10) {
            Text("🎉").font(.system(size: 40))
            Text("완료!").font(.system(size: 22, weight: .bold))
            VStack(spacing: 4) {
                ResultRow(label: "거리", value: String(format: "%.2f km", vm.runState.progressKm))
                ResultRow(label: "시간", value: vm.runState.formattedElapsed)
                ResultRow(label: "페이스", value: vm.runState.formattedPace)
                if vm.runState.heartRate > 0 {
                    ResultRow(label: "심박수", value: "\(vm.runState.heartRate) bpm")
                }
            }
        }
        .padding(.horizontal, 4)
    }

    private var directionEmoji: String {
        switch vm.runState.nextInstruction {
        case let s where s.contains("우"): return "↗️"
        case let s where s.contains("좌"): return "↖️"
        default: return "⬆️"
        }
    }
}

// MARK: - Result Row
struct ResultRow: View {
    let label: String; let value: String
    var body: some View {
        HStack {
            Text(label).font(.system(size: 11)).foregroundStyle(.secondary)
            Spacer()
            Text(value).font(.system(size: 12, weight: .semibold))
        }
    }
}
