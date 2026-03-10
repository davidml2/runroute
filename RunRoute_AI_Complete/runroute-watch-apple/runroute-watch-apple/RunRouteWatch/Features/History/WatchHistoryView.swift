// WatchHistoryView.swift
import SwiftUI

struct WatchHistoryView: View {
    @State private var records: [WatchRecord] = WatchRecordStore.shared.recent()

    var body: some View {
        List {
            if records.isEmpty {
                VStack(spacing: 8) {
                    Text("🏃").font(.system(size: 30))
                    Text("아직 기록이 없어요").font(.system(size: 13)).foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding()
            } else {
                ForEach(records) { record in
                    VStack(alignment: .leading, spacing: 3) {
                        Text(record.dateLabel)
                            .font(.system(size: 11)).foregroundStyle(.secondary)
                        HStack(spacing: 8) {
                            Label(String(format: "%.2fkm", record.distanceKm),
                                  systemImage: "ruler")
                            Label(record.durationLabel, systemImage: "clock")
                        }
                        .font(.system(size: 12, weight: .medium))
                        if record.avgPace > 0 {
                            Text(record.paceLabel + " /km")
                                .font(.system(size: 11)).foregroundStyle(.secondary)
                        }
                    }
                    .padding(.vertical, 2)
                }
            }
        }
        .navigationTitle("기록")
    }
}

// MARK: - Watch Local Record Store
struct WatchRecord: Identifiable, Codable {
    let id: String
    let date: Date
    let distanceKm: Double
    let durationSeconds: Int
    let avgPace: Double
    let avgHR: Int

    var dateLabel: String {
        let f = DateFormatter(); f.dateFormat = "M/d HH:mm"; return f.string(from: date)
    }
    var durationLabel: String {
        let m = durationSeconds / 60; let s = durationSeconds % 60
        return String(format: "%02d:%02d", m, s)
    }
    var paceLabel: String {
        guard avgPace > 0 else { return "--'--\"" }
        let m = Int(avgPace) / 60; let s = Int(avgPace) % 60
        return "\(m)'\(String(format: "%02d", s))\""
    }
}

final class WatchRecordStore {
    static let shared = WatchRecordStore()
    private let key = "watch_records"

    func save(_ record: WatchRecord) {
        var all = recent(limit: 50)
        all.insert(record, at: 0)
        if let data = try? JSONEncoder().encode(all) {
            UserDefaults.standard.set(data, forKey: key)
        }
    }

    func recent(limit: Int = 20) -> [WatchRecord] {
        guard let data = UserDefaults.standard.data(forKey: key),
              let records = try? JSONDecoder().decode([WatchRecord].self, from: data)
        else { return [] }
        return Array(records.prefix(limit))
    }
}
