import SceneKit
import SwiftUI

struct SchoolyardSceneView: UIViewRepresentable {
    @ObservedObject var model: MatchViewModel

    func makeCoordinator() -> Coordinator { Coordinator(model: model) }

    func makeUIView(context: Context) -> SCNView {
        let view = SCNView()
        view.scene = context.coordinator.buildScene()
        view.backgroundColor = UIColor(red: 0.48, green: 0.67, blue: 0.76, alpha: 1)
        view.antialiasingMode = .multisampling4X
        view.preferredFramesPerSecond = 60
        view.isPlaying = true
        view.rendersContinuously = true
        view.autoenablesDefaultLighting = false
        let pan = UIPanGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.pan(_:)))
        view.addGestureRecognizer(pan)
        context.coordinator.view = view
        return view
    }

    func updateUIView(_ view: SCNView, context: Context) {
        context.coordinator.sync(model: model)
    }

    @MainActor
    final class Coordinator: NSObject {
        weak var view: SCNView?
        private var model: MatchViewModel
        private var discNodes: [Int: SCNNode] = [:]
        private var rulerNodes: [SCNNode] = []
        private var cameras: [SCNNode] = []

        init(model: MatchViewModel) { self.model = model }

        func buildScene() -> SCNScene {
            let scene = SCNScene()
            scene.rootNode.addChildNode(ambientLight())
            scene.rootNode.addChildNode(sunLight())
            scene.rootNode.addChildNode(makeGround())
            scene.rootNode.addChildNode(makeTable())
            addPitchMarks(to: scene.rootNode)
            addGoals(to: scene.rootNode)
            addSchoolyard(to: scene.rootNode)
            for disc in model.physics.discs {
                let node = makeDisc(disc)
                discNodes[disc.id] = node
                scene.rootNode.addChildNode(node)
            }
            for ruler in model.physics.rulers {
                let node = makeRuler(ruler)
                rulerNodes.append(node)
                scene.rootNode.addChildNode(node)
            }
            cameras = makeCameras()
            cameras.forEach(scene.rootNode.addChildNode)
            scene.rootNode.camera = nil
            return scene
        }

        func sync(model: MatchViewModel) {
            self.model = model
            SCNTransaction.begin()
            SCNTransaction.animationDuration = model.phase == .replay ? 0 : 0.04
            for disc in model.physics.discs {
                discNodes[disc.id]?.position = SCNVector3(disc.position.x, 0.08, disc.position.y)
                discNodes[disc.id]?.opacity = 1
            }
            for (index, ruler) in model.physics.rulers.enumerated() {
                rulerNodes[index].position = SCNVector3(ruler.x, 0.13, 0)
                rulerNodes[index].eulerAngles.y = -Float(ruler.angle)
            }
            SCNTransaction.commit()
            if cameras.indices.contains(model.camera) { view?.pointOfView = cameras[model.camera] }
        }

        @objc func pan(_ gesture: UIPanGestureRecognizer) {
            guard let view, let point = groundPoint(gesture.location(in: view), view: view) else { return }
            let world = CGPoint(x: CGFloat(point.x), y: CGFloat(point.z))
            switch gesture.state {
            case .began: model.beginAim(at: world)
            case .changed: model.updateAim(to: world)
            case .ended, .cancelled: model.releaseAim(at: world)
            default: break
            }
        }

        private func groundPoint(_ point: CGPoint, view: SCNView) -> SCNVector3? {
            view.hitTest(point, options: [.searchMode: SCNHitTestSearchMode.all.rawValue])
                .first(where: { $0.node.name == "table" })?.worldCoordinates
        }

        private func makeGround() -> SCNNode {
            let node = SCNNode(geometry: SCNPlane(width: 14, height: 10))
            node.geometry?.firstMaterial?.diffuse.contents = UIColor(red: 0.62, green: 0.55, blue: 0.42, alpha: 1)
            node.eulerAngles.x = -.pi / 2
            node.position.y = -0.07
            return node
        }

        private func makeTable() -> SCNNode {
            let node = SCNNode(geometry: SCNBox(width: 3.24, height: 0.08, length: 2.24, chamferRadius: 0.025))
            node.name = "table"
            node.geometry?.firstMaterial?.diffuse.contents = UIColor(red: 0.66, green: 0.47, blue: 0.29, alpha: 1)
            node.position.y = -0.04
            return node
        }

        private func makeDisc(_ disc: Disc) -> SCNNode {
            let height: CGFloat = disc.kind == .ball ? 0.07 : 0.055
            let node = SCNNode(geometry: SCNCylinder(radius: disc.radius, height: height))
            let color: UIColor = disc.kind == .home ? .init(red: 0.83, green: 0.25, blue: 0.16, alpha: 1)
                : disc.kind == .away ? .init(red: 0.12, green: 0.31, blue: 0.62, alpha: 1)
                : .init(red: 0.9, green: 0.86, blue: 0.75, alpha: 1)
            node.geometry?.firstMaterial?.diffuse.contents = color
            node.geometry?.firstMaterial?.roughness.contents = 0.7
            node.position = SCNVector3(disc.position.x, 0.08, disc.position.y)
            return node
        }

        private func makeRuler(_ ruler: RulerState) -> SCNNode {
            let node = SCNNode(geometry: SCNBox(width: 0.6, height: 0.11, length: 0.024, chamferRadius: 0.004))
            node.geometry?.firstMaterial?.diffuse.contents = UIColor(red: 0.87, green: 0.67, blue: 0.31, alpha: 1)
            node.position = SCNVector3(ruler.x, 0.13, 0)
            return node
        }

        private func addPitchMarks(to root: SCNNode) {
            let material = SCNMaterial(); material.diffuse.contents = UIColor(white: 0.96, alpha: 0.75)
            for x in [-1.5, 0.0, 1.5] {
                let line = SCNNode(geometry: SCNBox(width: 0.012, height: 0.006, length: 2, chamferRadius: 0))
                line.geometry?.materials = [material]; line.position = SCNVector3(x, 0.006, 0); root.addChildNode(line)
            }
            let circle = SCNNode(geometry: SCNTorus(ringRadius: 0.23, pipeRadius: 0.007))
            circle.geometry?.materials = [material]; circle.position.y = 0.012; root.addChildNode(circle)
        }

        private func addGoals(to root: SCNNode) {
            for sign: Float in [-1, 1] {
                for z: Float in [-0.27, 0.27] {
                    let post = SCNNode(geometry: SCNCylinder(radius: 0.018, height: 0.24))
                    post.geometry?.firstMaterial?.diffuse.contents = UIColor.white
                    post.position = SCNVector3(sign * 1.54, 0.12, z); root.addChildNode(post)
                }
            }
        }

        private func addSchoolyard(to root: SCNNode) {
            for index in 0..<5 {
                let room = SCNNode(geometry: SCNBox(width: 1.15, height: 1.05, length: 0.65, chamferRadius: 0.02))
                room.geometry?.firstMaterial?.diffuse.contents = UIColor(red: 0.83, green: 0.72, blue: 0.48, alpha: 1)
                room.position = SCNVector3(Float(index - 2) * 1.2, 0.46, -3.2); root.addChildNode(room)
            }
        }

        private func makeCameras() -> [SCNNode] {
            [camera(at: SCNVector3(-3.7, 3.5, 3.6), fov: 42), camera(at: SCNVector3(0, 5.2, 0.01), fov: 38),
             camera(at: SCNVector3(-2.5, 1.25, 2.1), fov: 48)]
        }

        private func camera(at position: SCNVector3, fov: CGFloat) -> SCNNode {
            let node = SCNNode(); node.camera = SCNCamera(); node.camera?.fieldOfView = fov; node.position = position
            node.look(at: SCNVector3Zero); return node
        }

        private func ambientLight() -> SCNNode {
            let node = SCNNode(); node.light = SCNLight(); node.light?.type = .ambient
            node.light?.intensity = 480; node.light?.color = UIColor(red: 0.78, green: 0.86, blue: 0.94, alpha: 1); return node
        }

        private func sunLight() -> SCNNode {
            let node = SCNNode(); node.light = SCNLight(); node.light?.type = .directional
            node.light?.intensity = 1100; node.eulerAngles = SCNVector3(-0.9, -0.55, 0); node.light?.castsShadow = true; return node
        }
    }
}
