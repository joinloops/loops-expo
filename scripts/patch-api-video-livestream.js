const fs = require('fs');
const path = require('path');

const PACKAGE_ROOT = path.resolve(__dirname, '../node_modules/@api.video/react-native-livestream');

const PACKAGE_JSON = path.join(PACKAGE_ROOT, 'package.json');
const SWIFT_FILE = path.join(PACKAGE_ROOT, 'ios', 'RNLiveStreamViewImpl.swift');

function fail(message) {
    console.error(`[patch-api-video-livestream] ${message}`);
    process.exit(1);
}

function patchPackageJson() {
    if (!fs.existsSync(PACKAGE_JSON)) {
        fail(`Package not found at ${PACKAGE_JSON}`);
    }

    const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));

    pkg.codegenConfig ??= {};
    pkg.codegenConfig.ios ??= {};
    pkg.codegenConfig.ios.componentProvider ??= {};

    const current = pkg.codegenConfig.ios.componentProvider.ApiVideoLiveStreamView;

    if (current === 'RNLiveStreamView') {
        console.log('[patch-api-video-livestream] Fabric componentProvider already patched.');
        return;
    }

    pkg.codegenConfig.ios.componentProvider.ApiVideoLiveStreamView = 'RNLiveStreamView';

    fs.writeFileSync(PACKAGE_JSON, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');

    console.log('[patch-api-video-livestream] Added iOS Fabric componentProvider mapping.');
}

function patchSwiftFile() {
    if (!fs.existsSync(SWIFT_FILE)) {
        fail(`Swift file not found at ${SWIFT_FILE}`);
    }

    const patchedSource = String.raw`
//
//  RNLiveStreamViewImpl.swift
//  api.video-reactnative-live-stream
//

import ApiVideoLiveStream
import AVFoundation
import CoreGraphics
import Foundation

extension String {
    func toCaptureDevicePosition() -> AVCaptureDevice.Position {
        switch self {
        case "back":
            return AVCaptureDevice.Position.back
        case "front":
            return AVCaptureDevice.Position.front
        default:
            return AVCaptureDevice.Position.unspecified
        }
    }
}

extension AVCaptureDevice.Position {
    func toCameraPositionName() -> String {
        switch self {
        case AVCaptureDevice.Position.back:
            return "back"
        case AVCaptureDevice.Position.front:
            return "front"
        default:
            return "unspecified"
        }
    }
}

@objc(RNLiveStreamViewImpl)
public class RNLiveStreamViewImpl: UIView {
    private static let logTag = "🎥 LiveStream"

    private var liveStream: ApiVideoLiveStream?
    private var isStreaming: Bool = false
    private var isTornDown: Bool = false

    private lazy var zoomGesture: UIPinchGestureRecognizer = .init(target: self, action: #selector(zoom(sender:)))
    private let pinchZoomMultiplier: CGFloat = 2.2

    override init(frame: CGRect) {
        super.init(frame: frame)

        do {
            liveStream = try ApiVideoLiveStream(
                preview: self,
                initialAudioConfig: nil,
                initialVideoConfig: nil,
                initialCamera: nil
            )
            liveStream?.delegate = self
        } catch {
            print("\(Self.logTag) init failed: \(error)")
        }

        addGestureRecognizer(zoomGesture)
    }

    @available(*, unavailable)
    required init?(coder _: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    // MARK: - Teardown

    private func teardownCapture(_ source: String) {
        if isTornDown {
            return
        }

        isTornDown = true

        print("\(Self.logTag) teardown from \(source)")

        if isStreaming {
            isStreaming = false
            liveStream?.stopStreaming()
        }

        liveStream?.stopPreview()
        liveStream?.delegate = nil
        liveStream = nil

        do {
            try AVAudioSession.sharedInstance().setActive(
                false,
                options: .notifyOthersOnDeactivation
            )
        } catch {
            print("\(Self.logTag) audio session deactivate failed: \(error)")
        }
    }

    @objc override public func willMove(toWindow newWindow: UIWindow?) {
        super.willMove(toWindow: newWindow)

        if newWindow == nil {
            teardownCapture("willMove(toWindow: nil)")
        }
    }

    @objc override public func removeFromSuperview() {
        super.removeFromSuperview()
        teardownCapture("removeFromSuperview")
    }

    deinit {
        teardownCapture("deinit")
    }

    // MARK: - Configuration

    private var videoBitrate: Int {
        get {
            return liveStream?.videoBitrate ?? 0
        }
        set {
            liveStream?.videoBitrate = newValue
        }
    }

    private var audioConfig: AudioConfig? {
        get {
            liveStream?.audioConfig
        }
        set {
            guard let newValue = newValue else {
                return
            }

            liveStream?.audioConfig = newValue
        }
    }

    private var videoConfig: VideoConfig? {
        get {
            liveStream?.videoConfig
        }
        set {
            guard let newValue = newValue else {
                return
            }

            liveStream?.videoConfig = newValue
        }
    }

    @objc public var audio: NSDictionary = [:] {
        didSet {
            guard liveStream != nil,
                  let bitrate = audio["bitrate"] as? Int
            else {
                return
            }

            audioConfig = AudioConfig(bitrate: bitrate)
        }
    }

    @objc public var video: NSDictionary = [:] {
        didSet {
            guard liveStream != nil,
                  let bitrate = video["bitrate"] as? Int
            else {
                return
            }

            if isStreaming {
                videoBitrate = bitrate
                return
            }

            guard let resolution = video["resolution"] as? [String: Int],
                  let width = resolution["width"],
                  let height = resolution["height"],
                  let fps = video["fps"] as? Float64,
                  let gopDuration = video["gopDuration"] as? Float64
            else {
                return
            }

            videoConfig = VideoConfig(
                bitrate: bitrate,
                resolution: CGSize(width: width, height: height),
                fps: fps,
                gopDuration: gopDuration
            )
        }
    }

    @objc public var camera: String {
        get {
            return liveStream?.cameraPosition.toCameraPositionName()
                ?? "unspecified"
        }
        set {
            guard let liveStream = liveStream else {
                return
            }

            let value = newValue.toCaptureDevicePosition()

            if value == liveStream.cameraPosition {
                return
            }

            liveStream.cameraPosition = value
        }
    }

    @objc public var isMuted: Bool {
        get {
            return liveStream?.isMuted ?? false
        }
        set {
            guard let liveStream = liveStream else {
                return
            }

            if newValue == liveStream.isMuted {
                return
            }

            liveStream.isMuted = newValue
        }
    }

    @objc public var zoomRatio: Float {
        get {
            return Float(liveStream?.zoomRatio ?? 1.0)
        }
        set {
            liveStream?.zoomRatio = CGFloat(newValue)
        }
    }

    @objc public var enablePinchedZoom: Bool {
        get {
            return zoomGesture.isEnabled
        }
        set {
            zoomGesture.isEnabled = newValue
        }
    }

    // MARK: - Streaming

    @objc public func startStreaming(
        requestId: Int,
        streamKey: String,
        url: String?
    ) {
        guard let liveStream = liveStream else {
            print("\(Self.logTag) startStreaming called after teardown")

            onStartStreaming([
                "requestId": requestId,
                "result": false,
                "error": "Camera session is not available",
            ])

            return
        }

        do {
            if let url = url {
                try liveStream.startStreaming(
                    streamKey: streamKey,
                    url: url
                )
            } else {
                try liveStream.startStreaming(streamKey: streamKey)
            }

            isStreaming = true

            onStartStreaming([
                "requestId": requestId,
                "result": true,
                "error": "",
            ])
        } catch let LiveStreamError.IllegalArgumentError(message) {
            onStartStreaming([
                "requestId": requestId,
                "result": false,
                "error": message,
            ])
        } catch {
            onStartStreaming([
                "requestId": requestId,
                "result": false,
                "error": error.localizedDescription,
            ])
        }
    }

    @objc public func stopStreaming() {
        isStreaming = false
        liveStream?.stopStreaming()
    }

    @objc public func setZoomRatio(zoomRatio: CGFloat) {
        liveStream?.zoomRatio = zoomRatio
    }

    @objc
    private func zoom(sender: UIPinchGestureRecognizer) {
        guard let liveStream = liveStream else {
            return
        }

        if sender.state == .changed {
            liveStream.zoomRatio =
                liveStream.zoomRatio
                + (sender.scale - 1) * pinchZoomMultiplier

            sender.scale = 1
        }
    }

    // MARK: - Events

    @objc public var onConnectionSuccess:
        (_ dictionnary: [String: Any]) -> Void = { _ in }

    @objc public var onConnectionFailed:
        (_ dictionnary: [String: Any]) -> Void = { _ in }

    @objc public var onDisconnect:
        (_ dictionnary: [String: Any]) -> Void = { _ in }

    @objc public var onStartStreaming:
        (_ dictionnary: [String: Any]) -> Void = { _ in }
}

extension RNLiveStreamViewImpl: ApiVideoLiveStreamDelegate {
    /// Called when the connection to the rtmp server is successful
    public func connectionSuccess() {
        onConnectionSuccess([:])
    }

    /// Called when the connection to the rtmp server failed
    public func connectionFailed(_ code: String) {
        isStreaming = false
        onConnectionFailed(["code": code])
    }

    /// Called when the connection to the rtmp server is closed
    public func disconnection() {
        isStreaming = false
        onDisconnect([:])
    }

    /// Called if an error happened during the audio configuration
    public func audioError(_: Error) {}

    /// Called if an error happened during the video configuration
    public func videoError(_: Error) {}
}
`;

    const currentSource = fs.readFileSync(SWIFT_FILE, 'utf8');

    if (currentSource === patchedSource) {
        console.log('[patch-api-video-livestream] RNLiveStreamViewImpl.swift already patched.');
        return;
    }

    fs.writeFileSync(SWIFT_FILE, patchedSource, 'utf8');

    console.log(
        '[patch-api-video-livestream] Patched RNLiveStreamViewImpl.swift teardown behavior.',
    );
}

function main() {
    console.log('[patch-api-video-livestream] Applying patches...');

    patchPackageJson();
    patchSwiftFile();

    console.log('[patch-api-video-livestream] Done.');
}

main();
