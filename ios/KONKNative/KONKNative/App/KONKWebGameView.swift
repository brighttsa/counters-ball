import SwiftUI
import WebKit

struct KONKWebGameView: View {
    @State private var state: LoadState = .loading
    @State private var reloadID = UUID()

    var body: some View {
        ZStack {
            Color(red: 18 / 255, green: 18 / 255, blue: 16 / 255).ignoresSafeArea()
            KONKWebView(state: $state)
                .id(reloadID)
                .ignoresSafeArea()

            if state != .ready {
                status
            }
        }
        .statusBarHidden(state == .ready)
        .persistentSystemOverlays(state == .ready ? .hidden : .automatic)
    }

    @ViewBuilder
    private var status: some View {
        ZStack {
            Color(red: 18 / 255, green: 18 / 255, blue: 16 / 255)
                .ignoresSafeArea()

            VStack(spacing: 18) {
                switch state {
                case .loading:
                    ProgressView().tint(Color(red: 223 / 255, green: 185 / 255, blue: 79 / 255))
                case .failed:
                    Text("KONK could not open its local game files.")
                        .font(.headline)
                        .multilineTextAlignment(.center)
                        .foregroundStyle(.white.opacity(0.72))
                    Button("TRY AGAIN") {
                        state = .loading
                        reloadID = UUID()
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Color(red: 223 / 255, green: 185 / 255, blue: 79 / 255))
                    .foregroundStyle(.black)
                case .ready:
                    EmptyView()
                }
            }
            .padding(28)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .ignoresSafeArea()
    }
}

private enum LoadState: Equatable {
    case loading
    case ready
    case failed
}

private struct KONKWebView: UIViewRepresentable {
    @Binding var state: LoadState

    func makeCoordinator() -> Coordinator { Coordinator(state: $state) }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = [.audio]
        configuration.websiteDataStore = .default()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        configuration.setURLSchemeHandler(KONKLocalSchemeHandler(),
                                          forURLScheme: KONKLocalSchemeHandler.scheme)
        configuration.userContentController.addUserScript(WKUserScript(
            source: """
            document.documentElement.classList.add('konk-native');
            window.__KONK_PUBLIC_BASE_URL__ = 'https://konk.world/';
            """,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        ))

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.contentInset = .zero
        webView.scrollView.scrollIndicatorInsets = .zero
        webView.scrollView.bounces = false
        webView.scrollView.showsHorizontalScrollIndicator = false
        webView.scrollView.showsVerticalScrollIndicator = false
        webView.scrollView.keyboardDismissMode = .interactive
        webView.allowsLinkPreview = false
        webView.isInspectable = true
        webView.load(URLRequest(url: URL(string: "konk-local://game/index.html")!))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate {
        private var state: Binding<LoadState>

        init(state: Binding<LoadState>) { self.state = state }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation?) {
            state.wrappedValue = .ready
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation?, withError error: Error) {
            state.wrappedValue = .failed
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation?,
                     withError error: Error) {
            state.wrappedValue = .failed
        }
    }
}

#Preview("Local KONK") {
    KONKWebGameView()
}
