// HomeView.swift
import SwiftUI
import MapKit

struct HomeView: View {
    @StateObject private var vm = HomeViewModel()
    @State private var showNaturalInput = false
    @State private var selectedRoute: RunRoute?

    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottom) {
                // 배경 지도
                MapView(routes: vm.routes, selectedRoute: $selectedRoute)
                    .ignoresSafeArea()

                // 하단 컨트롤 패널
                VStack(spacing: 0) {
                    Spacer()
                    controlPanel
                }
            }
            .navigationTitle(vm.cityName)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { toolbarItems }
        }
        .sheet(isPresented: $vm.showRouteSelection) {
            RouteSelectionSheet(routes: vm.routes, onSelect: { route in
                selectedRoute = route
                vm.showRouteSelection = false
            })
            .presentationDetents([.medium, .large])
        }
        .sheet(item: $selectedRoute) { route in
            RouteDetailView(route: route)
        }
        .alert("오류", isPresented: .constant(vm.errorMessage != nil)) {
            Button("확인") { vm.errorMessage = nil }
        } message: {
            Text(vm.errorMessage ?? "")
        }
        .onAppear {
            LocationManager.shared.requestPermission()
        }
    }

    // ── 하단 컨트롤 패널 ────────────────────────────────────────
    private var controlPanel: some View {
        VStack(spacing: 16) {
            // 자연어 입력 또는 슬라이더
            if showNaturalInput {
                naturalQueryInput
            } else {
                distanceSlider
            }

            // 지형 선택
            terrainSelector

            // 추천 버튼
            recommendButton
        }
        .padding(20)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .padding(.horizontal, 16)
        .padding(.bottom, 20)
        .shadow(color: .black.opacity(0.1), radius: 20, y: -5)
    }

    // ── 자연어 입력 ─────────────────────────────────────────────
    private var naturalQueryInput: some View {
        HStack {
            Image(systemName: "text.bubble")
                .foregroundStyle(.blue)
            TextField("\"강변 따라 5km 가볍게\"", text: $vm.naturalQuery)
                .submitLabel(.search)
                .onSubmit { Task { await vm.recommendRoutes() } }
            if !vm.naturalQuery.isEmpty {
                Button { vm.naturalQuery = "" } label: {
                    Image(systemName: "xmark.circle.fill").foregroundStyle(.secondary)
                }
            }
        }
        .padding(12)
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // ── 거리 슬라이더 ───────────────────────────────────────────
    private var distanceSlider: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("목표 거리")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Spacer()
                Text(vm.distanceLabel)
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundStyle(.blue)
            }
            Slider(value: $vm.selectedDistance, in: 1...30, step: 0.5)
                .tint(.blue)
        }
    }

    // ── 지형 선택 칩 ────────────────────────────────────────────
    private var terrainSelector: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(TerrainOption.all) { terrain in
                    TerrainChip(
                        terrain: terrain,
                        isSelected: vm.isTerrainSelected(terrain.id),
                        onTap: { vm.toggleTerrain(terrain.id) }
                    )
                }

                // 난이도 선택
                DifficultyPicker(selected: $vm.selectedDifficulty)
            }
            .padding(.horizontal, 4)
        }
    }

    // ── 추천 버튼 ───────────────────────────────────────────────
    private var recommendButton: some View {
        Button {
            Task { await vm.recommendRoutes() }
        } label: {
            HStack(spacing: 8) {
                if vm.isLoading {
                    ProgressView().tint(.white)
                } else {
                    Image(systemName: "figure.run")
                }
                Text(vm.isLoading ? "루트 분석 중..." : "루트 추천받기")
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(vm.isLoading ? Color.gray : Color.blue)
            .foregroundStyle(.white)
            .clipShape(RoundedRectangle(cornerRadius: 14))
        }
        .disabled(vm.isLoading)
    }

    // ── 툴바 ────────────────────────────────────────────────────
    @ToolbarContentBuilder
    private var toolbarItems: some ToolbarContent {
        ToolbarItem(placement: .topBarLeading) {
            Image("logo_small")
                .resizable()
                .frame(width: 28, height: 28)
        }
        ToolbarItem(placement: .topBarTrailing) {
            Button {
                withAnimation { showNaturalInput.toggle() }
            } label: {
                Image(systemName: showNaturalInput ? "slider.horizontal.3" : "text.bubble")
            }
        }
    }
}

// MARK: - Supporting Views

struct TerrainOption: Identifiable {
    let id: String
    let label: String
    let emoji: String

    static let all: [TerrainOption] = [
        .init(id: "park",      label: "공원",  emoji: "🌳"),
        .init(id: "riverside", label: "강변",  emoji: "🏞️"),
        .init(id: "urban",     label: "도심",  emoji: "🏙️"),
        .init(id: "mountain",  label: "산길",  emoji: "⛰️"),
        .init(id: "beach",     label: "해변",  emoji: "🏖️"),
    ]
}

struct TerrainChip: View {
    let terrain: TerrainOption
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 4) {
                Text(terrain.emoji)
                Text(terrain.label).font(.subheadline)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(isSelected ? Color.blue : Color(.systemGray5))
            .foregroundStyle(isSelected ? .white : .primary)
            .clipShape(Capsule())
        }
    }
}

struct DifficultyPicker: View {
    @Binding var selected: String

    var body: some View {
        Menu {
            ForEach([("easy","쉬움"), ("moderate","보통"), ("hard","어려움")], id: \.0) { id, label in
                Button(label) { selected = id }
            }
        } label: {
            HStack(spacing: 4) {
                Image(systemName: "flame")
                Text(["easy":"쉬움","moderate":"보통","hard":"어려움"][selected] ?? "보통")
                    .font(.subheadline)
                Image(systemName: "chevron.up.chevron.down")
                    .font(.caption)
            }
            .padding(.horizontal, 14).padding(.vertical, 8)
            .background(Color(.systemGray5))
            .clipShape(Capsule())
        }
    }
}
