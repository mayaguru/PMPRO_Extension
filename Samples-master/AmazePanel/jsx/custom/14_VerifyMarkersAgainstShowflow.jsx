(function () {
    // Load flow_config.json (renderPreset/renderOutput/flowPath)
    function loadConfig() {
        try {
            var scriptFile = new File($.fileName); // .../jsx/custom/14_VerifyMarkersAgainstShowflow.jsx
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
        var seq = app.project.activeSequence;
        if (!seq) {
            alert("❌ 활성 시퀀스가 없습니다.");
            return;
        }

        var cfg = loadConfig();
        if (!cfg || !cfg.flowPath) {
            alert("❌ flow_config.json 에 flowPath가 없습니다.");
            return;
        }

        var flow = loadShowflow(cfg.flowPath);
        if (!flow || !flow.slots || !flow.slots.length) {
            alert("❌ Showflow를 불러올 수 없거나 slots가 없습니다.\n" + cfg.flowPath);
            return;
        }

        var markers = seq.markers;
        if (!markers || markers.numMarkers === 0) {
            alert("❌ 시퀀스에 마커가 없습니다.");
            return;
        }

        // Collect markers
        var markerList = [];
        var m = markers.getFirstMarker();
        while (m) {
            markerList.push(m);
            m = markers.getNextMarker(m);
        }
        markerList.sort(function (a, b) {
            return Number(a.start.ticks) - Number(b.start.ticks);
        });

        // Collect slots sorted by time
        var slotList = flow.slots.slice().sort(function (a, b) {
            return Number(a.time || 0) - Number(b.time || 0);
        });

        var fps = getFPS(seq);
        var errors = [];

        if (markerList.length !== slotList.length) {
            errors.push("개수 불일치: 마커 " + markerList.length + " vs 슬롯 " + slotList.length);
        }

        var count = Math.min(markerList.length, slotList.length);
        for (var i = 0; i < count; i++) {
            var mk = markerList[i];
            var sl = slotList[i];
            var mkFrame = Math.round((Number(mk.start.ticks) / TICKS_PER_SECOND) * fps);
            var slotFrame = Number(sl.time || 0);
            if (mkFrame !== slotFrame) {
                errors.push("[" + i + "] 시간 불일치: 마커 " + mkFrame + "f vs 슬롯 " + slotFrame + "f");
            }
            var mkName = mk.name || "";
            var slotName = sl.name || "";
            if (slotName && mkName !== slotName) {
                errors.push("[" + i + "] 이름 불일치: 마커 '" + mkName + "' vs 슬롯 '" + slotName + "'");
            }
        }

        if (errors.length === 0) {
            alert("✅ 마커와 Showflow가 일치합니다.\n마커/슬롯 개수: " + markerList.length);
        } else {
            alert("⚠️ 불일치 발견 (" + errors.length + "건):\n" + errors.join("\n"));
        }

    } catch (e) {
        alert("🔥 오류: " + e.toString());
    }
})();
