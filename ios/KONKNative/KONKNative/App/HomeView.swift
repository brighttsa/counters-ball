import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var progress: ProgressStore
    @State private var playing = false

    var body: some View {
        ZStack {
            KONKTheme.charcoal.ignoresSafeArea()
            if playing {
                MatchView(onExit: { playing = false })
                    .transition(.opacity)
            } else {
                menu
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.25), value: playing)
    }

    private var menu: some View {
        VStack(alignment: .leading, spacing: 22) {
            Spacer()
            Text("KONK")
                .font(.system(size: 68, weight: .black, design: .rounded))
                .foregroundStyle(KONKTheme.chalk)
            Text("SCHOOLYARD BREAK")
                .font(.headline.weight(.black))
                .foregroundStyle(KONKTheme.gold)
            Text("Adabraka Primary, Accra")
                .font(.title3.weight(.semibold))
                .foregroundStyle(KONKTheme.chalk.opacity(0.78))
            Divider().overlay(KONKTheme.chalk.opacity(0.25))
            HStack(spacing: 26) {
                stat("WINS", value: "\(progress.schoolyardWins)")
                stat("BEST", value: progress.bestFlicks.map { "\($0) FLICKS" } ?? "--")
            }
            Button {
                playing = true
            } label: {
                Label("PLAY RULER RULES", systemImage: "play.fill")
                    .font(.headline.weight(.black))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 17)
            }
            .buttonStyle(.plain)
            .foregroundStyle(KONKTheme.ink)
            .background(KONKTheme.gold)
            .clipShape(RoundedRectangle(cornerRadius: 6))
            Spacer().frame(height: 24)
        }
        .padding(.horizontal, 28)
        .frame(maxWidth: 560)
    }

    private func stat(_ label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.caption.weight(.bold)).foregroundStyle(KONKTheme.chalk.opacity(0.55))
            Text(value).font(.title3.weight(.black)).foregroundStyle(KONKTheme.chalk)
        }
    }
}

#Preview("KONK Native") {
    let previewDefaults = UserDefaults(suiteName: "world.konk.native.preview")!
    HomeView()
        .environmentObject(ProgressStore(defaults: previewDefaults))
}
