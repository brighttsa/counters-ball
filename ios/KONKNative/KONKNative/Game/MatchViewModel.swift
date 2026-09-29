import CoreGraphics
import UIKit

@MainActor
final class MatchViewModel: ObservableObject {
    enum Side { case home, away }
    enum Phase: Equatable { case aiming, moving, replay, won, lost }

    @Published private(set) var physics = FlickPhysics()
    @Published private(set) var phase: Phase = .aiming
    @Published private(set) var turn: Side = .home
    @Published private(set) var homeFlicks = 0
    @Published private(set) var awayFlicks = 0
    @Published private(set) var banner = "YOUR FLICK"
    @Published var camera = 0
    @Published var selectedDisc: Int?
    @Published var aimPoint: CGPoint?

    private var timer: Timer?
    private var lastTick = CACurrentMediaTime()
    private var settledFrames = 0
    private var replayFrames: [[Disc]] = []
    private var replayIndex = 0
    private var goalHandled = false
    private let audio = ProceduralAudio()
    var onHomeWin: ((Int) -> Void)?

    init() { reset() }

    func start() {
        audio.startAmbience()
        lastTick = CACurrentMediaTime()
        timer?.invalidate()
        timer = .scheduledTimer(withTimeInterval: 1 / 60, repeats: true) { [weak self] _ in
            Task { @MainActor in self?.tick() }
        }
    }

    func stop() {
        timer?.invalidate()
        timer = nil
        audio.stop()
    }

    func reset() {
        stop()
        physics = FlickPhysics()
        let home = [CGPoint(x: -1.18, y: 0), CGPoint(x: -0.72, y: -0.54),
                    CGPoint(x: -0.72, y: 0.54), CGPoint(x: -0.28, y: 0)]
        let away = [CGPoint(x: 1.18, y: 0), CGPoint(x: 0.72, y: -0.54),
                    CGPoint(x: 0.72, y: 0.54), CGPoint(x: 0.28, y: 0)]
        physics.discs = home.enumerated().map { Disc(id: $0, kind: .home, radius: 0.085, mass: 1.2,
                                                       position: $1, previous: $1) }
        physics.discs += away.enumerated().map { Disc(id: $0 + 4, kind: .away, radius: 0.085, mass: 1.2,
                                                       position: $1, previous: $1) }
        physics.discs.append(Disc(id: 8, kind: .ball, radius: 0.055, mass: 0.45,
                                  position: .zero, previous: .zero))
        phase = .aiming
        turn = .home
        homeFlicks = 0
        awayFlicks = 0
        banner = "YOUR FLICK"
        selectedDisc = nil
        aimPoint = nil
        replayFrames = []
        goalHandled = false
    }

    func beginAim(at point: CGPoint) {
        guard phase == .aiming, turn == .home else { return }
        let candidates = physics.discs.filter { $0.kind == .home }
        guard let nearest = candidates.min(by: { $0.position.distance(to: point) < $1.position.distance(to: point) }),
              nearest.position.distance(to: point) < 0.22 else { return }
        selectedDisc = nearest.id
        aimPoint = point
        Haptics.selection()
    }

    func updateAim(to point: CGPoint) {
        guard selectedDisc != nil else { return }
        aimPoint = point
    }

    func releaseAim(at point: CGPoint) {
        guard let id = selectedDisc,
              let disc = physics.discs.first(where: { $0.id == id }) else { return }
        let pull = disc.position - point
        let strength = min(4.2, pull.length * 6.2)
        guard strength > 0.18 else { selectedDisc = nil; aimPoint = nil; return }
        physics.flick(id: id, velocity: CGVector(dx: pull.x, dy: pull.y).unit.scaled(strength))
        homeFlicks += 1
        beginMotion()
    }

    private func beginMotion() {
        phase = .moving
        banner = turn == .home ? "GOOD TOUCH" : "KWAME FLICKS"
        selectedDisc = nil
        aimPoint = nil
        settledFrames = 0
        replayFrames = []
        goalHandled = false
        audio.playFlick()
        Haptics.impact(0.65)
    }

    private func tick() {
        guard phase == .moving else { return }
        let now = CACurrentMediaTime()
        let delta = min(1 / 30, now - lastTick)
        lastTick = now
        let events = physics.advance(CGFloat(delta))
        replayFrames.append(physics.discs)
        if replayFrames.count > 210 { replayFrames.removeFirst() }
        for event in events { handle(event) }
        guard !goalHandled else { return }
        if physics.isResting { settledFrames += 1 } else { settledFrames = 0 }
        if settledFrames > 8 { finishTurn() }
    }

    private func handle(_ event: PhysicsEvent) {
        switch event.kind {
        case .impact: audio.playImpact(strength: event.strength)
        case .rail: audio.playRail(strength: event.strength)
        case .goal(let sign): scoreGoal(homeScored: sign > 0)
        }
    }

    private func scoreGoal(homeScored: Bool) {
        guard !goalHandled else { return }
        goalHandled = true
        phase = .replay
        banner = homeScored ? "GOAL!" : "KWAME SCORES"
        audio.playGoal()
        Haptics.goal()
        replayIndex = 0
        playReplay(homeScored: homeScored)
    }

    private func playReplay(homeScored: Bool) {
        guard replayIndex < replayFrames.count else {
            phase = homeScored ? .won : .lost
            banner = homeScored ? "RULER RULES" : "SO CLOSE"
            if homeScored { onHomeWin?(homeFlicks) }
            return
        }
        physics.discs = replayFrames[replayIndex]
        replayIndex += 2
        DispatchQueue.main.asyncAfter(deadline: .now() + 1 / 60) { [weak self] in
            self?.playReplay(homeScored: homeScored)
        }
    }

    private func finishTurn() {
        if homeFlicks >= 14 && awayFlicks >= 14 { phase = .lost; banner = "LAST BELL"; return }
        turn = turn == .home ? .away : .home
        physics.turnRuler(attackingHome: turn == .home)
        if turn == .away {
            banner = "KWAME LINES IT UP"
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.7) { [weak self] in self?.makeAIShot() }
        } else {
            phase = .aiming
            banner = "YOUR FLICK"
        }
    }

    private func makeAIShot() {
        guard turn == .away, phase == .moving || phase == .aiming else { return }
        let ball = physics.discs.first { $0.kind == .ball }!
        let candidates = physics.discs.filter { $0.kind == .away }
        let cap = candidates.min { $0.position.distance(to: ball.position) < $1.position.distance(to: ball.position) }!
        let target = CGPoint(x: -1.53, y: CGFloat.random(in: -0.14...0.14))
        let approach = (ball.position - cap.position).unit
        let goalBias = (target - ball.position).unit
        let aimX: CGFloat = approach.dx * 0.82 + goalBias.dx * 0.18
        let aimZ: CGFloat = approach.dy * 0.82 + goalBias.dy * 0.18
        let direction = CGVector(dx: aimX, dy: aimZ).unit
        physics.flick(id: cap.id, velocity: direction.scaled(2.5))
        awayFlicks += 1
        beginMotion()
    }
}
