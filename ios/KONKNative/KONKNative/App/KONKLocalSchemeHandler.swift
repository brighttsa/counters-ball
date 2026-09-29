import Foundation
import WebKit

final class KONKLocalSchemeHandler: NSObject, WKURLSchemeHandler {
    static let scheme = "konk-local"
    private let root: URL

    override init() {
        guard let root = Bundle.main.resourceURL?.appendingPathComponent("KONKGame", isDirectory: true) else {
            fatalError("KONKGame is missing from the application bundle")
        }
        self.root = root.standardizedFileURL
        super.init()
    }

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let requestURL = urlSchemeTask.request.url,
              requestURL.scheme == Self.scheme,
              requestURL.host == "game" else {
            fail(urlSchemeTask, domain: NSURLErrorDomain, code: NSURLErrorBadURL)
            return
        }

        let relativePath = requestURL.path == "/" ? "index.html" : String(requestURL.path.dropFirst())
        let fileURL = root.appendingPathComponent(relativePath).standardizedFileURL
        guard fileURL.path.hasPrefix(root.path + "/"),
              FileManager.default.fileExists(atPath: fileURL.path) else {
            fail(urlSchemeTask, domain: NSCocoaErrorDomain, code: NSFileNoSuchFileError)
            return
        }

        do {
            let data = try Data(contentsOf: fileURL, options: .mappedIfSafe)
            let response = URLResponse(
                url: requestURL,
                mimeType: Self.mimeType(for: fileURL.pathExtension),
                expectedContentLength: data.count,
                textEncodingName: Self.isText(fileURL.pathExtension) ? "utf-8" : nil
            )
            urlSchemeTask.didReceive(response)
            urlSchemeTask.didReceive(data)
            urlSchemeTask.didFinish()
        } catch {
            urlSchemeTask.didFailWithError(error)
        }
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}

    private func fail(_ task: WKURLSchemeTask, domain: String, code: Int) {
        task.didFailWithError(NSError(domain: domain, code: code))
    }

    private static func isText(_ ext: String) -> Bool {
        ["css", "html", "js", "json", "svg", "webmanifest"].contains(ext.lowercased())
    }

    private static func mimeType(for ext: String) -> String {
        switch ext.lowercased() {
        case "css": "text/css"
        case "html": "text/html"
        case "js": "text/javascript"
        case "json", "webmanifest": "application/json"
        case "svg": "image/svg+xml"
        case "png": "image/png"
        case "jpg", "jpeg": "image/jpeg"
        case "mp3": "audio/mpeg"
        case "ttf": "font/ttf"
        default: "application/octet-stream"
        }
    }
}
