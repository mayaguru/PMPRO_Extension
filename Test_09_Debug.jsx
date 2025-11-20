/**
 * 09 Test - Premiere 2025 호환성 디버깅
 */

function log(msg) {
    $.writeln("[DEBUG] " + msg);
}

log("=== 09 Debug START ===");

try {
    // Step 1: 기본 환경 체크
    log("Step 1: Checking basic environment...");
    if (typeof app === "undefined") {
        throw new Error("app object is undefined - not running in Premiere");
    }
    log("✓ app object exists");

    // Step 2: app.project 체크 (2025에서 변경 가능성)
    log("Step 2: Checking app.project...");
    if (!app.project) {
        throw new Error("app.project is null/undefined");
    }
    log("✓ app.project exists");

    // Step 3: activeSequence 체크
    log("Step 3: Checking activeSequence...");
    if (!app.project.activeSequence) {
        throw new Error("No active sequence - please open a sequence first");
    }
    var seq = app.project.activeSequence;
    log("✓ activeSequence exists: " + seq.name);

    // Step 4: 시퀀스 프로퍼티들 체크
    log("Step 4: Checking sequence properties...");
    var props = ["name", "markers", "videoTracks", "audioTracks"];
    for (var i = 0; i < props.length; i++) {
        var prop = props[i];
        try {
            var val = seq[prop];
            if (val !== undefined) {
                log("✓ seq." + prop + " exists");
            } else {
                log("⚠ seq." + prop + " is undefined");
            }
        } catch (e) {
            log("✗ seq." + prop + " access failed: " + e);
        }
    }

    // Step 5: Markers 상세 체크
    log("Step 5: Checking markers...");
    try {
        var markers = seq.markers;
        if (markers) {
            log("✓ seq.markers exists");

            // numMarkers 체크
            try {
                var count = markers.numMarkers;
                log("✓ markers.numMarkers = " + count);

                if (count > 0) {
                    // 첫 마커 읽기 시도
                    var firstMarker = markers.getFirstMarker();
                    if (firstMarker) {
                        log("✓ getFirstMarker() works");
                        log("  - name: " + (firstMarker.name || "unnamed"));
                        log("  - start: " + (firstMarker.start || "unknown"));
                    } else {
                        log("⚠ getFirstMarker() returned null");
                    }
                }
            } catch (e) {
                log("✗ markers.numMarkers access failed: " + e);
            }
        } else {
            log("✗ seq.markers is null/undefined");
        }
    } catch (e) {
        log("✗ seq.markers access failed: " + e);
    }

    // Step 6: Video Tracks 체크
    log("Step 6: Checking videoTracks...");
    try {
        var videoTracks = seq.videoTracks;
        if (videoTracks) {
            log("✓ seq.videoTracks exists");

            // 트랙 개수 체크
            var trackCount = 0;
            try {
                if (videoTracks.numTracks !== undefined) {
                    trackCount = videoTracks.numTracks;
                } else if (videoTracks.length !== undefined) {
                    trackCount = videoTracks.length;
                }
                log("✓ videoTracks count = " + trackCount);

                if (trackCount > 0) {
                    // 첫 트랙 접근 시도
                    var firstTrack = videoTracks[0];
                    if (firstTrack) {
                        log("✓ videoTracks[0] access works");

                        // 클립 체크
                        try {
                            var clips = firstTrack.clips;
                            if (clips) {
                                log("✓ track.clips exists");

                                var clipCount = 0;
                                if (clips.numItems !== undefined) {
                                    clipCount = clips.numItems;
                                } else if (clips.length !== undefined) {
                                    clipCount = clips.length;
                                }
                                log("✓ clips count = " + clipCount);
                            } else {
                                log("⚠ track.clips is null");
                            }
                        } catch (e) {
                            log("✗ track.clips access failed: " + e);
                        }
                    } else {
                        log("⚠ videoTracks[0] is null");
                    }
                }
            } catch (e) {
                log("✗ videoTracks enumeration failed: " + e);
            }
        } else {
            log("✗ seq.videoTracks is null/undefined");
        }
    } catch (e) {
        log("✗ seq.videoTracks access failed: " + e);
    }

    // Step 7: FPS 감지 테스트
    log("Step 7: Testing FPS detection...");
    try {
        var fps = 0;
        if (seq.framerate) {
            fps = seq.framerate;
            log("✓ seq.framerate = " + fps);
        } else if (seq.videoFrameRate && seq.videoFrameRate.seconds) {
            fps = 1 / seq.videoFrameRate.seconds;
            log("✓ seq.videoFrameRate = " + fps);
        } else if (seq.timebase) {
            fps = seq.timebase;
            log("✓ seq.timebase = " + fps);
        } else {
            fps = 60; // default
            log("⚠ Using default FPS = " + fps);
        }
    } catch (e) {
        log("✗ FPS detection failed: " + e);
    }

    alert("✓ Debug completed!\n\nCheck ExtendScript Toolkit console for detailed results.\n\nPress OK to see summary.");

    // 최종 결과 요약
    var summary = "=== DEBUG SUMMARY ===\n\n";
    summary += "Environment: Premiere " + (app.version || "unknown") + "\n";
    summary += "Project: " + (app.project.name || "unnamed") + "\n";
    summary += "Sequence: " + seq.name + "\n";
    summary += "Markers: " + (seq.markers ? (seq.markers.numMarkers || "unknown") : "N/A") + "\n";
    summary += "Video Tracks: " + (seq.videoTracks ? (seq.videoTracks.numTracks || seq.videoTracks.length || "unknown") : "N/A") + "\n\n";

    summary += "If the script fails, check the console output above for specific errors.";

    alert(summary);

} catch (e) {
    log("FATAL ERROR: " + e.toString());
    log("Stack: " + (e.stack || "No stack"));
    log("Line: " + (e.line || "Unknown"));

    var errorMsg = "Script failed at step detection.\n\nError: " + e.toString();
    if (e.line) errorMsg += "\nLine: " + e.line;
    errorMsg += "\n\nCheck ExtendScript Toolkit console for full debug output.";

    alert(errorMsg);
}

log("=== 09 Debug END ===");
