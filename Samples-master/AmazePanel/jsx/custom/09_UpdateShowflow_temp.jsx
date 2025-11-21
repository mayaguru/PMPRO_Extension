/**
 * 09_UpdateShowflowFromTimeline
 * 현재 시퀀스를 마커 기준으로 분할하고, 각 슬롯에 배치된 클립 정보를
 * <showId>.showflow.json 에 덮어씁니다.
 *
 * 형식 예시 (flow/TXTB.showflow.JSON 참고):
 * {
 *   "showId": "TXTSceneSelect1",
 *   "fps": 60,
 *   "tracks": { "A":0,"B":1,"C":2,"D":3,"E":4,"F":5,"G":6,"H":7 },
 *   "slots": [
 *     { "time":0, "duration":600, "clips": { "A": {"name":"...", "duration":600, "in":0, "out":600} } },
 *     ...
 *   ]
 * }
 *
 * 동작 요약
 * 1) 활성 시퀀스/프로젝트 확인 → FPS 추출 (seq.videoFrameRate.seconds → timebase → 기본 60)
 * 2) showId = 시퀀스 이름(입력창에서 수정 가능)
 * 3) JSON 파일 찾기: (1) 프로젝트 경로/<showId>.showflow.json or .JSON
 *                   (2) Scripts/flow/<showId>.showflow.JSON
 *                   (3) 없으면 파일 선택 다이얼로그 → 없으면 새로 생성
 * 4) 마커를 시간순으로 정렬, 슬롯 = [마커..다음마커-1], 마지막 슬롯은 트랙 종료 지점이나 기본 600프레임
 * 5) tracks 맵에 따라 트랙을 스캔, 슬롯과 겹치는 첫 번째 클립을 기록
 *    - name: trackItem.name 또는 projectItem.name
 *    - duration: 클립 길이(프레임) ; in/out: 슬롯 기준 상대 프레임
 * 6) slots를 덮어쓰고 파일 저장
 */

(function () {
    var DEFAULT_FPS = 60;
    var DEFAULT_SLOT_FRAMES = 600; // 마커가 없거나 마지막 슬롯 끝을 알 수 없을 때
    var TICKS_PER_SECOND = 254016000000;

    // ---------- utils ----------
    function log(msg) { $.writeln("[Showflow] " + msg); }

    function timeToFrames(t, fps) {
        if (!t) return 0;
        if (t.ticks !== undefined) return Math.round(Number(t.ticks) / (TICKS_PER_SECOND / fps));
        if (t.seconds !== undefined) return Math.round(Number(t.seconds) * fps);
        return 0;
    }

    function detectFPS(seq) {
        try {
            if (seq.videoFrameRate && seq.videoFrameRate.seconds) {
                var f = 1 / Number(seq.videoFrameRate.seconds);
                if (f > 0) return Math.round(f);
            }
        } catch (e) { }
        try {
            if (seq.timebase && !isNaN(seq.timebase)) return Number(seq.timebase);
        } catch (e2) { }
        try {
            if (seq.framerate && !isNaN(seq.framerate)) return Number(seq.framerate);
        } catch (e3) { }
        return DEFAULT_FPS;
    }

    function collectMarkers(seq, fps) {
        var res = [];
        if (!seq.markers) return res;
        var m = seq.markers.getFirstMarker();
        while (m) {
            res.push({
                frame: timeToFrames(m.start, fps),
                name: m.name || "",
                raw: m
            });
            m = seq.markers.getNextMarker(m);
        }
        res.sort(function (a, b) { return a.frame - b.frame; });
        return res;
    }

    function maxClipEndFrame(seq, fps) {
        var maxF = 0;
        if (!seq.videoTracks) return maxF;
        var vt = seq.videoTracks;
        for (var i = 0; i < vt.numTracks; i++) {
            var tr = vt[i];
            if (!tr || !tr.clips) continue;
            for (var c = 0; c < tr.clips.numItems; c++) {
                var clip = tr.clips[c];
                var endF = timeToFrames(clip.end, fps);
                if (endF > maxF) maxF = endF;
            }
        }
        return maxF;
    }

    function stringify(obj) {
        if (typeof JSON !== "undefined" && JSON.stringify) {
            try { return JSON.stringify(obj, null, 2); } catch (e) { }
        }
        // minimal fallback
        var txt = "{";
        for (var k in obj) {
            if (!obj.hasOwnProperty(k)) continue;
            txt += '"' + k + '":';
            var v = obj[k];
            if (typeof v === "string") {
                txt += '"' + v.replace(/"/g, '\\"') + '"';
            } else if (typeof v === "number" || typeof v === "boolean") {
                txt += v;
            } else if (v instanceof Array) {
                txt += "[...]";
            } else {
                txt += "{...}";
            }
            txt += ",";
        }
        if (txt.charAt(txt.length - 1) === ",") txt = txt.slice(0, -1);
        return txt + "}";
    }

    function defaultTrackMap() {
        return { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7 };
    }

    function loadShowflow(showId) {
        var f = null, path = "";
        // read flow_config.json from extension root (same folder as this script lives under jsx/custom/..)
        try {
            var scriptFile = new File($.fileName);            // .../jsx/custom/09_UpdateShowflow_temp.jsx
            var panelRoot = scriptFile.parent.parent.parent;  // -> .../AmazePanel
            if (panelRoot) {
                var cfg = new File(panelRoot.fullName + "/flow_config.json");
                if (cfg.exists) {
                    cfg.encoding = "UTF-8";
                    if (cfg.open("r")) {
                        var txtCfg = cfg.read();
                        cfg.close();
                        var obj;
                        try { obj = JSON.parse(txtCfg); } catch (eJSON) { obj = null; }
                        if (obj && obj.flowPath) {
                            var candidateCfg = new File(obj.flowPath);
                            if (candidateCfg.exists) {
                                f = candidateCfg;
                                path = candidateCfg.fsName || candidateCfg.fullName;
                            }
                        }
                    }
                }
            }
        } catch (eCfg) { }

        // fallback search
        if (!f && app.project && app.project.path) {
            var projFile = new File(app.project.path);
            var candidates = [
                projFile.path + "/" + showId + ".showflow.json",
                projFile.path + "/" + showId + ".showflow.JSON",
                projFile.path + "/flow/" + showId + ".showflow.JSON",
                "D:/_DEV/PremiereScripts/Scripts/flow/" + showId + ".showflow.JSON",
                "D:/_DEV/PremiereScripts/Scripts/flow/" + showId + ".showflow.json"
            ];
            for (var i = 0; i < candidates.length; i++) {
                var c = new File(candidates[i]);
                if (c.exists) { f = c; path = c.fsName || c.fullName; break; }
            }
        }

        if (!f) {
            f = File.openDialog("Select showflow JSON", "JSON:*.json");
            if (!f) return { error: "No JSON selected." };
            path = f.fsName || f.fullName;
        }
        f.encoding = "UTF-8";
        if (!f.open("r")) return { error: "Cannot open JSON: " + path };
        var txt = f.read();
        f.close();
        try {
            var data = (typeof JSON !== "undefined" && JSON.parse) ? JSON.parse(txt) : eval("(" + txt + ")");
            return { data: data, file: f, path: path };
        } catch (e) {
            return { error: "JSON parse error: " + e };
        }
    }

    function saveShowflow(fileObj, data) {
        var txt = stringify(data);
        fileObj.encoding = "UTF-8";
        if (!fileObj.open("w")) return "Cannot open file for write: " + (fileObj.fsName || fileObj.fullName);
        fileObj.write(txt);
        fileObj.close();
        return null;
    }

    function buildSlots(seq, markers, tracksMap, fps) {
        var vt = seq.videoTracks;
        var maxTrackIdx = 0;
        for (var k in tracksMap) {
            if (tracksMap.hasOwnProperty(k)) {
                if (tracksMap[k] > maxTrackIdx) maxTrackIdx = tracksMap[k];
            }
        }
        if (vt.numTracks <= maxTrackIdx) {
            log("Warning: Not enough video tracks. Needed >= " + (maxTrackIdx + 1));
        }

        var slots = [];
        var maxEnd = Math.max(maxClipEndFrame(seq, fps), (markers.length > 0 ? markers[markers.length - 1].frame + DEFAULT_SLOT_FRAMES : DEFAULT_SLOT_FRAMES));
        for (var i = 0; i < markers.length; i++) {
            var startF = markers[i].frame;
            var endF = (i < markers.length - 1) ? markers[i + 1].frame - 1 : Math.max(startF + DEFAULT_SLOT_FRAMES, maxEnd - 1);
            if (endF < startF) endF = startF;
            var slot = { time: startF, name: markers[i].name, duration: (endF - startF + 1), clips: {} };

            for (var branch in tracksMap) {
                if (!tracksMap.hasOwnProperty(branch)) continue;
                var tIdx = tracksMap[branch];
                var tr = vt[tIdx];
                if (!tr || !tr.clips || tr.clips.numItems === 0) continue;

                // 슬롯에 겹치는 첫 클립 찾기
                var found = null;
                for (var c = 0; c < tr.clips.numItems; c++) {
                    var clip = tr.clips[c];
                    var clipStart = timeToFrames(clip.start, fps);
                    var clipEnd = timeToFrames(clip.end, fps) - 1;
                    if (clipEnd < startF || clipStart > endF) continue;
                    found = { item: clip, start: clipStart, end: clipEnd };
                    break;
                }
                if (!found) continue;

                var item = found.item;
                var clipName = item.name || (item.projectItem && item.projectItem.name) || branch;
                var clipDur = Math.max(1, found.end - found.start + 1);
                var relIn = Math.max(0, startF - found.start);
                var relOut = Math.min(clipDur, endF - found.start + 1);
                slot.clips[branch] = {
                    name: clipName,
                    duration: clipDur,
                    in: relIn,
                    out: relOut
                };
            }
            slots.push(slot);
        }
        return slots;
    }

    // ---------- main ----------
    try {
        if (!app.project || !app.project.activeSequence) {
            alert("No active sequence. Open a sequence and try again.");
            return;
        }
        var seq = app.project.activeSequence;
        alert("Step1: Seq OK\nName: " + (seq.name || "unnamed"));

        var fps = detectFPS(seq);
        alert("Step2: FPS = " + fps);

        var showId = prompt("Show ID (JSON filename base)", seq.name || "show");
        if (!showId) { alert("Show ID is required."); return; }
        alert("Step3: showId = " + showId);

        var loaded = loadShowflow(showId);
        if (loaded.error) { alert("Step4: JSON load failed\n\n" + loaded.error); return; }
        alert("Step4: JSON loaded\nPath: " + (loaded.path || loaded.file.fsName));

        var sf = loaded.data || {};
        if (!sf.tracks) sf.tracks = defaultTrackMap();
        if (!sf.fps) sf.fps = fps;
        sf.showId = showId;

        var markers = collectMarkers(seq, fps);
        if (markers.length === 0) {
            alert("Step5: No markers found in active sequence.");
            return;
        }
        alert("Step5: Markers = " + markers.length);

        var slots = buildSlots(seq, markers, sf.tracks, fps);
        alert("Step6: Slots built = " + slots.length);
        sf.slots = slots;
        sf.fps = fps;

        var err = saveShowflow(loaded.file, sf);
        if (err) { alert("Step7: Save failed\n\n" + err); return; }

        alert("✓ Showflow updated\n\nFile: " + (loaded.path || loaded.file.fsName) +
            "\nSlots: " + slots.length +
            "\nFPS: " + fps);
        log("Updated " + (loaded.path || loaded.file.fsName) + " with " + slots.length + " slots @ " + fps + "fps.");
    } catch (e) {
        $.writeln("Showflow update failed: " + e);
        alert("Showflow update failed:\n\n" + e.toString());
    }
})();
