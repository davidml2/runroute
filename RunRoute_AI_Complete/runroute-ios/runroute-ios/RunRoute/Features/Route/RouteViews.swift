// RouteViews.swift
import SwiftUI
import MapKit

// MARK: - Map View
struct MapView: UIViewRepresentable {
    let routes: [RunRoute]
    @Binding var selectedRoute: RunRoute?

    func makeUIView(context: Context) -> MKMapView {
        let mapView = MKMapView()
        mapView.delegate = context.coordinator
        mapView.showsUserLocation = true
        mapView.userTrackingMode = .follow
        mapView.showsCompass = false
        return mapView
    }

    func updateUIView(_ mapView: MKMapView, context: Context) {
        mapView.removeOverlays(mapView.overlays)
        mapView.removeAnnotations(mapView.annotations.filter { !($0 is MKUserLocation) })

        for (i, route) in routes.enumerated() {
            let coords = route.coordinateList
            guard !coords.isEmpty else { continue }
            let polyline = MKPolyline(coordinates: coords, count: coords.count)
            polyline.title = route.id
            mapView.addOverlay(polyline)

            // 출발점 핀
            let pin = MKPointAnnotation()
            pin.coordinate = coords[0]
            pin.title = "루트 \(i + 1)"
            pin.subtitle = route.description
            mapView.addAnnotation(pin)
        }

        if let selected = selectedRoute, let first = selected.coordinateList.first {
            let region = MKCoordinateRegion(center: first,
                latitudinalMeters: selected.distanceKm * 800,
                longitudinalMeters: selected.distanceKm * 800)
            mapView.setRegion(region, animated: true)
        }
    }

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    class Coordinator: NSObject, MKMapViewDelegate {
        var parent: MapView

        init(_ parent: MapView) { self.parent = parent }

        func mapView(_ mapView: MKMapView, rendererFor overlay: MKOverlay) -> MKOverlayRenderer {
            guard let polyline = overlay as? MKPolyline else {
                return MKOverlayRenderer(overlay: overlay)
            }
            let renderer = MKPolylineRenderer(polyline: polyline)
            renderer.strokeColor = polyline.title == parent.selectedRoute?.id ? .systemBlue : .systemGray
            renderer.lineWidth = polyline.title == parent.selectedRoute?.id ? 5 : 3
            renderer.lineDashPattern = [1, 0]
            return renderer
        }
    }
}

// MARK: - Route Selection Sheet
struct RouteSelectionSheet: View {
    let routes: [RunRoute]
    let onSelect: (RunRoute) -> Void

    var body: some View {
        NavigationStack {
            List(routes) { route in
                RouteCard(route: route)
                    .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                    .listRowSeparator(.hidden)
                    .onTapGesture { onSelect(route) }
            }
            .listStyle(.plain)
            .navigationTitle("추천 루트 \(routes.count)개")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

// MARK: - Route Card
struct RouteCard: View {
    let route: RunRoute

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // 헤더 행
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(route.terrainEmojis.isEmpty ? "🏃 러닝 루트" : route.terrainEmojis)
                        .font(.title3)
                    Text(route.description ?? "\(String(format: "%.1f", route.distanceKm))km 코스")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                ScoreBadge(score: route.totalScore ?? 75)
            }

            // 통계 행
            HStack(spacing: 20) {
                StatItem(icon: "ruler", value: String(format: "%.1fkm", route.distanceKm))
                StatItem(icon: "clock", value: "\(route.estimatedMinutes)분")
                StatItem(icon: "arrow.up.right", value: "\(Int(route.elevationGainM))m")
                StatItem(icon: "shield.checkered",
                         value: "\(Int(route.safetyScore))점",
                         color: safetyColor(route.safetyScore))
            }

            // 시작 버튼
            NavigationLink(destination: RouteDetailView(route: route)) {
                Text("이 루트로 시작하기")
                    .font(.subheadline).fontWeight(.semibold)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(Color.blue)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
            }
        }
        .padding(16)
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.08), radius: 8, y: 4)
    }

    private func safetyColor(_ score: Double) -> Color {
        score >= 80 ? .green : score >= 60 ? .orange : .red
    }
}

// MARK: - Route Detail View
struct RouteDetailView: View {
    let route: RunRoute
    @StateObject private var vm: RouteDetailViewModel
    @Environment(\.dismiss) private var dismiss

    init(route: RunRoute) {
        self.route = route
        self._vm = StateObject(wrappedValue: RouteDetailViewModel(route: route))
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // 루트 맵 미리보기
                    MapView(routes: [route], selectedRoute: .constant(route))
                        .frame(height: 260)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                        .padding(.horizontal)

                    // 루트 통계
                    routeStats

                    // 스코어 카드
                    scoreCard

                    // POI 목록
                    if let pois = route.pois, !pois.isEmpty {
                        poiList(pois)
                    }

                    // 시작 버튼
                    startButton
                }
                .padding(.bottom, 30)
            }
            .navigationTitle("루트 상세")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { Task { await vm.saveRoute() } } label: {
                        Image(systemName: vm.isSaved ? "bookmark.fill" : "bookmark")
                    }
                }
            }
        }
        .navigationDestination(isPresented: $vm.navigationStarted) {
            NavigationView(route: route, sessionId: vm.sessionId ?? "")
        }
    }

    private var routeStats: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()),
                             GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
            BigStat(title: "거리", value: String(format: "%.1f", route.distanceKm), unit: "km")
            BigStat(title: "예상시간", value: "\(route.estimatedMinutes)", unit: "분")
            BigStat(title: "고도상승", value: "\(Int(route.elevationGainM))", unit: "m")
            BigStat(title: "난이도", value: route.difficultyLabel, unit: "")
        }
        .padding(.horizontal)
    }

    private var scoreCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("루트 분석").font(.headline)
            VStack(spacing: 8) {
                ScoreBar(label: "안전도", score: route.safetyScore)
                ScoreBar(label: "경관", score: route.sceneryScore)
            }
        }
        .padding(16)
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .padding(.horizontal)
    }

    private func poiList(_ pois: [PointOfInterest]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("주요 포인트").font(.headline).padding(.horizontal)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(pois) { poi in
                        POIChip(poi: poi)
                    }
                }
                .padding(.horizontal)
            }
        }
    }

    private var startButton: some View {
        Button {
            Task { await vm.startNavigation() }
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "figure.run")
                Text(vm.isLoading ? "준비 중..." : "러닝 시작하기")
                    .fontWeight(.bold)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 18)
            .background(Color.blue)
            .foregroundStyle(.white)
            .clipShape(RoundedRectangle(cornerRadius: 16))
        }
        .disabled(vm.isLoading)
        .padding(.horizontal)
    }
}

// MARK: - Sub-views

struct StatItem: View {
    let icon: String
    let value: String
    var color: Color = .primary

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: icon).font(.caption).foregroundStyle(.secondary)
            Text(value).font(.caption).fontWeight(.medium).foregroundStyle(color)
        }
    }
}

struct BigStat: View {
    let title: String
    let value: String
    let unit: String

    var body: some View {
        VStack(spacing: 4) {
            Text(title).font(.caption).foregroundStyle(.secondary)
            HStack(alignment: .lastTextBaseline, spacing: 2) {
                Text(value).font(.title2).fontWeight(.bold)
                Text(unit).font(.caption).foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(12)
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct ScoreBadge: View {
    let score: Double

    var body: some View {
        Text("\(Int(score))점")
            .font(.subheadline).fontWeight(.bold)
            .padding(.horizontal, 10).padding(.vertical, 4)
            .background(scoreColor.opacity(0.15))
            .foregroundStyle(scoreColor)
            .clipShape(Capsule())
    }

    private var scoreColor: Color {
        score >= 80 ? .green : score >= 60 ? .orange : .red
    }
}

struct ScoreBar: View {
    let label: String
    let score: Double

    var body: some View {
        HStack {
            Text(label).font(.subheadline).frame(width: 50, alignment: .leading)
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4).fill(Color(.systemGray4))
                    RoundedRectangle(cornerRadius: 4).fill(Color.blue)
                        .frame(width: geo.size.width * score / 100)
                }
            }
            .frame(height: 8)
            Text("\(Int(score))").font(.caption).frame(width: 30, alignment: .trailing)
        }
    }
}

struct POIChip: View {
    let poi: PointOfInterest
    let icons = ["park": "🌳", "landmark": "🗼", "water": "💧", "photo_spot": "📸"]

    var body: some View {
        VStack(spacing: 4) {
            Text(icons[poi.type] ?? "📍").font(.title2)
            Text(poi.name).font(.caption).lineLimit(1)
        }
        .padding(12)
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}
