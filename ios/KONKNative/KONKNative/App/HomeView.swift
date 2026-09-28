import SwiftUI

// Kept as a compatibility entry point for existing Xcode tabs and previews.
// The canonical experience is the live game hosted by KONKWebGameView.
struct HomeView: View {
    var body: some View {
        KONKWebGameView()
    }
}

#Preview("KONK") {
    HomeView()
}
