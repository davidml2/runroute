// RunRouteWatchApp.swift
import SwiftUI
import ClockKit

@main
struct RunRouteWatchApp: App {
    @StateObject private var connectivity = WatchConnectivityManager.shared

    var body: some Scene {
        WindowGroup {
            NavigationStack {
                TabView {
                    WatchHomeView()
                        .tabItem { Label("홈", systemImage: "map") }

                    WatchHistoryView()
                        .tabItem { Label("기록", systemImage: "list.bullet") }
                }
            }
        }
    }
}

// MARK: - Complication Provider (워치 페이스 컴플리케이션)
class RunRouteComplicationProvider: NSObject, CLKComplicationDataSource {

    func complicationDescriptors() async -> [CLKComplicationDescriptor] {
        return [
            CLKComplicationDescriptor(
                identifier: "runroute_main",
                displayName: "RunRoute AI",
                supportedFamilies: [
                    .modularSmall, .utilitarianSmall,
                    .circularSmall, .graphicCorner, .graphicCircular
                ]
            )
        ]
    }

    func currentTimelineEntry(for complication: CLKComplication) async -> CLKComplicationTimelineEntry? {
        let template = makeTemplate(for: complication.family)
        return template.map { CLKComplicationTimelineEntry(date: Date(), complicationTemplate: $0) }
    }

    private func makeTemplate(for family: CLKComplicationFamily) -> CLKComplicationTemplate? {
        switch family {
        case .modularSmall:
            let t = CLKComplicationTemplateModularSmallSimpleImage()
            t.imageProvider = CLKImageProvider(onePieceImage: UIImage(systemName: "figure.run")!)
            return t

        case .utilitarianSmall:
            let t = CLKComplicationTemplateUtilitarianSmallFlat()
            t.textProvider = CLKSimpleTextProvider(text: "RUN")
            return t

        case .graphicCorner:
            let t = CLKComplicationTemplateGraphicCornerTextImage()
            t.textProvider = CLKSimpleTextProvider(text: "RUN")
            t.imageProvider = CLKFullColorImageProvider(fullColorImage: UIImage(systemName: "figure.run")!)
            return t

        case .graphicCircular:
            let t = CLKComplicationTemplateGraphicCircularImage()
            t.imageProvider = CLKFullColorImageProvider(fullColorImage: UIImage(systemName: "figure.run")!)
            return t

        default:
            return nil
        }
    }
}
