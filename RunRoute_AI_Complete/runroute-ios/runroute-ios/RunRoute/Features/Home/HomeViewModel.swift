// HomeViewModel.swift
import Foundation
import CoreLocation
import Combine

@MainActor
final class HomeViewModel: ObservableObject {
    // ── 상태 ───────────────────────────────────────────────────
    @Published var routes: [RunRoute] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var selectedDistance: Double = 5.0
    @Published var selectedTerrains: [String] = []
    @Published var selectedDifficulty: String = "moderate"
    @Published var naturalQuery: String = ""
    @Published var currentLocation: CLLocation?
    @Published var cityName: String = "현재 위치"
    @Published var showRouteSelection = false

    private let api = APIClient.shared
    private let locationManager = LocationManager.shared
    private var cancellables = Set<AnyCancellable>()

    init() {
        setupLocationObserver()
    }

    // ── 위치 감지 구독 ──────────────────────────────────────────
    private func setupLocationObserver() {
        locationManager.$currentLocation
            .compactMap { $0 }
            .removeDuplicates { $0.distance(from: $1) < 100 }
            .sink { [weak self] location in
                self?.currentLocation = location
                Task { await self?.updateCityName(location) }
            }
            .store(in: &cancellables)
    }

    // ── 루트 추천 요청 ──────────────────────────────────────────
    func recommendRoutes() async {
        guard let loc = currentLocation else {
            errorMessage = "위치 정보를 가져오는 중입니다..."
            locationManager.startTracking()
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            let response: RecommendResponse = try await api.request(
                .recommendRoutes(
                    lat: loc.coordinate.latitude,
                    lng: loc.coordinate.longitude,
                    distanceKm: selectedDistance,
                    terrains: selectedTerrains,
                    difficulty: selectedDifficulty,
                    naturalQuery: naturalQuery.isEmpty ? nil : naturalQuery
                )
            )
            routes = response.routes
            showRouteSelection = !routes.isEmpty
        } catch {
            errorMessage = (error as? APIError)?.errorDescription ?? error.localizedDescription
        }

        isLoading = false
    }

    // ── 지역명 업데이트 ─────────────────────────────────────────
    private func updateCityName(_ location: CLLocation) async {
        let geocoder = CLGeocoder()
        if let placemark = try? await geocoder.reverseGeocodeLocation(location).first {
            let city = placemark.locality ?? placemark.administrativeArea ?? "현재 위치"
            let district = placemark.subLocality ?? ""
            cityName = district.isEmpty ? city : "\(city) \(district)"
        }
    }

    // ── 거리 슬라이더 ───────────────────────────────────────────
    var distanceLabel: String {
        String(format: "%.1f km", selectedDistance)
    }

    // ── 지형 선택 토글 ──────────────────────────────────────────
    func toggleTerrain(_ terrain: String) {
        if selectedTerrains.contains(terrain) {
            selectedTerrains.removeAll { $0 == terrain }
        } else {
            selectedTerrains.append(terrain)
        }
    }

    func isTerrainSelected(_ terrain: String) -> Bool {
        selectedTerrains.contains(terrain)
    }
}
