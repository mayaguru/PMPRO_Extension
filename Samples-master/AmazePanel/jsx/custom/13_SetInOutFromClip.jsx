/**
 * 13_SetInOutFromClip.jsx
 * Sets In/Out points on active sequence based on clip time and duration
 * Used for quick preview of selected clip range
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

$._ext.setInOutFromClip = function (payloadStr) {
    try {
        // Parse clip data
        var data = JSON.parse(decodeURIComponent(payloadStr));
        var startFrame = Number(data.startFrame) || 0;
        var endFrame = Number(data.endFrame) || 0;
        var clipName = data.clipName || "clip";

        // Validate
        if (!app.project || !app.project.activeSequence) {
            return "ERR: No active sequence";
        }

        var seq = app.project.activeSequence;

        if (endFrame <= startFrame) {
            return "ERR: Invalid frame range (" + startFrame + " to " + endFrame + ")";
        }

        // Get FPS
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

        var fps = getFPS(seq);
        var TICKS_PER_SECOND = 254016000000;

        // Convert frames to seconds/ticks
        var inSec = startFrame / fps;
        var outSec = endFrame / fps;

        // Set In/Out points
        try {
            seq.setInPoint(inSec);
            seq.setOutPoint(outSec);
        } catch (e) {
            // Fallback to ticks
            var inTicks = Math.round(inSec * TICKS_PER_SECOND);
            var outTicks = Math.round(outSec * TICKS_PER_SECOND);
            try {
                seq.setInPoint(inTicks.toString());
                seq.setOutPoint(outTicks.toString());
            } catch (e2) {
                return "ERR: Failed to set In/Out: " + e2.toString();
            }
        }

        // Format duration for display
        var durationFrames = endFrame - startFrame;
        var durationSec = Math.round(durationFrames / fps * 10) / 10;

        return "OK: In/Out set for '" + clipName + "' (" + startFrame + "f - " + endFrame + "f, " + durationSec + "s)";

    } catch (e) {
        return "ERR: " + e.toString() + " (line " + (e.line || "?") + ")";
    }
};
