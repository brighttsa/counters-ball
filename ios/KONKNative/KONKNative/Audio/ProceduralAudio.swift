import AVFoundation
import UIKit

final class ProceduralAudio {
    private let engine = AVAudioEngine()
    private let player = AVAudioPlayerNode()
    private let ambience = AVAudioPlayerNode()
    private let format = AVAudioFormat(standardFormatWithSampleRate: 44_100, channels: 1)!

    init() {
        engine.attach(player)
        engine.attach(ambience)
        engine.connect(player, to: engine.mainMixerNode, format: format)
        engine.connect(ambience, to: engine.mainMixerNode, format: format)
    }

    func startAmbience() {
        guard !engine.isRunning else { return }
        try? AVAudioSession.sharedInstance().setCategory(.ambient, options: [.mixWithOthers])
        try? AVAudioSession.sharedInstance().setActive(true)
        try? engine.start()
        let bed = noiseBuffer(seconds: 2, volume: 0.012)
        ambience.scheduleBuffer(bed, at: nil, options: .loops)
        ambience.play()
    }

    func playFlick() { playTone(frequency: 118, seconds: 0.065, volume: 0.32, decay: 18) }
    func playImpact(strength: CGFloat) {
        playTone(frequency: 310, seconds: 0.04, volume: Float(0.08 + strength * 0.22), decay: 32)
    }
    func playRail(strength: CGFloat) {
        playTone(frequency: 540, seconds: 0.055, volume: Float(0.06 + strength * 0.15), decay: 28)
    }

    func playGoal() {
        [392.0, 523.25, 659.25].enumerated().forEach { index, frequency in
            DispatchQueue.main.asyncAfter(deadline: .now() + Double(index) * 0.1) { [weak self] in
                self?.playTone(frequency: frequency, seconds: 0.22, volume: 0.22, decay: 5)
            }
        }
    }

    func stop() {
        ambience.stop()
        player.stop()
        engine.stop()
    }

    private func playTone(frequency: Double, seconds: Double, volume: Float, decay: Float) {
        guard engine.isRunning else { return }
        let frames = AVAudioFrameCount(seconds * format.sampleRate)
        guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frames),
              let samples = buffer.floatChannelData?[0] else { return }
        buffer.frameLength = frames
        for frame in 0..<Int(frames) {
            let time = Double(frame) / format.sampleRate
            let envelope = exp(-Float(time) * decay)
            samples[frame] = sin(Float(2 * Double.pi * frequency * time)) * volume * envelope
        }
        player.scheduleBuffer(buffer)
        if !player.isPlaying { player.play() }
    }

    private func noiseBuffer(seconds: Double, volume: Float) -> AVAudioPCMBuffer {
        let frames = AVAudioFrameCount(seconds * format.sampleRate)
        let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frames)!
        buffer.frameLength = frames
        let samples = buffer.floatChannelData![0]
        var smooth: Float = 0
        for frame in 0..<Int(frames) {
            smooth = smooth * 0.985 + Float.random(in: -1...1) * 0.015
            samples[frame] = smooth * volume
        }
        return buffer
    }
}

enum Haptics {
    static func selection() { UISelectionFeedbackGenerator().selectionChanged() }
    static func impact(_ intensity: CGFloat) {
        UIImpactFeedbackGenerator(style: .rigid).impactOccurred(intensity: intensity)
    }
    static func goal() { UINotificationFeedbackGenerator().notificationOccurred(.success) }
}
