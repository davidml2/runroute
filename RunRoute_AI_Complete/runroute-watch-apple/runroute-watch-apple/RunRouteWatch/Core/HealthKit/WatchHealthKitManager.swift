// WatchHealthKitManager.swift
// HealthKit 워크아웃 기록 및 심박수 실시간 모니터링

import HealthKit
import Combine

final class WatchHealthKitManager: NSObject, ObservableObject {
    static let shared = WatchHealthKitManager()

    @Published var currentHeartRate: Int = 0
    @Published var calories: Double = 0
    @Published var isAuthorized: Bool = false

    private let healthStore = HKHealthStore()
    private var workoutSession: HKWorkoutSession?
    private var workoutBuilder: HKLiveWorkoutBuilder?
    private var heartRateQuery: HKQuery?

    private let heartRateType = HKObjectType.quantityType(forIdentifier: .heartRate)!
    private let activeEnergyType = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!
    private let distanceType = HKObjectType.quantityType(forIdentifier: .distanceWalkingRunning)!

    override init() { super.init() }

    // MARK: - 권한 요청
    func requestAuthorization() async -> Bool {
        guard HKHealthStore.isHealthDataAvailable() else { return false }
        let typesToShare: Set<HKSampleType> = [
            HKObjectType.workoutType(),
            activeEnergyType, distanceType
        ]
        let typesToRead: Set<HKObjectType> = [
            heartRateType, activeEnergyType, distanceType,
            HKObjectType.workoutType()
        ]
        do {
            try await healthStore.requestAuthorization(toShare: typesToShare, read: typesToRead)
            await MainActor.run { isAuthorized = true }
            return true
        } catch {
            return false
        }
    }

    // MARK: - 워크아웃 세션 시작
    func startWorkout() async {
        let config = HKWorkoutConfiguration()
        config.activityType = .running
        config.locationType = .outdoor

        do {
            workoutSession = try HKWorkoutSession(healthStore: healthStore, configuration: config)
            workoutBuilder = workoutSession?.associatedWorkoutBuilder()
            workoutBuilder?.dataSource = HKLiveWorkoutDataSource(
                healthStore: healthStore,
                workoutConfiguration: config
            )
            workoutSession?.delegate = self
            workoutBuilder?.delegate = self
            workoutSession?.startActivity(with: Date())
            try await workoutBuilder?.beginCollection(at: Date())
            startHeartRateMonitoring()
        } catch {
            print("워크아웃 시작 실패: \(error)")
        }
    }

    // MARK: - 워크아웃 세션 종료
    func endWorkout() async -> (avgHR: Int, calories: Int, distanceKm: Double) {
        workoutSession?.end()
        stopHeartRateMonitoring()

        guard let builder = workoutBuilder else {
            return (0, Int(calories), 0)
        }

        // 워크아웃 저장
        _ = try? await builder.endCollection(at: Date())
        _ = try? await builder.finishWorkout()

        let avgHR = await fetchAverageHeartRate()
        return (avgHR, Int(calories), 0)
    }

    // MARK: - 실시간 심박수 모니터링
    private func startHeartRateMonitoring() {
        let query = HKAnchoredObjectQuery(
            type: heartRateType,
            predicate: HKQuery.predicateForSamples(withStart: Date(), end: nil),
            anchor: nil,
            limit: HKObjectQueryNoLimit
        ) { [weak self] _, samples, _, _, _ in
            self?.processHeartRateSamples(samples as? [HKQuantitySample])
        }

        query.updateHandler = { [weak self] _, samples, _, _, _ in
            self?.processHeartRateSamples(samples as? [HKQuantitySample])
        }

        healthStore.execute(query)
        heartRateQuery = query
    }

    private func stopHeartRateMonitoring() {
        if let q = heartRateQuery { healthStore.stop(q) }
    }

    private func processHeartRateSamples(_ samples: [HKQuantitySample]?) {
        guard let latest = samples?.last else { return }
        let bpm = latest.quantity.doubleValue(for: .init(from: "count/min"))
        DispatchQueue.main.async {
            self.currentHeartRate = Int(bpm)
        }
    }

    private func fetchAverageHeartRate() async -> Int {
        let stats = try? await healthStore.statistics(
            for: HKQuantityType(.heartRate),
            predicate: HKQuery.predicateForSamples(withStart: workoutBuilder?.startDate, end: Date())
        )
        let avg = stats?.averageQuantity()?.doubleValue(for: HKUnit(from: "count/min")) ?? 0
        return Int(avg)
    }
}

// MARK: - HKWorkoutSessionDelegate
extension WatchHealthKitManager: HKWorkoutSessionDelegate {
    func workoutSession(_ session: HKWorkoutSession,
                        didChangeTo toState: HKWorkoutSessionState,
                        from fromState: HKWorkoutSessionState, date: Date) {
        print("워크아웃 상태 변경: \(fromState.rawValue) → \(toState.rawValue)")
    }
    func workoutSession(_ session: HKWorkoutSession, didFailWithError error: Error) {
        print("워크아웃 오류: \(error)")
    }
}

// MARK: - HKLiveWorkoutBuilderDelegate
extension WatchHealthKitManager: HKLiveWorkoutBuilderDelegate {
    func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}

    func workoutBuilder(_ workoutBuilder: HKLiveWorkoutBuilder,
                        didCollectDataOf collectedTypes: Set<HKSampleType>) {
        for type in collectedTypes {
            guard let quantityType = type as? HKQuantityType else { continue }
            let stats = workoutBuilder.statistics(for: quantityType)

            DispatchQueue.main.async {
                switch quantityType {
                case HKQuantityType(.heartRate):
                    let bpm = stats?.mostRecentQuantity()?.doubleValue(for: HKUnit(from: "count/min")) ?? 0
                    self.currentHeartRate = Int(bpm)
                case HKQuantityType(.activeEnergyBurned):
                    self.calories = stats?.sumQuantity()?.doubleValue(for: .kilocalorie()) ?? 0
                default:
                    break
                }
            }
        }
    }
}
