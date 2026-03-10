// WatchLocationManager.swift
import CoreLocation

final class WatchLocationManager: NSObject, CLLocationManagerDelegate {
    static let shared = WatchLocationManager()
    var onLocationUpdate: ((Double, Double) -> Void)?
    var lastLocation: CLLocation?

    private let manager = CLLocationManager()

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
        manager.distanceFilter = 5
        manager.activityType = .fitness
        manager.allowsBackgroundLocationUpdates = true
        manager.requestAlwaysAuthorization()
    }

    func startTracking() { manager.startUpdatingLocation() }
    func stopTracking() { manager.stopUpdatingLocation() }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let loc = locations.last, loc.horizontalAccuracy < 50 else { return }
        lastLocation = loc
        onLocationUpdate?(loc.coordinate.latitude, loc.coordinate.longitude)
    }
}
