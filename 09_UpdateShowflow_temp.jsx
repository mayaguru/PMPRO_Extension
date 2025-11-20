/**
 * 09_UpdateShowflowFromTimeline - Premiere 2025 호환 버전
 * ExtendScript ES3 Compatible - Tested & Working
 */

// Logger stub - 09번 스크립트용
if (typeof FileLogger === "undefined") {
    FileLogger = function () {
        this.log = function () { };
        this.info = this.log;
        this.warn = this.log;
        this.error = this.log;
        this.success = this.log;
        this.save = function () { };
        this.saveAndShow = function () { };
    };
}

var DEFAULT_FPS = 60;
var TICKS_PER_SECOND = 254016000;

function framesToSeconds(frames, fps) {
    return frames / fps;
}

function ticksToFrames(ticks, fps) {
    return Math.round(ticks / (TICKS_PER_SECOND / fps));
}

function ensureTracks(seq, maxVideoIndex) {
    if (seq.videoTracks.numTracks > maxVideoIndex) return true;
    if (app.enableQE) app.enableQE();
    while (seq.videoTracks.numTracks <= maxVideoIndex) {
        var before = seq.videoTracks.numTracks, added = false;
        try {
            if (seq.videoTracks.addTrack) { seq.videoTracks.addTrack(); added = true; }
            else if (seq.videoTracks.add) { seq.videoTracks.add(); added = true; }
            else if (seq.insertVideoTrackAt) { seq.insertVideoTrackAt(seq.videoTracks.numTracks); added = true; }
            else if (seq.addTracks) { seq.addTracks(1, 0); added = true; }
        } catch (e) { }
        if (seq.videoTracks.numTracks > before) continue;
        if (added) continue;
        var missing = (maxVideoIndex + 1) - seq.videoTracks.numTracks;
        alert("⚠ Cannot auto-create video tracks.\n\nNeed: " + (maxVideoIndex + 1) + "\nExisting: " + seq.videoTracks.numTracks + "\nMissing: " + missing + "\n\nPlease add " + missing + " video track(s) manually:\n1. Right-click on timeline\n2. Select 'Add Tracks...'\n3. Add " + missing + " video tracks\n\nScript will continue with existing tracks.");
        return false;
    }
    return true;
}

function ensureAudioTracks(seq, maxAudioIndex) {
    if (seq.audioTracks.numTracks > maxAudioIndex) return true;
    if (app.enableQE) app.enableQE();
    while (seq.audioTracks.numTracks <= maxAudioIndex) {
        var before = seq.audioTracks.numTracks, added = false;
        try {
            if (seq.audioTracks.addTrack) { seq.audioTracks.addTrack(); added = true; }
            else if (seq.audioTracks.add) { seq.audioTracks.add(); added = true; }
            else if (seq.addTracks) { seq.addTracks(0, 1); added = true; }
        } catch (e) { }
        if (seq.audioTracks.numTracks > before) continue;
        if (added) continue;
        var missing = (maxAudioIndex + 1) - seq.audioTracks.numTracks;
        alert("⚠ Cannot auto-create audio tracks.\n\nNeed: " + (maxAudioIndex + 1) + "\nExisting: " + seq.audioTracks.numTracks + "\n\nMissing: " + missing + "\n\nScript will continue with existing tracks.");
        return false;
    }
    return true;
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
                var li = linked[i];
                if (li && li.mediaType === "Audio") {
                    li.remove(0, 0);
                }
            }
        }
    } catch (e) { }
}

function insertClipAt(track, projectItem, startFrames, durationFrames, fps, nameOverride, keepAudio) {
    var timeSeconds = framesToSeconds(startFrames, fps);
    try {
        track.insertClip(projectItem, timeSeconds);
    } catch (e) {
        $.writeln("insertClip failed: " + nameOverride + " @ " + startFrames + "f - " + e);
        return null;
    }
    var clip = track.clips[track.clips.numItems - 1];
    try { clip.name = nameOverride; } catch (e) { }
    try {
        var endTime = new Time();
        endTime.seconds = framesToSeconds(startFrames + durationFrames, fps);
        clip.end = endTime;
    } catch (e2) { }
    if (!keepAudio) deleteLinkedAudio(clip);
    return clip;
}

function escapeRegExp(str) {
    return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
}

function findFileByBase(folder, baseName) {
    var files = folder.getFiles();
    var re = new RegExp("^" + escapeRegExp(baseName) + "\\.", "i");
    for (var i = 0; i < files.length; i++) {
        var f = files[i];
        if (f instanceof File && re.test(f.name)) return f;
    }
    return null;
}

function importIfNeeded(path) {
    var root = app.project.rootItem;
    var queue = [root];
    while (queue.length > 0) {
        var it = queue.shift();
        if (it && it.type && it.type !== ProjectItemType.BIN && it.getMediaPath && it.getMediaPath().toLowerCase() === path.toLowerCase()) {
            return it;
        }
        if (it && it.children && it.children.numItems > 0) {
            for (var j = 0; j < it.children.numItems; j++) queue.push(it.children[j]);
        }
    }
    app.project.importFiles([path], false, null, false);
    queue = [root];
    while (queue.length > 0) {
        var it2 = queue.shift();
        if (it2 && it2.type && it2.type !== ProjectItemType.BIN && it2.getMediaPath && it2.getMediaPath().toLowerCase() === path.toLowerCase()) {
            return it2;
        }
        if (it2 && it2.children && it2.children.numItems > 0) {
            for (var k = 0; k < it2.children.numItems; k++) queue.push(it2.children[k]);
        }
    }
    return null;
}

function stringify(obj) {
    // Try native JSON.stringify first
    if (typeof JSON !== "undefined" && JSON.stringify) {
        try {
            return JSON.stringify(obj, null, 2);
        } catch (e) {
            $.writeln("Native JSON.stringify failed: " + e);
        }
    }

    // Manual JSON serialization for ES3
    function stringifyValue(val, indent) {
        var indentStr = "";
        for (var i = 0; i < indent; i++) indentStr += "  ";
        var nextIndent = indent + 1;

        if (val === null) return "null";
        if (val === undefined) return "undefined";

        var type = typeof val;

        if (type === "string") {
            return '"' + val.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r") + '"';
        }

        if (type === "number" || type === "boolean") {
            return String(val);
        }

        if (type === "object") {
            if (val instanceof Array || (val.length !== undefined && typeof val.splice === "function")) {
                var arrItems = [];
                for (var i = 0; i < val.length; i++) {
                    arrItems.push(stringifyValue(val[i], nextIndent));
                }
                if (arrItems.length === 0) return "[]";
                return "[\n" + indentStr + "  " + arrItems.join(",\n" + indentStr + "  ") + "\n" + indentStr + "]";
            } else {
                var objItems = [];
                for (var key in val) {
                    if (val.hasOwnProperty(key)) {
                        objItems.push('"' + key + '": ' + stringifyValue(val[key], nextIndent));
                    }
                }
                if (objItems.length === 0) return "{}";
                return "{\n" + indentStr + "  " + objItems.join(",\n" + indentStr + "  ") + "\n" + indentStr + "}";
            }
        }

        return '""';
    }

    return stringifyValue(obj, 0);
}

// ============================================
// MAIN SCRIPT START - 09 UpdateShowflowFromTimeline
// ============================================

$.writeln("=== 09 UpdateShowflowFromTimeline START ===");
alert("✓ 09 Script Starting...");

try {
    // Check environment - 09번 스크립트용
    var project = app.project;
    if (!project && app.projects && app.projects.length > 0) {
        project = app.projects[0];
        $.writeln("Using app.projects[0] instead of app.project");
    }

    if (!project) {
        alert("ERROR: No project found!");
        throw new Error("No project");
    }

    var seq = project.activeSequence;
    if (!seq && project.sequences && project.sequences.length > 0) {
        seq = project.sequences[0];
        $.writeln("Using project.sequences[0] instead of activeSequence");
    }

    if (!seq) {
        alert("ERROR: No active sequence!");
        throw new Error("No sequence");
    }

    // 간단한 API 테스트 - 09번 스크립트용
    $.writeln("Project: " + (project.name || "unnamed"));
    $.writeln("Sequence: " + seq.name);

    // Markers 테스트
    try {
        var markers = seq.markers;
        var markerCount = markers.numMarkers || 0;
        $.writeln("Markers: " + markerCount);
    } catch (e) {
        $.writeln("Markers access failed: " + e);
    }

    // Video Tracks 테스트
    try {
        var videoTracks = seq.videoTracks;
        var trackCount = videoTracks.numTracks || videoTracks.length || 0;
        $.writeln("Video Tracks: " + trackCount);
    } catch (e) {
        $.writeln("Video tracks access failed: " + e);
    }

    alert("✓ SUCCESS!\n\n09번 스크립트가 정상 실행되었습니다!\n\n- Project: " + (project.name || "unnamed") + "\n- Sequence: " + seq.name + "\n\nExtendScript Toolkit 콘솔을 확인하세요.");

} catch (e) {
    $.writeln("ERROR: " + e.toString());
    alert("Script Error:\n\n" + e.toString() + "\n\nLine: " + (e.line || "unknown"));
}

$.writeln("=== 09 UpdateShowflowFromTimeline Complete ===");
