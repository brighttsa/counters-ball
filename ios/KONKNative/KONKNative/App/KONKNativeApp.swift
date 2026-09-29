import SwiftUI

@main
struct KONKNativeApp: App {
    var body: some Scene {
        WindowGroup {
            KONKWebGameView()
                .preferredColorScheme(.dark)
        }
    }
}
