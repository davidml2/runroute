// AuthView.swift
import SwiftUI

// MARK: - Auth View
struct AuthView: View {
    @StateObject private var vm = AuthViewModel()
    @State private var isRegister = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 32) {
                Spacer()

                // 로고
                VStack(spacing: 8) {
                    Text("🏃").font(.system(size: 64))
                    Text("RunRoute AI").font(.largeTitle).fontWeight(.bold)
                    Text("어디서든 최적의 러닝 루트").font(.subheadline).foregroundStyle(.secondary)
                }

                // 입력 폼
                VStack(spacing: 16) {
                    if isRegister {
                        RoundedTextField(placeholder: "이름", text: $vm.name)
                    }
                    RoundedTextField(placeholder: "이메일", text: $vm.email,
                                     keyboardType: .emailAddress)
                    RoundedTextField(placeholder: "비밀번호", text: $vm.password,
                                     isSecure: true)
                }
                .padding(.horizontal)

                // 오류 메시지
                if let error = vm.errorMessage {
                    Text(error).font(.caption).foregroundStyle(.red).padding(.horizontal)
                }

                // 로그인/회원가입 버튼
                Button {
                    Task { isRegister ? await vm.register() : await vm.login() }
                } label: {
                    HStack {
                        if vm.isLoading { ProgressView().tint(.white) }
                        Text(isRegister ? "회원가입" : "로그인").fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity).padding().background(Color.blue)
                    .foregroundStyle(.white).clipShape(RoundedRectangle(cornerRadius: 14))
                }
                .disabled(vm.isLoading)
                .padding(.horizontal)

                // 전환 버튼
                Button {
                    withAnimation { isRegister.toggle(); vm.errorMessage = nil }
                } label: {
                    Text(isRegister ? "이미 계정이 있어요 → 로그인" : "계정이 없어요 → 회원가입")
                        .font(.subheadline).foregroundStyle(.blue)
                }

                Spacer()
            }
        }
        .onChange(of: vm.isLoggedIn) { _, loggedIn in
            if loggedIn {
                // AppState 업데이트
                NotificationCenter.default.post(name: .userLoggedIn, object: nil)
            }
        }
    }
}

// MARK: - Profile View
struct ProfileView: View {
    @StateObject private var vm = ProfileViewModel()

    var body: some View {
        NavigationStack {
            List {
                // 프로필 헤더
                if let user = vm.user {
                    Section {
                        HStack(spacing: 16) {
                            Circle().fill(Color.blue.gradient)
                                .frame(width: 60, height: 60)
                                .overlay(Text(user.name.prefix(1)).font(.title2).fontWeight(.bold).foregroundStyle(.white))
                            VStack(alignment: .leading, spacing: 4) {
                                Text(user.name).font(.title3).fontWeight(.semibold)
                                Text(user.email).font(.caption).foregroundStyle(.secondary)
                                PlanBadge(plan: user.plan)
                            }
                        }
                        .padding(.vertical, 8)
                    }
                }

                // 통계
                if let stats = vm.stats {
                    Section("러닝 통계") {
                        HStack {
                            StatCard(title: "총 러닝", value: "\(stats.totalRuns)회")
                            StatCard(title: "총 거리", value: String(format: "%.1fkm", stats.totalDistanceKm))
                            StatCard(title: "평균 거리", value: String(format: "%.1fkm", stats.avgDistanceKm))
                        }
                        .listRowInsets(EdgeInsets())
                    }
                }

                // 최근 기록
                Section("최근 러닝") {
                    if vm.records.isEmpty {
                        Text("아직 러닝 기록이 없습니다.").foregroundStyle(.secondary)
                    } else {
                        ForEach(vm.records) { record in
                            RecordRow(record: record)
                        }
                    }
                }

                // 설정
                Section("설정") {
                    NavigationLink("앱 설정") { Text("설정") }
                    NavigationLink("저장한 루트") { Text("저장한 루트") }
                    Button("로그아웃", role: .destructive) {
                        TokenStorage.shared.clear()
                        NotificationCenter.default.post(name: .userLoggedOut, object: nil)
                    }
                }
            }
            .navigationTitle("프로필")
            .task { await vm.loadProfile(); await vm.loadHistory() }
        }
    }
}

// MARK: - Sub-views

struct RoundedTextField: View {
    let placeholder: String
    @Binding var text: String
    var keyboardType: UIKeyboardType = .default
    var isSecure: Bool = false

    var body: some View {
        Group {
            if isSecure {
                SecureField(placeholder, text: $text)
            } else {
                TextField(placeholder, text: $text).keyboardType(keyboardType)
            }
        }
        .padding(14)
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct PlanBadge: View {
    let plan: String
    var body: some View {
        Text(plan == "pro" ? "⭐ Pro" : "Free")
            .font(.caption2).fontWeight(.semibold)
            .padding(.horizontal, 8).padding(.vertical, 3)
            .background(plan == "pro" ? Color.yellow.opacity(0.2) : Color.gray.opacity(0.2))
            .foregroundStyle(plan == "pro" ? .orange : .secondary)
            .clipShape(Capsule())
    }
}

struct StatCard: View {
    let title: String
    let value: String
    var body: some View {
        VStack(spacing: 4) {
            Text(value).font(.title3).fontWeight(.bold)
            Text(title).font(.caption).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(12)
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .padding(4)
    }
}

struct RecordRow: View {
    let record: RunningRecord
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(record.startedAt, style: .date).font(.subheadline).fontWeight(.medium)
                HStack(spacing: 12) {
                    Text(String(format: "%.2fkm", record.actualDistanceKm)).font(.caption)
                    Text(record.formattedDuration).font(.caption)
                    Text(record.formattedPace + "/km").font(.caption)
                }
                .foregroundStyle(.secondary)
            }
            Spacer()
            Image(systemName: "chevron.right").font(.caption).foregroundStyle(.secondary)
        }
    }
}

extension Notification.Name {
    static let userLoggedIn = Notification.Name("userLoggedIn")
    static let userLoggedOut = Notification.Name("userLoggedOut")
}
