import CoreGraphics

struct Disc: Identifiable, Equatable {
    enum Kind { case home, away, ball }
    let id: Int
    let kind: Kind
    let radius: CGFloat
    let mass: CGFloat
    var position: CGPoint
    var previous: CGPoint
    var velocity: CGVector = .zero
}

struct RulerState: Equatable {
    let x: CGFloat
    var step: Int = 0
    var angle: CGFloat { CGFloat(step % 4) * .pi / 4 }
}

struct PhysicsEvent {
    enum Kind { case impact, rail, goal(Int) }
    let kind: Kind
    let strength: CGFloat
}

struct FlickPhysics {
    static let fixedStep: CGFloat = 1 / 240
    static let wallX: CGFloat = 1.62
    static let wallZ: CGFloat = 1.12
    static let goalX: CGFloat = 1.53
    static let goalHalfWidth: CGFloat = 0.26

    var discs: [Disc] = []
    var rulers = [RulerState(x: -0.75), RulerState(x: 0.75)]
    private var accumulator: CGFloat = 0

    var isResting: Bool {
        discs.allSatisfy { hypot($0.velocity.dx, $0.velocity.dy) == 0 }
    }

    mutating func advance(_ delta: CGFloat) -> [PhysicsEvent] {
        accumulator = min(accumulator + delta, 0.1)
        var events: [PhysicsEvent] = []
        while accumulator >= Self.fixedStep {
            events.append(contentsOf: step(Self.fixedStep))
            accumulator -= Self.fixedStep
        }
        return events
    }

    mutating func flick(id: Int, velocity: CGVector) {
        guard let index = discs.firstIndex(where: { $0.id == id }) else { return }
        discs[index].velocity = velocity
    }

    mutating func turnRuler(attackingHome: Bool) {
        let index = attackingHome ? 1 : 0
        let oldAngle = rulers[index].angle
        rulers[index].step += 1
        for sample in 1...12 {
            let angle = oldAngle + CGFloat(sample) * (.pi / 4) / 12
            for discIndex in discs.indices { pushClear(discIndex, ruler: rulers[index], angle: angle) }
        }
    }

    private mutating func step(_ h: CGFloat) -> [PhysicsEvent] {
        var events: [PhysicsEvent] = []
        for index in discs.indices {
            discs[index].previous = discs[index].position
            let speed = hypot(discs[index].velocity.dx, discs[index].velocity.dy)
            guard speed > 0 else { continue }
            let isBall = discs[index].kind == .ball
            let damping: CGFloat = isBall ? 1 : 1.7
            let baseFriction: CGFloat = isBall ? 0.14 : 0.32
            let settle: CGFloat = speed < 0.12 ? 0.6 : 0
            let next = max(0, speed - (damping * speed + baseFriction + settle) * h)
            discs[index].velocity = next < 0.015 ? .zero : discs[index].velocity.scaled(next / speed)
            discs[index].position.x += discs[index].velocity.dx * h
            discs[index].position.y += discs[index].velocity.dy * h
        }
        resolveDiscCollisions(events: &events)
        resolveRulers(events: &events)
        resolveRails(events: &events)
        return events
    }

    private mutating func resolveDiscCollisions(events: inout [PhysicsEvent]) {
        guard discs.count > 1 else { return }
        for first in 0..<(discs.count - 1) {
            for second in (first + 1)..<discs.count {
                let delta = discs[second].position - discs[first].position
                let distance = hypot(delta.x, delta.y)
                let minimum = discs[first].radius + discs[second].radius
                guard distance > 0, distance < minimum else { continue }
                let normal = CGVector(dx: delta.x / distance, dy: delta.y / distance)
                let invA = 1 / discs[first].mass, invB = 1 / discs[second].mass
                let push = (minimum - distance) / (invA + invB)
                discs[first].position -= normal.scaled(push * invA)
                discs[second].position += normal.scaled(push * invB)
                let relative = discs[second].velocity - discs[first].velocity
                let approach = relative.dot(normal)
                guard approach < 0 else { continue }
                let square = min(1, -approach / max(relative.length, 0.001))
                let restitution = 0.6 + 0.2 * square * square
                let impulse = -(1 + restitution) * approach / (invA + invB)
                discs[first].velocity -= normal.scaled(impulse * invA)
                discs[second].velocity += normal.scaled(impulse * invB)
                if impulse > 0.02 { events.append(.init(kind: .impact, strength: min(1, impulse))) }
            }
        }
    }

    private mutating func resolveRulers(events: inout [PhysicsEvent]) {
        for ruler in rulers {
            let direction = CGVector(dx: cos(ruler.angle), dy: sin(ruler.angle))
            for index in discs.indices {
                let fromPivot = discs[index].position - CGPoint(x: ruler.x, y: 0)
                let along = max(-0.3, min(0.3, fromPivot.dot(direction)))
                let nearest = CGPoint(x: ruler.x + direction.dx * along, y: direction.dy * along)
                let delta = discs[index].position - nearest
                let distance = hypot(delta.x, delta.y)
                let minimum = discs[index].radius + 0.012
                guard distance > 0, distance < minimum else { continue }
                let normal = CGVector(dx: delta.x / distance, dy: delta.y / distance)
                discs[index].position += normal.scaled(minimum - distance)
                let approach = discs[index].velocity.dot(normal)
                if approach < 0 {
                    discs[index].velocity -= normal.scaled(1.72 * approach)
                    events.append(.init(kind: .impact, strength: min(1, -approach * 0.4)))
                }
            }
        }
    }

    private mutating func resolveRails(events: inout [PhysicsEvent]) {
        for index in discs.indices {
            if discs[index].kind == .ball, abs(discs[index].position.x) > Self.goalX,
               abs(discs[index].position.y) < Self.goalHalfWidth - discs[index].radius {
                events.append(.init(kind: .goal(discs[index].position.x > 0 ? 1 : -1), strength: 1))
            }
            bounce(index, keyPath: \.x, limit: Self.wallX, events: &events)
            bounce(index, keyPath: \.y, limit: Self.wallZ, events: &events)
        }
    }

    private mutating func bounce(_ index: Int, keyPath: WritableKeyPath<CGPoint, CGFloat>, limit: CGFloat,
                                 events: inout [PhysicsEvent]) {
        let value = discs[index].position[keyPath: keyPath]
        let radius = discs[index].radius
        guard value - radius < -limit || value + radius > limit else { return }
        let sign: CGFloat = value < 0 ? -1 : 1
        discs[index].position[keyPath: keyPath] = sign * (limit - radius)
        if keyPath == \.x {
            discs[index].velocity.dx = -discs[index].velocity.dx * 0.72
            discs[index].velocity.dy *= 0.8
        } else {
            discs[index].velocity.dy = -discs[index].velocity.dy * 0.72
            discs[index].velocity.dx *= 0.8
        }
        events.append(.init(kind: .rail, strength: min(1, discs[index].velocity.length * 0.3)))
    }

    private mutating func pushClear(_ index: Int, ruler: RulerState, angle: CGFloat) {
        let direction = CGVector(dx: cos(angle), dy: sin(angle))
        let relative = discs[index].position - CGPoint(x: ruler.x, y: 0)
        let along = max(-0.3, min(0.3, relative.dot(direction)))
        let nearest = CGPoint(x: ruler.x + direction.dx * along, y: direction.dy * along)
        let delta = discs[index].position - nearest
        let distance = hypot(delta.x, delta.y), minimum = discs[index].radius + 0.016
        guard distance < minimum else { return }
        let normal = distance > 0 ? CGVector(dx: delta.x / distance, dy: delta.y / distance)
            : CGVector(dx: -sin(angle), dy: cos(angle))
        discs[index].position += normal.scaled(minimum - distance)
    }
}

extension CGVector {
    var length: CGFloat { hypot(dx, dy) }
    var unit: CGVector { scaled(1 / max(length, 0.001)) }
    func scaled(_ value: CGFloat) -> CGVector { .init(dx: dx * value, dy: dy * value) }
    func dot(_ other: CGVector) -> CGFloat { dx * other.dx + dy * other.dy }
    static func - (lhs: CGVector, rhs: CGVector) -> CGVector { .init(dx: lhs.dx - rhs.dx, dy: lhs.dy - rhs.dy) }
    static func + (lhs: CGVector, rhs: CGVector) -> CGVector { .init(dx: lhs.dx + rhs.dx, dy: lhs.dy + rhs.dy) }
    static func -= (lhs: inout CGVector, rhs: CGVector) { lhs = lhs - rhs }
    static func += (lhs: inout CGVector, rhs: CGVector) { lhs = lhs + rhs }
}

extension CGPoint {
    var length: CGFloat { hypot(x, y) }
    var unit: CGVector { CGVector(dx: x, dy: y).unit }
    func distance(to other: CGPoint) -> CGFloat { (self - other).length }
    func dot(_ vector: CGVector) -> CGFloat { x * vector.dx + y * vector.dy }
    static func - (lhs: CGPoint, rhs: CGPoint) -> CGPoint { .init(x: lhs.x - rhs.x, y: lhs.y - rhs.y) }
    static func += (lhs: inout CGPoint, rhs: CGVector) { lhs = .init(x: lhs.x + rhs.dx, y: lhs.y + rhs.dy) }
    static func -= (lhs: inout CGPoint, rhs: CGVector) { lhs += rhs.scaled(-1) }
}
