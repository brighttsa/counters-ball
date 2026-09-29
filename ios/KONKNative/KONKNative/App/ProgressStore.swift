import Foundation

@MainActor
final class ProgressStore: ObservableObject {
    @Published private(set) var schoolyardWins: Int
    @Published private(set) var bestFlicks: Int?

    private let defaults: UserDefaults
    private enum Key {
        static let wins = "konk.native.schoolyard.wins"
        static let best = "konk.native.schoolyard.best-flicks"
    }

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        schoolyardWins = defaults.integer(forKey: Key.wins)
        let best = defaults.integer(forKey: Key.best)
        bestFlicks = best > 0 ? best : nil
    }

    func recordWin(flicks: Int) {
        schoolyardWins += 1
        bestFlicks = min(bestFlicks ?? flicks, flicks)
        defaults.set(schoolyardWins, forKey: Key.wins)
        defaults.set(bestFlicks, forKey: Key.best)
    }
}
