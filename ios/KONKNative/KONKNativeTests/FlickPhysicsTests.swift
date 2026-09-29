import XCTest
@testable import KONKNative

final class FlickPhysicsTests: XCTestCase {
    func testSquareCollisionTransfersVelocity() {
        var physics = FlickPhysics()
        physics.discs = [
            Disc(id: 0, kind: .home, radius: 0.1, mass: 1, position: .init(x: 0, y: 0),
                 previous: .init(x: 0, y: 0), velocity: .init(dx: 2, dy: 0)),
            Disc(id: 1, kind: .ball, radius: 0.06, mass: 0.5, position: .init(x: 0.155, y: 0),
                 previous: .init(x: 0.155, y: 0))
        ]
        _ = physics.advance(1 / 120)
        XCTAssertGreaterThan(physics.discs[1].velocity.dx, 0)
    }

    func testRulerAdvancesFortyFiveDegrees() {
        var physics = FlickPhysics()
        physics.turnRuler(attackingHome: true)
        XCTAssertEqual(physics.rulers[1].angle, .pi / 4, accuracy: 0.0001)
        XCTAssertEqual(physics.rulers[0].angle, 0, accuracy: 0.0001)
    }

    func testGoalOnlyCountsInsideMouth() {
        var physics = FlickPhysics()
        physics.discs = [Disc(id: 0, kind: .ball, radius: 0.055, mass: 0.45,
                              position: .init(x: 1.5, y: 0), previous: .init(x: 1.5, y: 0),
                              velocity: .init(dx: 2, dy: 0))]
        let events = physics.advance(1 / 30)
        XCTAssertTrue(events.contains { if case .goal(1) = $0.kind { true } else { false } })
    }
}
