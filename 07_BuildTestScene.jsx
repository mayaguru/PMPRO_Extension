(function () {
    /**
     * Build a test sequence layout for ATZSceneSelect1.
     * - fps 60, block duration 10s (600 frames)
     * - time slots, no overlaps between slots
     * - tracks: V1=Main/Branch_A, V2=Branch_B, V3=Branch_C, V4=Branch_D,
     *           V5=Branch_E, V6=Branch_F, V7=Branch_G, V8=Branch_H
     *
     * Timeline slots (10s each):
     *   0s:  Branch100 A-H
     *   10s: Main110 (A)    (only on V1)
     *   20s: Branch120 A-H
     *   30s: Main130 (A)
     *   40s: Branch140 A-H
     *   50s: Main150 (A)
     *   60s: Branch160 special: A,D,F,H group is ATZClip160Branch4_ADFH; B,C,E,G group is ATZClip160Branch4_BCEG
     *   70s: Main170 (A)
     *   80s: Branch180 A-H
     *   90s: Main190 (A)
     *   100s: Main200 (A)
     *
     * Usage:
     *   1) Activate 60fps sequence.
     *   2) Ensure V1..V8 exist (add manually if host blocks adding tracks).
     *   3) Select a video clip (>=10s) as placeholder.
     *   4) Run script: clears V1..V8 and lays out slots.
     */

    var FPS = 60;
    var DURATION_FRAMES = 600; // 10 seconds

    var placements = [
        // slot 0 (0s): Branch100 A-H
        { trackIndex: 0, name: "ATZClip100BranchA", start: 0 },
        { trackIndex: 1, name: "ATZClip100BranchB", start: 0 },
        { trackIndex: 2, name: "ATZClip100BranchC", start: 0 },
        { trackIndex: 3, name: "ATZClip100BranchD", start: 0 },
        { trackIndex: 4, name: "ATZClip100BranchE", start: 0 },
        { trackIndex: 5, name: "ATZClip100BranchF", start: 0 },
        { trackIndex: 6, name: "ATZClip100BranchG", start: 0 },
        { trackIndex: 7, name: "ATZClip100BranchH", start: 0 },

        // slot 1 (10s): Main110
        { trackIndex: 0, name: "ATZClip110", start: 600 },

        // slot 2 (20s): Branch120 A-H
        { trackIndex: 0, name: "ATZClip120Branch2_A", start: 1200 },
        { trackIndex: 1, name: "ATZClip120Branch2_B", start: 1200 },
        { trackIndex: 2, name: "ATZClip120Branch2_C", start: 1200 },
        { trackIndex: 3, name: "ATZClip120Branch2_D", start: 1200 },
        { trackIndex: 4, name: "ATZClip120Branch2_E", start: 1200 },
        { trackIndex: 5, name: "ATZClip120Branch2_F", start: 1200 },
        { trackIndex: 6, name: "ATZClip120Branch2_G", start: 1200 },
        { trackIndex: 7, name: "ATZClip120Branch2_H", start: 1200 },

        // slot 3 (30s): Main130
        { trackIndex: 0, name: "ATZClip130", start: 1800 },

        // slot 4 (40s): Branch140 A-H
        { trackIndex: 0, name: "ATZClip140Branch3_A", start: 2400 },
        { trackIndex: 1, name: "ATZClip140Branch3_B", start: 2400 },
        { trackIndex: 2, name: "ATZClip140Branch3_C", start: 2400 },
        { trackIndex: 3, name: "ATZClip140Branch3_D", start: 2400 },
        { trackIndex: 4, name: "ATZClip140Branch3_E", start: 2400 },
        { trackIndex: 5, name: "ATZClip140Branch3_F", start: 2400 },
        { trackIndex: 6, name: "ATZClip140Branch3_G", start: 2400 },
        { trackIndex: 7, name: "ATZClip140Branch3_H", start: 2400 },

        // slot 5 (50s): Main150
        { trackIndex: 0, name: "ATZClip150", start: 3000 },

        // slot 6 (60s): Branch160 special grouping (only 2 clips)
        // AD/F/H treated as one group, BCEG as another
        { trackIndex: 0, name: "ATZClip160Branch4_ADFH", start: 3600 },
        { trackIndex: 1, name: "ATZClip160Branch4_BCEG", start: 3600 },

        // slot 7 (70s): Main170
        { trackIndex: 0, name: "ATZClip170", start: 4200 },

        // slot 8 (80s): Branch180 A-H
        { trackIndex: 0, name: "ATZClip180Branch5_A", start: 4800 },
        { trackIndex: 1, name: "ATZClip180Branch5_B", start: 4800 },
        { trackIndex: 2, name: "ATZClip180Branch5_C", start: 4800 },
        { trackIndex: 3, name: "ATZClip180Branch5_D", start: 4800 },
        { trackIndex: 4, name: "ATZClip180Branch5_E", start: 4800 },
        { trackIndex: 5, name: "ATZClip180Branch5_F", start: 4800 },
        { trackIndex: 6, name: "ATZClip180Branch5_G", start: 4800 },
        { trackIndex: 7, name: "ATZClip180Branch5_H", start: 4800 },

        // slot 9 (90s): Main190
        { trackIndex: 0, name: "ATZClip190", start: 5400 },

        // slot 10 (100s): Main200
        { trackIndex: 0, name: "ATZClip200", start: 6000 }
    ];

    function framesToSeconds(frames) {
        return frames / FPS;
    }

    function ensureTracks(seq, maxVideoIndex) {
        while (seq.videoTracks.numTracks <= maxVideoIndex) {
            if (typeof seq.videoTracks.addTrack === "function") {
                seq.videoTracks.addTrack();
            } else if (typeof seq.videoTracks.add === "function") {
                seq.videoTracks.add();
            } else if (typeof seq.insertVideoTrackAt === "function") {
                seq.insertVideoTrackAt(seq.videoTracks.numTracks);
            } else if (typeof seq.addTracks === "function") {
                seq.addTracks(1, 0);
            } else {
                throw new Error("Cannot create video tracks in this host. Existing: " + seq.videoTracks.numTracks);
            }
        }
    }

    function insertClipAt(track, projectItem, startFrames, durationFrames, nameOverride) {
        var timeSeconds = framesToSeconds(startFrames);
        try {
            track.insertClip(projectItem, timeSeconds);
        } catch (e) {
            alert("insertClip failed for " + nameOverride + " @ " + startFrames + "f\n" + e);
            return;
        }
        var clip = track.clips[track.clips.numItems - 1];
        try { clip.name = nameOverride; } catch (e) {}

        try {
            var endTime = new Time();
            endTime.seconds = framesToSeconds(startFrames + durationFrames);
            clip.end = endTime;
        } catch (e2) {}
    }

    function clearTracks(seq, maxVideoIndex) {
        for (var t = 0; t <= maxVideoIndex; t++) {
            var tr = seq.videoTracks[t];
            if (!tr) continue;
            while (tr.clips && tr.clips.numItems > 0) {
                tr.clips[0].remove(0, 0);
            }
        }
    }

    function pickPlaceholder() {
        if (app.project.selection && app.project.selection.length > 0) {
            var sel = app.project.selection[0];
            if (sel.projectItem) sel = sel.projectItem;
            if (sel && sel.type !== ProjectItemType.BIN && sel.type !== ProjectItemType.PROJECT) {
                if (!/\.prproj$/i.test(sel.name || "")) {
                    return sel;
                }
            }
        }
        var root = app.project.rootItem;
        var queue = [root];
        while (queue.length > 0) {
            var item = queue.shift();
            if (!item) continue;
            if (item.type && item.type !== ProjectItemType.BIN && item.type !== ProjectItemType.PROJECT) {
                if (!/\.prproj$/i.test(item.name || "")) {
                    return item;
                }
            }
            if (item.children && item.children.numItems > 0) {
                for (var i = 0; i < item.children.numItems; i++) {
                    queue.push(item.children[i]);
                }
            }
        }
        return null;
    }

    function main() {
        var log = [];
        function say(msg) { log.push(msg); }

        try {
            say("start");
            if (!app.project.activeSequence) {
                alert("No active sequence. Click timeline to activate (60fps).");
                return;
            }
            var seq = app.project.activeSequence;
            say("active sequence: " + seq.name);

            var placeholder = pickPlaceholder();
            if (!placeholder) {
                alert("No dummy media found. Import/select any video clip.");
                return;
            }
            say("placeholder: " + (placeholder.name || "unnamed"));

            ensureTracks(seq, 7); // V1..V8
            say("tracks ensured up to 8 video tracks");

            clearTracks(seq, 7);
            say("cleared existing clips on target tracks");

            var placed = 0;
            for (var i = 0; i < placements.length; i++) {
                var p = placements[i];
                var tr = seq.videoTracks[p.trackIndex];
                insertClipAt(tr, placeholder, p.start, DURATION_FRAMES, p.name);
                placed++;
            }

            alert("Placed " + placed + " clips.\n" + log.join("\n"));
        } catch (err) {
            alert("Unexpected error:\n" + err + "\n\nLog:\n" + log.join("\n"));
        }
    }

    main();
})();
