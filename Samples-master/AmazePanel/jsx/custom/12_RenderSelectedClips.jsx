/**
 * 12_RenderSelectedClips.jsx
 * Queues selected clips from Showflow editor to AME render queue
 * Called from showflow_viz.html with clip data as parameter
 */

if (typeof ($) == 'undefined') $ = {};
if (typeof ($._ext) == 'undefined') $._ext = {};
if (typeof JSON === "undefined") {
    JSON = {};
}
if (typeof JSON.parse !== "function") {
    JSON.parse = function (text) {
        return eval('(' + text + ')');
    };
}
if (typeof JSON.stringify !== "function") {
    JSON.stringify = function (obj) {
        var t = typeof obj;
        if (t !== "object" || obj === null) {
            if (t === "string") return '"' + obj + '"';
            return String(obj);
        }
        var json = [], arr = (obj && obj.constructor === Array);
        for (var n in obj) {
            var v = obj[n];
            t = typeof v;
            if (t === "string") v = '"' + v + '"';
            else if (t === "object" && v !== null) v = JSON.stringify(v);
            json.push((arr ? "" : '"' + n + '":') + String(v));
        }
        return (arr ? "[" : "{") + String(json) + (arr ? "]" : "}");
    };
}

$._ext.renderSelectedClips = function (payloadStr) {
    try {
        // Parse incoming data
        var data = JSON.parse(decodeURIComponent(payloadStr));
        var clips = data.clips;
        var presetPath = data.presetPath;
        var outputFolder = data.outputFolder;
        var deleteOutside = (data.deleteOutside === true); // optional payload override; default false

        // Validate
        if (!app.project || !app.project.activeSequence) {
            return "ERR: No active sequence";
        }
        var seq = app.project.activeSequence;

        if (!clips || clips.length === 0) {
            return "ERR: No clips provided";
        }

        if (!presetPath || !outputFolder) {
            return "ERR: Preset or output folder not configured";
        }

        var presetFile = new File(presetPath);
        if (!presetFile.exists) {
            return "ERR: Preset file not found: " + presetPath;
        }

        var outDir = new Folder(outputFolder);
        if (!outDir.exists) {
            return "ERR: Output folder not found: " + outputFolder;
        }

        // Check encoder
        if (!app.encoder) {
            return "ERR: Encoder not available";
        }
        app.encoder.launchEncoder();

        // Helper: Get FPS
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

        // Tick helpers
        var TICKS_PER_SECOND = 254016000000;
        function frameToTicks(frame, fps) {
            return Math.round((frame / fps) * TICKS_PER_SECOND);
        }

        // Helper: Sanitize filename
        function sanitizeName(name) {
            if (!name) return "clip";
            return name.toString().replace(/[^A-Za-z0-9_-]+/g, '_');
        }

        function branchSuffix(name) {
            if (!name) return null;
            var str = "";
            if (typeof name === "string") {
                str = name;
            } else if (name && typeof name === "object" && name.name) {
                str = name.name;
            } else if (name && name.toString) {
                try { str = name.toString(); } catch (e) { str = ""; }
            }
            if (typeof str !== "string") str = String(str || "");
            if (typeof str.trim === "function") {
                str = str.trim();
            } else {
                str = (String.prototype.trim ? String.prototype.trim.call(str) : String(str));
            }
            var dot = str.lastIndexOf(".");
            if (dot > 0) {
                str = str.substring(0, dot);
            }
            var m = /([A-Z])$/.exec(str);
            var suffix = m ? m[1] : null;
            $.writeln("DEBUG branchSuffix name=" + str + " suffix=" + suffix);
            return suffix;
        }

        function isolateBranch(seqObj, fps, startFrame, endFrame, suffix) {
            var toggled = [];
            if (!suffix) return toggled;
            var startTicks = frameToTicks(startFrame, fps);
            var endTicks = frameToTicks(endFrame, fps);
            var numTracks = (seqObj.videoTracks && seqObj.videoTracks.numTracks) ? seqObj.videoTracks.numTracks : 0;
            for (var vt = 0; vt < numTracks; vt++) {
                var track = seqObj.videoTracks[vt];
                if (!track || !track.clips) continue;
                var numClips = track.clips.numItems || 0;
                for (var ci = 0; ci < numClips; ci++) {
                    var clip = track.clips[ci];
                    if (!clip) continue;
                    var clipStart = (clip.start && clip.start.ticks !== undefined) ? Number(clip.start.ticks) : 0;
                    var clipEnd = (clip.end && clip.end.ticks !== undefined) ? Number(clip.end.ticks) : clipStart;
                    if (clipEnd <= startTicks || clipStart >= endTicks) continue;
                    var name = clip.name || (clip.projectItem && clip.projectItem.name) || "";
                    var clipSuffix = branchSuffix(name);
                    if (!clipSuffix) continue;
                    var shouldEnable = (clipSuffix === suffix);
                    try {
                        var prev = (typeof clip.isVideoEnabled === "function") ? clip.isVideoEnabled() : (clip.disabled === true ? false : true);
                        if (typeof clip.setVideoEnabled === "function") {
                            clip.setVideoEnabled(shouldEnable);
                        } else {
                            clip.disabled = !shouldEnable;
                        }
                        $.writeln("DEBUG clip '" + name + "' suffix=" + clipSuffix + " -> enabled=" + shouldEnable);
                        toggled.push({ clip: clip, wasEnabled: prev });
                    } catch (eSet) {
                        $.writeln("DEBUG failed to toggle clip '" + name + "': " + eSet);
                    }
                }
            }
            return toggled;
        }

        function restoreBranchState(toggled) {
            if (!toggled) return;
            for (var i = 0; i < toggled.length; i++) {
                var entry = toggled[i];
                var clip = entry.clip;
                if (!clip) continue;
                try {
                    if (typeof clip.setVideoEnabled === "function") {
                        clip.setVideoEnabled(entry.wasEnabled);
                    } else {
                        clip.disabled = !entry.wasEnabled;
                    }
                    $.writeln("DEBUG restored clip to enabled=" + entry.wasEnabled);
                } catch (e) {
                    $.writeln("DEBUG failed to restore clip: " + e);
                }
            }
        }

        // === Clean helper (reuses 05_Clean_InOut logic, but non-interactive) ===
        function shouldKeepClip(clip, inTicks, outTicks, margin) {
            var clipStart = clip.start.ticks;
            var clipEnd = clip.end.ticks;
            return (clipEnd > (inTicks - margin)) && (clipStart < (outTicks + margin));
        }

        // Disable clips outside the render window (non-destructive); returns toggle history
        // Hard delete clips outside the render window (destructive)
        function cleanOutsideRange(seqObj, inTicks, outTicks, fps) {
            var margin = Math.round(1 * TICKS_PER_SECOND / fps); // 1-frame margin
            function removeOutside(track) {
                if (!track || !track.clips) return;
                for (var i = track.clips.numItems - 1; i >= 0; i--) {
                    var clip = track.clips[i];
                    if (!clip || !clip.start || !clip.end) continue;
                    if (!shouldKeepClip(clip, inTicks, outTicks, margin)) {
                        try { clip.remove(0, 1); } catch (eRem) { $.writeln("WARN cleanOutsideRange remove failed: " + eRem); }
                    }
                }
            }
            if (seqObj.videoTracks && seqObj.videoTracks.numTracks) {
                for (var v = 0; v < seqObj.videoTracks.numTracks; v++) removeOutside(seqObj.videoTracks[v]);
            }
            if (seqObj.audioTracks && seqObj.audioTracks.numTracks) {
                for (var a = 0; a < seqObj.audioTracks.numTracks; a++) removeOutside(seqObj.audioTracks[a]);
            }
        }

        function disableOutsideRange(seqObj, inTicks, outTicks, fps) {
            var margin = Math.round(1 * TICKS_PER_SECOND / fps); // 1-frame margin
            var toggled = [];
            if (seqObj.videoTracks && seqObj.videoTracks.numTracks) {
                for (var i = 0; i < seqObj.videoTracks.numTracks; i++) {
                    var vTrack = seqObj.videoTracks[i];
                    if (!vTrack || !vTrack.clips) continue;
                    for (var c = vTrack.clips.numItems - 1; c >= 0; c--) {
                        var clip = vTrack.clips[c];
                        if (!clip || !clip.start || !clip.end) continue;
                        if (shouldKeepClip(clip, inTicks, outTicks, margin)) continue;
                        try {
                            var prev = (typeof clip.isVideoEnabled === "function")
                                ? clip.isVideoEnabled()
                                : (clip.disabled === true ? false : true);
                            if (typeof clip.setVideoEnabled === "function") {
                                clip.setVideoEnabled(false);
                            } else {
                                clip.disabled = true;
                            }
                            toggled.push({ clip: clip, wasEnabled: prev });
                        } catch (eDis) {
                            $.writeln("WARN disableOutsideRange failed: " + eDis);
                        }
                    }
                }
            }
            return toggled;
        }

        function restoreClipEnables(toggled) {
            if (!toggled) return;
            for (var i = 0; i < toggled.length; i++) {
                var entry = toggled[i];
                var clip = entry.clip;
                if (!clip) continue;
                try {
                    if (typeof clip.setVideoEnabled === "function") {
                        clip.setVideoEnabled(entry.wasEnabled);
                    } else {
                        clip.disabled = !entry.wasEnabled;
                    }
                } catch (eRes) {
                    $.writeln("WARN restoreClipEnables failed: " + eRes);
                }
            }
        }

        var fps = getFPS(seq);
        var jobs = 0;
        var errors = [];

        // Determine file extension from preset
        var ext = ".mp4";
        if (/mov/i.test(presetPath)) ext = ".mov";
        else if (/mxf/i.test(presetPath)) ext = ".mxf";

        // Process each clip
        for (var i = 0; i < clips.length; i++) {
            var clip = clips[i];
            $.writeln("DEBUG Clip " + i + ": " + JSON.stringify(clip));
            var startFrame = Number(clip.time) || 0;
            var duration = Number(clip.duration) || 0;
            var endFrame = startFrame + duration;
            var clipName = sanitizeName(clip.name || ("clip_" + (i + 1)));
            $.writeln("DEBUG Calc: startFrame=" + startFrame + ", duration=" + duration + ", endFrame=" + endFrame);

            if (duration <= 0) {
                errors.push("Skipped " + clipName + " (invalid duration)");
                continue;
            }

            // Set In/Out on active sequence (Premiere only supports this on active seq)
            var inTicks = frameToTicks(startFrame, fps);
            var outTicks = frameToTicks(endFrame, fps);
            try {
                seq.setInPoint(inTicks.toString());
                seq.setOutPoint(outTicks.toString());
            } catch (eSetIO) {
                errors.push("Failed to set In/Out for " + clipName + ": " + eSetIO);
                continue;
            }

            var disabledOutside = null;
            if (deleteOutside) {
                cleanOutsideRange(seq, inTicks, outTicks, fps);
            } else {
                disabledOutside = disableOutsideRange(seq, inTicks, outTicks, fps);
            }

            // Optional branch isolation inside window
            var suffix = branchSuffix(clip.name || clipName);
            var toggled = isolateBranch(seq, fps, startFrame, endFrame, suffix);

            try {
                // Build output path
                var seqName = seq.name || "sequence";
                var fileName = seqName + "_" + clipName + ext;
                var outPath = outDir.fsName + "/" + fileName;

                // Normalize path for Windows
                if ($.os.indexOf("Windows") !== -1) {
                    outPath = outPath.replace(/\//g, "\\");
                }

                // Queue to AME
                var rangeToEncode = (app.encoder.ENCODE_IN_TO_OUT !== undefined)
                    ? app.encoder.ENCODE_IN_TO_OUT
                    : 1;
                var removeFromQueue = 1;

                var jobID = app.encoder.encodeSequence(
                    seq,
                    outPath,
                    presetFile.fsName,
                    rangeToEncode,
                    removeFromQueue
                );

                if (jobID) {
                    $.writeln("Queued: " + fileName + " (frames " + startFrame + "-" + endFrame + ")");
                    jobs++;
                } else {
                    errors.push("Failed to queue: " + clipName);
                }
            } finally {
                restoreBranchState(toggled);
                if (!deleteOutside) {
                    restoreClipEnables(disabledOutside);
                }
            }
        }

        // Build result message
        var msg = "Successfully queued " + jobs + " clip(s)";
        msg += deleteOutside ? " (deleted outside range)" : " (disabled/restored outside range)";
        if (errors.length > 0) {
            msg += "\\n\\nErrors:\\n" + errors.join("\\n");
        }
        return msg;

    } catch (e) {
        return "ERR: " + e.toString() + " (line " + (e.line || "?") + ")";
    }
};
