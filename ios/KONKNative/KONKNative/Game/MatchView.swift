import SwiftUI

struct MatchView: View {
    @EnvironmentObject private var progress: ProgressStore
    @StateObject private var model = MatchViewModel()
    let onExit: () -> Void

    var body: some View {
        ZStack {
            SchoolyardSceneView(model: model).ignoresSafeArea()
            VStack(spacing: 0) {
                topBar
                Spacer()
                if model.phase == .aiming { aimHint }
                if model.phase == .won || model.phase == .lost { resultPanel }
                statusBar
            }
        }
        .onAppear {
            model.onHomeWin = { progress.recordWin(flicks: $0) }
            model.start()
        }
        .onDisappear { model.stop() }
    }

    private var topBar: some View {
        HStack(spacing: 12) {
            Button(action: onExit) {
                Image(systemName: "xmark").frame(width: 42, height: 42)
            }
            .accessibilityLabel("Leave match")
            Spacer()
            VStack(spacing: 2) {
                Text("RULER RULES").font(.caption.weight(.black))
                Text("FIRST TO 1").font(.caption2.weight(.bold)).opacity(0.65)
            }
            Spacer()
            Menu {
                Button("Broadcast") { model.camera = 0 }
                Button("Tactical") { model.camera = 1 }
                Button("Street") { model.camera = 2 }
            } label: {
                Image(systemName: "video.fill").frame(width: 42, height: 42)
            }
            .accessibilityLabel("Change camera")
        }
        .foregroundStyle(KONKTheme.chalk)
        .padding(.horizontal, 12)
        .padding(.top, 8)
        .background(.black.opacity(0.62))
    }

    private var aimHint: some View {
        Text("Touch a red cap. Pull back. Release.")
            .font(.subheadline.weight(.bold))
            .foregroundStyle(KONKTheme.ink)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(KONKTheme.chalk.opacity(0.92))
            .clipShape(RoundedRectangle(cornerRadius: 5))
            .padding(.bottom, 14)
    }

    private var resultPanel: some View {
        VStack(spacing: 14) {
            Text(model.phase == .won ? "YOU BEAT KWAME" : "KWAME TAKES IT")
                .font(.title2.weight(.black))
            Text(model.phase == .won ? "The schoolyard is yours." : "Read the ruler. Go again.")
                .foregroundStyle(KONKTheme.chalk.opacity(0.72))
            HStack(spacing: 12) {
                Button("EXIT", action: onExit)
                Button("REMATCH") { model.reset(); model.start() }
            }
            .buttonStyle(ResultButtonStyle())
        }
        .foregroundStyle(KONKTheme.chalk)
        .padding(22)
        .background(KONKTheme.charcoal.opacity(0.96))
        .clipShape(RoundedRectangle(cornerRadius: 7))
        .padding(.horizontal, 22)
        .padding(.bottom, 18)
    }

    private var statusBar: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(model.banner).font(.headline.weight(.black)).foregroundStyle(KONKTheme.gold)
                Text(rulerStatus).font(.caption.weight(.semibold)).foregroundStyle(KONKTheme.chalk.opacity(0.7))
            }
            Spacer()
            Text("\(model.homeFlicks) / 14")
                .font(.title3.monospacedDigit().weight(.black))
                .foregroundStyle(KONKTheme.chalk)
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 14)
        .background(.black.opacity(0.72))
    }

    private var rulerStatus: String {
        let attacked = model.physics.rulers[model.turn == .home ? 1 : 0]
        let names = ["OPEN", "SLANTED", "ACROSS", "SLANTED BACK"]
        return "THEIR RULER: \(names[attacked.step % 4])"
    }
}

private struct ResultButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline.weight(.black))
            .foregroundStyle(KONKTheme.ink)
            .padding(.horizontal, 18)
            .padding(.vertical, 12)
            .background(KONKTheme.gold.opacity(configuration.isPressed ? 0.7 : 1))
            .clipShape(RoundedRectangle(cornerRadius: 5))
    }
}
