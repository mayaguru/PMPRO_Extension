/**
 * 08_BuildFromMediaAndUpdateShowflow - Simple Working Version  
 * ExtendScript ES3 Compatible
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

// START OF SCRIPT
$.writeln("=== 08 Script Loading ===");
alert("✓ 08 Script Loaded!\n\nStarting execution...");

try {
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
    alert("✓ Sequence found: " + seq.name);

    // Get Show ID
    var showId = prompt("Enter Show ID (JSON filename):", seq.name);
    if (!showId) {
        alert("Cancelled - No Show ID entered");
        throw new Error("No Show ID");
    }

    alert("✓ Show ID: " + showId);

    // Check if project is saved
    if (!app.project.path) {
        alert("ERROR: Project not saved!\n\nPlease save the project first.");
        throw new Error("Project not saved");
    }

    alert("✓ Project saved at:\n" + app.project.path);

    // Look for JSON
    var projFile = new File(app.project.path);
    var jsonPath1 = projFile.path + "/" + showId + ".showflow.json";
    var jsonPath2 = "P:/99-Pipeline/PremiereScripts/Scripts/flow/" + showId + ".showflow.json";

    var f1 = new File(jsonPath1);
    var f2 = new File(jsonPath2);

    var jsonFile = null;

    if (f1.exists) {
        jsonFile = f1;
        alert("✓ Found JSON at project folder:\n" + jsonPath1);
    } else if (f2.exists) {
        jsonFile = f2;
        alert("✓ Found JSON at flow folder:\n" + jsonPath2);
    } else {
        alert("JSON not found!\n\nPath 1: " + jsonPath1 + "\nPath 2: " + jsonPath2 + "\n\nPlease select manually...");
        jsonFile = File.openDialog("Select showflow JSON", "JSON:*.json");
        if (!jsonFile) {
            alert("ERROR: No JSON file selected!");
            throw new Error("No JSON");
        }
        alert("✓ Selected JSON:\n" + jsonFile.fsName);
    }

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

    alert("✓ JSON loaded successfully!\n\nSlots: " + (showflowData.slots ? showflowData.slots.length : 0));

    // Get media folder
    var mediaFolder = new Folder(DEFAULT_MEDIA_DIR);

    if (!mediaFolder.exists) {
        alert("Default media folder not found:\n" + DEFAULT_MEDIA_DIR + "\n\nPlease select media folder...");
        mediaFolder = Folder.selectDialog("Select media folder");
        if (!mediaFolder) {
            alert("ERROR: No media folder selected!");
            throw new Error("No media folder");
        }
    }

    alert("✓ Media folder:\n" + mediaFolder.fsName);

    // Processing info
    var fps = showflowData.fps || DEFAULT_FPS;
    var tracksMap = showflowData.tracks || { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7 };

    // Count tracks manually (NO Object.keys in ES3!)
    var trackCount = 0;
    for (var k in tracksMap) {
        if (tracksMap.hasOwnProperty(k)) {
            trackCount++;
        }
    }

    var summary = "Ready to process!\n\n";
    summary += "FPS: " + fps + "\n";
    summary += "Tracks: " + trackCount + "\n";
    summary += "Slots: " + showflowData.slots.length + "\n";
    summary += "\nContinue?";

    alert(summary);

    // TODO: Add actual processing here
    alert("⚠ Processing not implemented yet!\n\nThis is a working test version.\n\nAll checks passed successfully.");

} catch (e) {
    $.writeln("ERROR: " + e.toString());
    alert("Script Error:\n\n" + e.toString() + "\n\nLine: " + (e.line || "unknown"));
}

$.writeln("=== 08 Script Complete ===");
