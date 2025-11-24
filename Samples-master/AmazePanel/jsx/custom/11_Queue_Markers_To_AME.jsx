(function () {
    // Helper: Load configuration
    function loadConfig() {
        try {
            var scriptFile = new File($.fileName);
            var panelRoot = scriptFile.parent.parent.parent; // .../AmazePanel
            if (!panelRoot) return null;
            var cfg = new File(panelRoot.fullName + "/flow_config.json");
            if (cfg.exists) {
                cfg.encoding = "UTF-8";
                if (cfg.open("r")) {
                    var txt = cfg.read();
                    cfg.close();
                    try { return JSON.parse(txt); } catch (eJSON) { return null; }
                }
            }
        } catch (e) { }
        return null;
    }

    // Helper: Sanitize filename
    function sanitizeFilename(name) {
        return name.replace(/[^a-zA-Z0-9_\-]/g, "_");
    }

    // Helper: Load Showflow file
    function loadShowflow(flowPath) {
        if (!flowPath) return null;
        var f = new File(flowPath);
        if (!f.exists) return null;
        try {
            f.encoding = "UTF-8";
            if (f.open("r")) {
                var txt = f.read();
                f.close();
                return JSON.parse(txt);
            }
        } catch (e) { }
        return null;
    }

    // Helper: FPS
    function getFPS(seq) {
        var fps = 60;
        try {
            if (seq.videoFrameRate && seq.videoFrameRate.seconds) {
                var v = 1 / Number(seq.videoFrameRate.seconds);
                if (v > 0) fps = Math.round(v);
            }
        } catch (e) { }
        return fps;
    }

    var TICKS_PER_SECOND = 254016000000;

    try {
        // 1. Check Active Sequence
        var seq = app.project.activeSequence;
        if (!seq) {
            alert("❌ No active sequence selected.");
            return;
        }

        // 2. Load Config
        var cfg = loadConfig();
        if (!cfg || !cfg.renderPreset || !cfg.renderOutput) {
            alert("❌ Configuration missing (renderPreset or renderOutput) in flow_config.json.");
            return;
        }

        var presetPath = cfg.renderPreset;
        var outDir = cfg.renderOutput;
        var presetFile = new File(presetPath);
        var outFolder = new Folder(outDir);
        var flowPath = cfg.flowPath;

        if (!presetFile.exists) {
            alert("❌ Preset file not found: " + presetPath);
            return;
        }
        if (!outFolder.exists) {
            alert("❌ Output folder not found: " + outDir);
            return;
        }

        // 3. Get Markers
        var markers = seq.markers;
        if (!markers || markers.numMarkers < 2) {
            alert("❌ Not enough markers to define segments (need at least 2).");
            return;
        }

        var markerList = [];
        var currentMarker = markers.getFirstMarker();
        while (currentMarker) {
            markerList.push(currentMarker);
            currentMarker = markers.getNextMarker(currentMarker);
        }

        // Sort markers by time
        markerList.sort(function (a, b) {
            return Number(a.start.ticks) - Number(b.start.ticks);
        });

        // 3.5 Integrity check against Showflow
        var flow = loadShowflow(flowPath);
        if (!flow || !flow.slots || !flow.slots.length) {
            alert("❌ Showflow not loaded or has no slots.\nflowPath: " + flowPath);
            return;
        }
        var fps = getFPS(seq);
        var slotList = flow.slots.slice().sort(function (a, b) { return Number(a.time || 0) - Number(b.time || 0); });

        var errors = [];
        if (markerList.length !== slotList.length) {
            errors.push("Marker count " + markerList.length + " != slots " + slotList.length);
        }

        var count = Math.min(markerList.length, slotList.length);
        for (var m = 0; m < count; m++) {
            var mk = markerList[m];
            var sl = slotList[m];
            var mkFrame = Math.round((Number(mk.start.ticks) / TICKS_PER_SECOND) * fps);
            var expectedFrame = Number(sl.time || 0);
            if (mkFrame !== expectedFrame) {
                errors.push("[" + m + "] time mismatch: marker " + mkFrame + "f vs slot " + expectedFrame + "f");
            }
            var mkName = mk.name || "";
            var expectedName = sl.name || "";
            if (expectedName && mkName !== expectedName) {
                errors.push("[" + m + "] name mismatch: marker '" + mkName + "' vs slot '" + expectedName + "'");
            }
        }

        if (errors.length > 0) {
            alert("❌ Integrity check failed:\n" + errors.join("\n"));
            return;
        }

        // 4. Launch Encoder
        if (!app.encoder) {
            alert("❌ Encoder object not available.");
            return;
        }
        app.encoder.launchEncoder();

        var baseName = seq.name || "Sequence";
        var ext = ".mp4";
        if (/mov/i.test(presetPath)) ext = ".mov"; // Simple check, can be improved
        if (/mxf/i.test(presetPath)) ext = ".mxf";

        var successCount = 0;

        // 5. Loop and Queue
        for (var i = 0; i < markerList.length - 1; i++) {
            var startMarker = markerList[i];
            var endMarker = markerList[i + 1];

            // Set In/Out
            seq.setInPoint(startMarker.start.ticks);
            // Subtract 1 tick to avoid overlapping start of next segment
            // Note: In some workflows, you might want exact overlap, but usually -1 is good for cuts.
            // However, ticks are very small units. 
            seq.setOutPoint((Number(endMarker.start.ticks) - 1).toString());

            // Construct Filename
            // User request: Use marker name for output filename
            var segmentIndex = (i + 1);
            var fileName;
            if (startMarker.name && startMarker.name.length > 0) {
                fileName = sanitizeFilename(startMarker.name) + ext;
            } else {
                fileName = baseName + "_" + segmentIndex + ext;
            }

            // Normalize path for Windows (AME can be picky with mixed slashes)
            var outPath = outFolder.fsName + "\\" + fileName;
            var presetFsName = presetFile.fsName;

            if ($.os.indexOf("Windows") !== -1) {
                outPath = outPath.replace(/\//g, "\\");
                presetFsName = presetFsName.replace(/\//g, "\\");
            }

            // Encode
            // 1: In/Out
            var rangeToEncode = app.encoder.ENCODE_IN_TO_OUT !== undefined ? app.encoder.ENCODE_IN_TO_OUT : 1;
            var removeFromQueue = 1;

            var jobID = app.encoder.encodeSequence(seq, outPath, presetFsName, rangeToEncode, removeFromQueue);

            if (jobID) {
                $.writeln("Queued: " + fileName);
                successCount++;
            } else {
                $.writeln("Failed to queue: " + fileName);
            }
        }

        alert("✅ Queued " + successCount + " segments to AME.");

    } catch (e) {
        alert("🔥 Error: " + e.toString());
    }
})();
