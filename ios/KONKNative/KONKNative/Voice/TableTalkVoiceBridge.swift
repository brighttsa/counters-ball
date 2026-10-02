import WebKit

@MainActor
final class TableTalkVoiceBridge: NSObject, WKScriptMessageHandlerWithReply {
    static let handlerName = "konkTableTalk"
    private var service: TableTalkVoiceService?
    private var attached = true

    static func isBundledMainPage(_ url: URL?) -> Bool {
        guard let url else { return false }
        return url.scheme == "konk-local" && url.host == "game" &&
            url.path == "/index.html" && url.user == nil && url.password == nil && url.port == nil
    }

    static func navigationPolicy(_ url: URL?) -> WKNavigationActionPolicy {
        let allowed = isBundledMainPage(url)
        return allowed ? .allow : .cancel
    }

    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage,
                               replyHandler: @escaping (Any?, String?) -> Void) {
        guard attached, message.name == Self.handlerName, message.frameInfo.isMainFrame,
              Self.isBundledMainPage(message.frameInfo.request.url),
              Self.isBundledMainPage(message.webView?.url),
              let body = message.body as? [String: String],
              let command = body["command"],
              ["join", "unmute", "mute", "leave", "status"].contains(command) else {
            replyHandler(nil, "Voice command rejected"); return
        }
        if command == "status" {
            replyHandler(snapshot(), nil); return
        }
        if command == "join" {
            guard Set(body.keys) == Set(["command", "url", "token"]),
                  body["url"] == "wss://konk-table-talk-s8plkl4y.livekit.cloud",
                  let token = body["token"], !token.isEmpty, token.utf8.count <= 8192 else {
                replyHandler(nil, "Voice command rejected"); return
            }
        } else if Set(body.keys) != Set(["command"]) {
            replyHandler(nil, "Voice command rejected"); return
        }
        if service == nil { service = TableTalkVoiceService() }
        guard let voice = service else { replyHandler(nil, "Voice unavailable"); return }
        Task { @MainActor [weak self] in
            guard let self, attached else { replyHandler(nil, "Voice unavailable"); return }
            switch command {
            case "join": await voice.join(url: body["url"]!, token: body["token"]!)
            case "unmute": await voice.unmute()
            case "mute": await voice.mute()
            case "leave": await voice.leave()
            default: break
            }
            replyHandler(snapshot(), nil)
        }
    }

    private func snapshot() -> [String: Any] {
        ["state": service?.state.rawValue ?? "idle", "error": service?.error as Any? ?? NSNull(),
         "remoteSpeaking": service?.remoteSpeaking ?? false]
    }

    func detach(from controller: WKUserContentController) {
        attached = false
        controller.removeScriptMessageHandler(forName: Self.handlerName)
        let voice = service; service = nil
        Task { @MainActor in await voice?.leave() }
    }
}
