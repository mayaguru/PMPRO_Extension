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
