// Logger 로드 (선택사항 - 디버깅용)
// #include "Logger.jsxinc"

(function () {
    /**
     * Build test scene from <showId>.showflow.json
     * - showId defaults to active sequence name
     * - JSON format:
     *   {
     *     "showId": "TXTSceneSelect1",
     *     "fps": 60,
     *     "tracks": { "A":0,"B":1,"C":2,"D":3,"E":4,"F":5,"G":6,"H":7 },
     *     "slots": [
     *       { "time": 0, "duration": 600,
     *         "clips": { "A":"TXTBClip100", "B":"...", "groupADFH":"ATZClip160Branch4_ADFH", ... }
     *       },
     *       ...
     *     ]
     *   }
     * - Keys A..H map to branch tracks; special keys:
     *   groupADFH -> clones onto A,D,F,H tracks
     *   groupBCEG -> clones onto B,C,E,G tracks
     *
     * Usage:
     *  1) Active 60fps sequence; sequence name == showId (or override via prompt).
     *  2) V1..V8 present (or script will try to add); select a video clip (>=slot duration) as placeholder.
     *  3) Place <showId>.showflow.json next to project file (.prproj).
     *  4) Run script; it clears used tracks and lays out slots per JSON.
     */

    var DEFAULT_FPS = 60;
    var DEFAULT_DURATION = 600; // frames

    function framesToSeconds(frames, fps) {
        return frames / fps;
    }

    function ensureTracks(seq, maxVideoIndex) {
        var needed = maxVideoIndex + 1;
        var existing = seq.videoTracks.numTracks;

        if (existing >= needed) {
            return true; // 이미 충분함
        }

        var trackAdded = false;

        while (seq.videoTracks.numTracks <= maxVideoIndex) {
            var beforeCount = seq.videoTracks.numTracks;

            try {
                if (typeof seq.videoTracks.addTrack === "function") {
                    seq.videoTracks.addTrack();
                    trackAdded = true;
                } else if (typeof seq.videoTracks.add === "function") {
                    seq.videoTracks.add();
                    trackAdded = true;
                } else if (typeof seq.insertVideoTrackAt === "function") {
                    seq.insertVideoTrackAt(seq.videoTracks.numTracks);
                    trackAdded = true;
                } else if (typeof seq.addTracks === "function") {
                    seq.addTracks(1, 0);
                    trackAdded = true;
                } else {
                    // API로 추가 불가
                    var missing = (maxVideoIndex + 1) - seq.videoTracks.numTracks;
                    var msg = "Premiere Pro 2025에서는 스크립트로 트랙 추가가 제한될 수 있습니다.\n\n";
                    msg += "현재 비디오 트랙: " + seq.videoTracks.numTracks + "\n";
                    msg += "필요한 트랙: " + (maxVideoIndex + 1) + "\n";
                    msg += "추가 필요: " + missing + "개\n\n";
                    msg += "🔧 해결 방법:\n";
                    msg += "1. 시퀀스에서 우클릭 → 'Add Tracks...'\n";
                    msg += "2. Video Tracks에 " + missing + "개 추가\n";
                    msg += "3. 이 스크립트 다시 실행\n\n";
                    msg += "수동으로 트랙을 추가하셨다면 '확인'을 누르세요.";

                    if (confirm(msg)) {
                        // 사용자가 수동으로 추가했다고 확인
                        if (seq.videoTracks.numTracks > beforeCount) {
                            continue; // 트랙이 추가되었으므로 계속
                        } else {
                            throw new Error("비디오 트랙이 추가되지 않았습니다. 스크립트를 중단합니다.");
                        }
                    } else {
                        throw new Error("사용자가 트랙 추가를 취소했습니다.");
                    }
                }
            } catch (e) {
                // API 호출 실패
                var missing2 = (maxVideoIndex + 1) - seq.videoTracks.numTracks;
                alert("트랙 추가 실패!\n\n오류: " + e + "\n\n수동으로 " + missing2 + "개의 비디오 트랙을 추가해주세요.");
                throw e;
            }

            // 무한루프 방지
            if (seq.videoTracks.numTracks === beforeCount && trackAdded === false) {
                throw new Error("트랙 추가에 실패했습니다.");
            }
        }

        return true;
    }

    function ensureAudioTracks(seq, maxAudioIndex) {
        while (seq.audioTracks.numTracks <= maxAudioIndex) {
            if (typeof seq.audioTracks.addTrack === "function") {
                seq.audioTracks.addTrack();
            } else if (typeof seq.audioTracks.add === "function") {
                seq.audioTracks.add();
            } else if (typeof seq.addTracks === "function") {
                // addTracks(videoTracksToAdd, audioTracksToAdd)
                seq.addTracks(0, 1);
            } else {
                throw new Error("Cannot create audio tracks in this host. Existing: " + seq.audioTracks.numTracks);
            }
        }
    }

    function clearTracks(seq, trackIndices) {
        for (var i = 0; i < trackIndices.length; i++) {
            var tr = seq.videoTracks[trackIndices[i]];
            if (!tr) continue;
            while (tr.clips && tr.clips.numItems > 0) {
                tr.clips[0].remove(0, 0);
            }
        }
    }

    function deleteLinkedAudio(trackItem) {
        try {
            var linked = trackItem.getLinkedItems();
            if (linked && linked.numItems > 0) {
                for (var i = linked.numItems - 1; i >= 0; i--) {
                    try {
                        var li = linked[i];
                        if (li && li.mediaType && li.mediaType === "Audio") {
                            li.remove(0, 0);
                        }
                    } catch (e) { }
                }
            }
        } catch (eOuter) { }
    }

    function insertClipAt(track, projectItem, startFrames, durationFrames, fps, nameOverride, keepAudio) {
        var timeSeconds = framesToSeconds(startFrames, fps);
        try {
            track.insertClip(projectItem, timeSeconds);
        } catch (e) {
            alert("insertClip failed for " + nameOverride + " @ " + startFrames + "f\n" + e);
            return;
        }
        var clip = track.clips[track.clips.numItems - 1];
        try { clip.name = nameOverride; } catch (e) { }
        try {
            var endTime = new Time();
            endTime.seconds = framesToSeconds(startFrames + durationFrames, fps);
            clip.end = endTime;
        } catch (e2) { }

        if (!keepAudio) {
            deleteLinkedAudio(clip);
        }
    }

    function pickPlaceholder() {
        if (app.project.selection && app.project.selection.length > 0) {
            var sel = app.project.selection[0];
            if (sel.projectItem) sel = sel.projectItem;
            if (sel && sel.type !== ProjectItemType.BIN && sel.type !== ProjectItemType.PROJECT) {
                if (!/\.prproj$/i.test(sel.name || "")) return sel;
            }
        }
        var root = app.project.rootItem;
        var queue = [root];
        while (queue.length > 0) {
            var item = queue.shift();
            if (!item) continue;
            if (item.type && item.type !== ProjectItemType.BIN && item.type !== ProjectItemType.PROJECT) {
                if (!/\.prproj$/i.test(item.name || "")) return item;
            }
            if (item.children && item.children.numItems > 0) {
                for (var i = 0; i < item.children.numItems; i++) queue.push(item.children[i]);
            }
        }
        return null;
    }

    function loadFlowConfigDefault(showId) {
        var paths = [];
        // 1) flow_config.json (panel에서 저장한 경로) - 확장 루트 기준
        try {
            var scriptFile = new File($.fileName);          // .../jsx/custom/07_BuildTestScene.jsx
            var panelRoot = scriptFile.parent.parent.parent; // -> .../AmazePanel
            if (panelRoot) {
                var cfg = new File(panelRoot.fullName + "/flow_config.json");
                if (cfg.exists) {
                    cfg.encoding = "UTF-8";
                    if (cfg.open("r")) {
                        var txt = cfg.read();
                        cfg.close();
                        var obj;
                        try { obj = JSON.parse(txt); } catch (eJSON) { obj = null; }
                        if (obj && obj.flowPath) {
                            var f = new File(obj.flowPath);
                            if (f.exists) return { file: f, path: f.fsName || f.fullName };
                        }
                    }
                }
            }
        } catch (e) { }
        // fallback candidates
        if (app.project && app.project.path) {
            var projFile = new File(app.project.path);
            paths.push(projFile.path + "/" + showId + ".showflow.json");
        }
        paths.push("P:/99-Pipeline/PremiereScripts/Scripts/flow/" + showId + ".showflow.json");
        paths.push("D:/_DEV/PremiereScripts/Scripts/flow/" + showId + ".showflow.JSON");
        for (var i = 0; i < paths.length; i++) {
            var c = new File(paths[i]);
            if (c.exists) return { file: c, path: c.fsName || c.fullName };
        }
        return null;
    }

    function loadShowFlow(showId) {
        // 1) flow_config.json 우선
        var fInfo = loadFlowConfigDefault(showId);
        var f = fInfo ? fInfo.file : null;
        var jsonPath = fInfo ? fInfo.path : "";

        // 2) fallback: 프로젝트/기본 경로
        if (!f && app.project && app.project.path) {
            var projFile = new File(app.project.path);
            var candidate = [
                projFile.path + "/" + showId + ".showflow.json",
                "P:/99-Pipeline/PremiereScripts/Scripts/flow/" + showId + ".showflow.json",
                "D:/_DEV/PremiereScripts/Scripts/flow/" + showId + ".showflow.JSON"
            ];
            for (var i = 0; i < candidate.length; i++) {
                var c = new File(candidate[i]);
                if (c.exists) { f = c; jsonPath = c.fsName || c.fullName; break; }
            }
        }

        // 3) 마지막: 파일 직접 선택
        if (!f) {
            f = File.openDialog("Select showflow JSON", "JSON:*.json");
            if (!f) return { error: "Showflow JSON not found; selection cancelled." };
            jsonPath = f.fsName || f.fullName;
        }

        f.encoding = "UTF-8";
        if (!f.open("r")) return { error: "Cannot open " + jsonPath };
        var txt = f.read();
        f.close();
        try {
            var data;
            if (typeof JSON !== "undefined" && JSON.parse) {
                data = JSON.parse(txt);
            } else {
                // Fallback for hosts without JSON.parse
                data = eval("(" + txt + ")");
            }
            return { data: data, path: jsonPath };
        } catch (e) {
            return { error: "JSON parse error in " + jsonPath + " : " + e };
        }
    }

    function defaultTrackMap() {
        return { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7 };
    }

    function main() {
        var log = [];
        function say(msg) { log.push(msg); }

        try {
            say("start");
            if (!app.project.activeSequence) {
                alert("No active sequence. Activate a 60fps sequence.");
                return;
            }
            var seq = app.project.activeSequence;
            var defaultShowId = seq.name;
            var showId = prompt("Show ID (JSON filename base)", defaultShowId);
            if (!showId) { alert("Show ID is required."); return; }
            say("active sequence: " + showId);

            var res = loadShowFlow(showId);
            if (res.error) { alert(res.error); return; }
            var sf = res.data;
            say("loaded showflow: " + res.path);

            var fps = sf.fps || DEFAULT_FPS;
            var tracksMap = sf.tracks || defaultTrackMap();

            var placeholder = pickPlaceholder();
            if (!placeholder) { alert("No dummy media found. Select/import a clip."); return; }
            say("placeholder: " + (placeholder.name || "unnamed"));

            // Determine max track index needed
            var maxTrack = 0;
            var maxAudio = 0;
            for (var k in tracksMap) {
                if (tracksMap.hasOwnProperty(k)) {
                    maxTrack = Math.max(maxTrack, tracksMap[k]);
                    maxAudio = Math.max(maxAudio, tracksMap[k]); // mirror
                }
            }
            var availableVideo = seq.videoTracks.numTracks - 1;
            var availableAudio = seq.audioTracks.numTracks - 1;
            try {
                ensureTracks(seq, maxTrack);
                availableVideo = seq.videoTracks.numTracks - 1;
            } catch (eEnsure) {
                alert("Cannot auto-create video tracks. Please add up to V" + (maxTrack + 1) + " manually, then press OK to retry.\nIf skipped, branches beyond current tracks will be ignored.");
                try {
                    ensureTracks(seq, maxTrack);
                    availableVideo = seq.videoTracks.numTracks - 1;
                } catch (eEnsure2) {
                    availableVideo = seq.videoTracks.numTracks - 1;
                    say("fallback: using existing video tracks only, max V index=" + availableVideo);
                }
            }
            try {
                ensureAudioTracks(seq, maxAudio);
                availableAudio = seq.audioTracks.numTracks - 1;
            } catch (eAudio) {
                alert("Cannot auto-create audio tracks. Please add up to A" + (maxAudio + 1) + " manually, then press OK to retry.\nIf skipped, only existing audio tracks will be used.");
                try {
                    ensureAudioTracks(seq, maxAudio);
                    availableAudio = seq.audioTracks.numTracks - 1;
                } catch (eAudio2) {
                    availableAudio = seq.audioTracks.numTracks - 1;
                    say("fallback: using existing audio tracks only, max A index=" + availableAudio);
                }
            }
            say("tracks ensured up to V" + availableVideo + "/A" + availableAudio + " (requested V" + maxTrack + "/A" + maxAudio + ")");

            // Clear target tracks
            var usedTracks = [];
            for (var branch in tracksMap) {
                if (tracksMap.hasOwnProperty(branch)) usedTracks.push(tracksMap[branch]);
            }
            // de-dup
            var uniq = {};
            var trackList = [];
            for (var i = 0; i < usedTracks.length; i++) {
                if (!uniq[usedTracks[i]]) {
                    uniq[usedTracks[i]] = true;
                    trackList.push(usedTracks[i]);
                }
            }
            clearTracks(seq, trackList);
            say("cleared tracks: " + trackList.join(","));

            var placed = 0;
            for (var s = 0; s < sf.slots.length; s++) {
                var slot = sf.slots[s];
                var time = slot.time || 0;
                var dur = slot.duration || DEFAULT_DURATION;
                var clips = slot.clips || {};

                for (var key in clips) {
                    if (!clips.hasOwnProperty(key)) continue;
                    var clipName = clips[key].name || clips[key]; // allow string or object
                    var tIdx = tracksMap[key];
                    var keepAudio = (key === "A"); // only A keeps audio
                    if (tIdx === undefined || tIdx > availableVideo) {
                        continue; // skip if track not available
                    }

                    if (key === "groupADFH") {
                        ["A", "D", "F", "H"].forEach(function (br) {
                            var ti = tracksMap[br];
                            if (ti !== undefined && ti <= availableVideo) {
                                var ka = (br === "A");
                                insertClipAt(seq.videoTracks[ti], placeholder, time, dur, fps, clipName, ka);
                                placed++;
                            }
                        });
                        continue;
                    }
                    if (key === "groupBCEG") {
                        ["B", "C", "E", "G"].forEach(function (br) {
                            var ti2 = tracksMap[br];
                            if (ti2 !== undefined && ti2 <= availableVideo) {
                                insertClipAt(seq.videoTracks[ti2], placeholder, time, dur, fps, clipName, false);
                                placed++;
                            }
                        });
                        continue;
                    }
                    insertClipAt(seq.videoTracks[tIdx], placeholder, time, dur, fps, clipName, keepAudio);
                    placed++;
                }
            }

            alert("Placed " + placed + " clips.\n" + log.join("\n"));
        } catch (err) {
            alert("Unexpected error:\n" + err + "\n\nLog:\n" + log.join("\n"));
        }
    }

    main();
})();
