/**
 * 12_RenderSelectedClips.jsx
 * Queues selected clips from Showflow editor to AME render queue
 * Called from showflow_viz.html with clip data as parameter
 */

if (typeof ($) == 'undefined') $ = {};
if (typeof ($._ext) == 'undefined') $._ext = {};

$._ext.renderSelectedClips = function (payloadStr) {
    try {
        // Parse incoming data
        var data = JSON.parse(decodeURIComponent(payloadStr));
        var clips = data.clips;
        var presetPath = data.presetPath;
        var outputFolder = data.outputFolder;

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

        // Helper: Sanitize filename
        function sanitizeName(name) {
            if (!name) return "clip";
            return name.toString().replace(/[^A-Za-z0-9_-]+/g, '_');
        }

        var fps = getFPS(seq);
        var TICKS_PER_SECOND = 254016000000;
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

            // Convert frames to seconds
            var inSec = startFrame / fps;
            var outSec = endFrame / fps;

            // Set In/Out points
            try {
                seq.setInPoint(inSec);
                seq.setOutPoint(outSec);
            } catch (e) {
                // Fallback to ticks if seconds don't work
                var inTicks = Math.round(inSec * TICKS_PER_SECOND);
                var outTicks = Math.round(outSec * TICKS_PER_SECOND);
                try {
                    seq.setInPoint(inTicks.toString());
                    seq.setOutPoint(outTicks.toString());
                } catch (e2) {
                    errors.push("Failed to set In/Out for " + clipName + ": " + e2);
                    continue;
                }
            }

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
        }

        // Build result message
        var msg = "Successfully queued " + jobs + " clip(s)";
        if (errors.length > 0) {
            msg += "\\n\\nErrors:\\n" + errors.join("\\n");
        }
        return msg;

    } catch (e) {
        return "ERR: " + e.toString() + " (line " + (e.line || "?") + ")";
    }
};
