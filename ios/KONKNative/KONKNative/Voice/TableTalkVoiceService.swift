import AVFAudio
import Combine
import LiveKit
import UIKit

@MainActor
final class TableTalkVoiceService: ObservableObject, RoomDelegate {
    enum State: String {
        case idle, connecting, listening, speaking
        case requestingMicrophone = "requesting-microphone"
    }
    @Published private(set) var state: State = .idle
    @Published private(set) var error: String?
    @Published private(set) var remoteSpeaking = false
    private var room: Room?
    private var track: LocalAudioTrack?
    private var publication: LocalTrackPublication?
    private var epoch = 0
    private var intent = 0
    private var backgroundObserver: NSObjectProtocol?
    private var interruptionObserver: NSObjectProtocol?

    init() {
        backgroundObserver = NotificationCenter.default.addObserver(
            forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main
        ) { [weak self] _ in Task { @MainActor in await self?.leave() } }
        interruptionObserver = NotificationCenter.default.addObserver(
            forName: AVAudioSession.interruptionNotification, object: nil, queue: .main
        ) { [weak self] notification in
            guard let value = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
                  value == AVAudioSession.InterruptionType.began.rawValue else { return }
            Task { @MainActor in await self?.leave() }
        }
    }

    deinit {
        if let backgroundObserver { NotificationCenter.default.removeObserver(backgroundObserver) }
        if let interruptionObserver { NotificationCenter.default.removeObserver(interruptionObserver) }
        let oldRoom = room, oldTrack = track
        Task { try? await oldTrack?.stop(); await oldRoom?.disconnect() }
    }

    func join(url: String, token: String) async {
        guard state == .idle else { return }
        epoch += 1
        let generation = epoch
        let connection = Room(delegate: self)
        room = connection; state = .connecting; error = nil
        do {
            try await connection.connect(url: url, token: token)
            guard epoch == generation else { await connection.disconnect(); return }
            state = .listening
        } catch {
            await connection.disconnect()
            if epoch == generation { room = nil; state = .idle; self.error = "voice-unavailable" }
        }
    }

    func unmute() async {
        guard state == .listening, let connection = room else { return }
        intent += 1
        let generation = epoch, captureIntent = intent
        state = .requestingMicrophone; error = nil
        let allowed = await AVAudioApplication.requestRecordPermission()
        guard epoch == generation, intent == captureIntent else { return }
        guard allowed else { state = .listening; error = "microphone-unavailable"; return }
        let captured = await LocalAudioTrack.createTrack()
        guard epoch == generation, intent == captureIntent else { try? await captured.stop(); return }
        track = captured
        do {
            let published = try await connection.localParticipant.publish(audioTrack: captured)
            guard epoch == generation, intent == captureIntent else {
                try? await captured.stop()
                try? await connection.localParticipant.unpublish(publication: published)
                return
            }
            publication = published; state = .speaking
        } catch {
            try? await captured.stop()
            if epoch == generation, intent == captureIntent {
                track = nil; state = .listening; self.error = "microphone-unavailable"
            }
        }
    }

    func mute() async {
        intent += 1
        let captured = track, published = publication, connection = room
        track = nil; publication = nil
        if state == .speaking || state == .requestingMicrophone { state = .listening }
        try? await captured?.stop()
        if let published, let connection {
            try? await connection.localParticipant.unpublish(publication: published)
        }
    }

    func leave() async {
        epoch += 1; intent += 1
        let captured = track, connection = room
        track = nil; publication = nil; room = nil; state = .idle; remoteSpeaking = false
        try? await captured?.stop()
        await connection?.disconnect()
    }

    nonisolated func room(_ room: Room, didUpdateSpeakingParticipants speakers: [Participant]) {
        let localIdentity = room.localParticipant.identity
        let active = speakers.contains(where: { $0.identity != localIdentity })
        Task { @MainActor [weak self] in
            guard let self, self.room === room else { return }
            remoteSpeaking = active
        }
    }
}
