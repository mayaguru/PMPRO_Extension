/**
 * 08_BuildFromMediaAndUpdateShowflow - COMPLETE WORKING VERSION
 * ExtendScript ES3 Compatible - Tested & Working
 */

// Logger stub
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
var DEFAULT_DURATION = 600;
var TICKS_PER_SECOND = 254016000;
var DEFAULT_MEDIA_DIR = "P:/TXTB/FinalMovie/TheaterApp/MP4_Final/with_audio";

function framesToSeconds(frames, fps) {
    return frames / fps;
}

function ticksToFrames(ticks, fps) {
    return Math.round(ticks / (TICKS_PER_SECOND / fps));
}

function loadConfigMedia() {
    try {
        var scriptFile = new File($.fileName);            // .../jsx/custom/08_Build...
        var panelRoot = scriptFile.parent.parent.parent;  // -> .../AmazePanel
        if (panelRoot) {
            var cfg = new File(panelRoot.fullName + "/flow_config.json");
            if (cfg.exists) {
                cfg.encoding = "UTF-8";
                if (cfg.open("r")) {
                    var txt = cfg.read();
                    cfg.close();
                    var obj;
                    try { obj = JSON.parse(txt); } catch (eJSON) { obj = null; }
                    if (obj && obj.mediaDir) return obj.mediaDir;
                }
            }
        }
    } catch (e) { }
    return null;
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
// MAIN SCRIPT START
// ============================================

$.writeln("=== 08 BuildFromMediaAndUpdateShowflow START ===");
alert("✓ 08 Script Starting...");

try {
    var cfgMediaDir = loadConfigMedia();
    if (cfgMediaDir) {
        DEFAULT_MEDIA_DIR = cfgMediaDir;
        $.writeln("Using media dir from config: " + DEFAULT_MEDIA_DIR);
    }

    // Check environment
    if (!app.project) {
        alert("ERROR: No project open!");
        throw new Error("No project");
    }

    if (!app.project.activeSequence) {
        alert("ERROR: No active sequence!");
        throw new Error("No sequence");
    }

    var seq = app.project.activeSequence;

    // Get Show ID
    var showId = prompt("Show ID (JSON filename base):", seq.name);
    if (!showId) {
        alert("Cancelled");
        throw new Error("No Show ID");
    }

    $.writeln("Show ID: " + showId);

    // Select JSON file (no auto-search)
    $.writeln("Opening JSON file dialog...");
    var jsonFile = File.openDialog("Select showflow JSON file for: " + showId, "JSON:*.json");

    if (!jsonFile) {
        alert("ERROR: No JSON file selected!");
        throw new Error("No JSON");
    }

    $.writeln("Selected JSON: " + jsonFile.fsName);

    // Read JSON
    jsonFile.encoding = "UTF-8";
    if (!jsonFile.open("r")) {
        alert("ERROR: Cannot open JSON file!");
        throw new Error("Cannot open JSON");
    }

    var jsonText = jsonFile.read();
    jsonFile.close();

    var showflowData;
    try {
        if (typeof JSON !== "undefined" && JSON.parse) {
            showflowData = JSON.parse(jsonText);
        } else {
            showflowData = eval("(" + jsonText + ")");
        }
    } catch (eJson) {
        alert("ERROR: Invalid JSON!\n\n" + eJson);
        throw eJson;
    }

    $.writeln("JSON loaded - Slots: " + showflowData.slots.length);

    // Select media folder (prefer config)
    var mediaFolder = null;
    if (DEFAULT_MEDIA_DIR) {
        var mf = new Folder(DEFAULT_MEDIA_DIR);
        if (mf.exists) mediaFolder = mf;
    }
    if (!mediaFolder) {
        $.writeln("Opening media folder dialog...");
        mediaFolder = Folder.selectDialog("Select media folder for: " + showId);
        if (!mediaFolder) {
            alert("ERROR: No media folder selected!");
            throw new Error("No media folder");
        }
    }

    $.writeln("Media folder: " + mediaFolder.fsName);

    // Processing
    var fps = showflowData.fps || DEFAULT_FPS;
    var tracksMap = showflowData.tracks || { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7 };

    // Analyze JSON to find ACTUAL max tracks needed
    var maxTracksUsed = 0;

    for (var s = 0; s < showflowData.slots.length; s++) {
        var slot = showflowData.slots[s];
        var clips = slot.clips || {};

        var tracksUsedInSlot = {};

        for (var key in clips) {
            if (!clips.hasOwnProperty(key)) continue;

            var targets = [];
            if (key === "groupADFH") targets = ["A", "D", "F", "H"];
            else if (key === "groupBCEG") targets = ["B", "C", "E", "G"];
            else targets = [key];

            for (var t = 0; t < targets.length; t++) {
                var br = targets[t];
                var ti = tracksMap[br];
                if (ti !== undefined) {
                    tracksUsedInSlot[ti] = true;
                }
            }
        }

        var tracksInThisSlot = 0;
        for (var idx in tracksUsedInSlot) {
            if (tracksUsedInSlot.hasOwnProperty(idx)) {
                tracksInThisSlot++;
            }
        }

        maxTracksUsed = Math.max(maxTracksUsed, tracksInThisSlot);
    }

    // Find highest track index actually used
    var maxTrackIndex = 0;
    for (var s2 = 0; s2 < showflowData.slots.length; s2++) {
        var slot2 = showflowData.slots[s2];
        var clips2 = slot2.clips || {};

        for (var key2 in clips2) {
            if (!clips2.hasOwnProperty(key2)) continue;

            var targets2 = [];
            if (key2 === "groupADFH") targets2 = ["A", "D", "F", "H"];
            else if (key2 === "groupBCEG") targets2 = ["B", "C", "E", "G"];
            else targets2 = [key2];

            for (var t2 = 0; t2 < targets2.length; t2++) {
                var br2 = targets2[t2];
                var ti2 = tracksMap[br2];
                if (ti2 !== undefined) {
                    maxTrackIndex = Math.max(maxTrackIndex, ti2);
                }
            }
        }
    }

    $.writeln("Analysis: Max " + maxTracksUsed + " tracks used simultaneously, highest index: " + maxTrackIndex);

    $.writeln("Ensuring " + (maxTrackIndex + 1) + " video tracks...");
    ensureTracks(seq, maxTrackIndex);
    ensureAudioTracks(seq, Math.max(maxTrackIndex, 0));

    var availableVideo = seq.videoTracks.numTracks - 1;

    // Clear tracks
    var uniq = {}, trackList = [];
    for (var br in tracksMap) {
        if (tracksMap.hasOwnProperty(br)) {
            if (!uniq[tracksMap[br]]) {
                uniq[tracksMap[br]] = true;
                trackList.push(tracksMap[br]);
            }
        }
    }

    $.writeln("Clearing tracks: " + trackList.join(","));
    clearTracks(seq, trackList);

    // Process slots
    $.writeln("Processing " + showflowData.slots.length + " slots...");
    var placed = 0;
    var skipped = 0;

    for (var s = 0; s < showflowData.slots.length; s++) {
        var slot = showflowData.slots[s];
        var time = slot.time || 0;
        var dur = slot.duration || DEFAULT_DURATION;
        var clips = slot.clips || {};

        for (var key in clips) {
            if (!clips.hasOwnProperty(key)) continue;
            var clipDef = clips[key];
            var clipName = clipDef.name || clipDef;

            // Find media file
            var file = findFileByBase(mediaFolder, clipName);
            if (!file) {
                $.writeln("WARN: Media not found - " + clipName);
                skipped++;
                continue;
            }

            var projectItem = importIfNeeded(file.fsName);
            if (!projectItem) {
                $.writeln("WARN: Import failed - " + file.fsName);
                skipped++;
                continue;
            }

            var targets = [];
            if (key === "groupADFH") targets = ["A", "D", "F", "H"];
            else if (key === "groupBCEG") targets = ["B", "C", "E", "G"];
            else targets = [key];

            for (var t = 0; t < targets.length; t++) {
                var br = targets[t];
                var ti = tracksMap[br];
                if (ti === undefined || ti > availableVideo || !seq.videoTracks[ti]) continue;

                var keepAudio = (br === "A");
                var clipItem = insertClipAt(seq.videoTracks[ti], projectItem, time, dur, fps, clipName, keepAudio);

                if (clipItem) {
                    var actualDurFrames = ticksToFrames(clipItem.end.ticks - clipItem.start.ticks, fps);

                    // Update JSON
                    if (typeof showflowData.slots[s].clips[key] === "string") {
                        showflowData.slots[s].clips[key] = { name: clipName };
                    }
                    if (showflowData.slots[s].clips[key].name === undefined) {
                        showflowData.slots[s].clips[key].name = clipName;
                    }
                    showflowData.slots[s].clips[key].duration = actualDurFrames;
                    showflowData.slots[s].clips[key].in = 0;
                    showflowData.slots[s].clips[key].out = actualDurFrames;
                    placed++;
                }
            }
        }
    }

    $.writeln("Placed: " + placed + ", Skipped: " + skipped);

    // Write back JSON
    var jsonTxt = stringify(showflowData);
    if (jsonTxt) {
        var outf = new File(jsonFile.fsName);
        outf.encoding = "UTF-8";
        if (outf.open("w")) {
            outf.write(jsonTxt);
            outf.close();
            $.writeln("SUCCESS: Updated " + jsonFile.fsName);
            alert("✓ Complete!\n\nPlaced " + placed + " clips\nSkipped: " + skipped + "\n\nUpdated: " + jsonFile.fsName);
        } else {
            alert("✗ Placed " + placed + " clips\n\nBut failed to write JSON!");
        }
    } else {
        alert("✗ JSON.stringify not available!\n\nPlaced " + placed + " clips but cannot update JSON file.");
    }

} catch (e) {
    $.writeln("ERROR: " + e.toString());
    alert("Script Error:\n\n" + e.toString() + "\n\nLine: " + (e.line || "unknown"));
}

$.writeln("=== 08 Script Complete ===");
