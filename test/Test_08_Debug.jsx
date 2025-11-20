/**
 * 08 스크립트 디버그 - confirm() 완전 제거 버전
 */

$.writeln("=== TEST START (No Confirm) ===");
alert("Step 1: Script loaded!");

try {
    // Step 2: 프로젝트 확인
    $.writeln("Step 2: Checking project...");
    if (!app.project) {
        alert("ERROR: No project!");
        throw new Error("No project");
    }
    alert("Step 2: Project OK");

    // Step 3: 시퀀스 확인
    $.writeln("Step 3: Checking sequence...");
    if (!app.project.activeSequence) {
        alert("ERROR: No active sequence!");
        throw new Error("No active sequence");
    }
    var seq = app.project.activeSequence;
    alert("Step 3: Sequence OK - " + seq.name);

    // Step 4: Prompt 테스트
    $.writeln("Step 4: Testing prompt...");
    var showId = prompt("Enter Show ID:", seq.name);
    if (!showId) {
        alert("ERROR: No show ID entered!");
        throw new Error("No show ID");
    }
    alert("Step 4: Show ID = " + showId);

    // Step 5: File 객체 테스트
    $.writeln("Step 5: Testing File object...");
    if (!app.project.path) {
        alert("ERROR: Project not saved!\n\nPlease save the project first.");
        throw new Error("Project not saved");
    }

    var projFile = new File(app.project.path);
    alert("Step 5: Project path = " + projFile.path);

    // Step 6: JSON 파일 찾기 테스트
    $.writeln("Step 6: Looking for JSON...");

    var jsonPath1 = projFile.path + "/" + showId + ".showflow.json";
    var jsonPath2 = "P:/99-Pipeline/PremiereScripts/Scripts/flow/" + showId + ".showflow.json";

    $.writeln("  Path 1: " + jsonPath1);
    $.writeln("  Path 2: " + jsonPath2);

    var f1 = new File(jsonPath1);
    var f2 = new File(jsonPath2);

    var msg = "JSON Search Results:\n\n";
    msg += "Path 1: " + jsonPath1 + "\n";
    msg += "Exists: " + f1.exists + "\n\n";
    msg += "Path 2: " + jsonPath2 + "\n";
    msg += "Exists: " + f2.exists;

    alert(msg);

    if (!f1.exists && !f2.exists) {
        // confirm() 대신 alert() + 자동 실행
        alert("Neither JSON file exists!\n\nOpening file selection dialog...");
        $.writeln("Opening file dialog...");

        var selectedFile = File.openDialog("Select showflow JSON", "JSON:*.json");
        if (selectedFile) {
            alert("Step 6: Selected\n" + selectedFile.fsName);
        } else {
            alert("Step 6: No file selected (cancelled)");
        }
    }

    // Step 7: Folder 선택 테스트
    $.writeln("Step 7: Testing folder selection...");
    var defaultFolder = "P:/TXTB/FinalMovie/TheaterApp/MP4_Final/with_audio";

    var folder = new Folder(defaultFolder);
    var folderExists = folder.exists;

    var folderMsg = "Default folder: " + defaultFolder + "\n";
    folderMsg += "Exists: " + folderExists;

    alert(folderMsg);

    if (!folderExists) {
        // confirm() 대신 alert() + 자동 실행
        alert("Folder doesn't exist!\n\nOpening folder selection dialog...");
        $.writeln("Opening folder dialog...");

        var selectedFolder = Folder.selectDialog("Select media folder");
        if (selectedFolder) {
            alert("Step 7: Selected folder\n" + selectedFolder.fsName);
        } else {
            alert("Step 7: No folder selected (cancelled)");
        }
    }

    $.writeln("=== ALL TESTS PASSED ===");
    alert("✓ All tests completed successfully!\n\nNo errors found!\n\n08_BuildFromMediaAndUpdateShowflow.jsx should work now.");

} catch (e) {
    $.writeln("FATAL ERROR: " + e.toString());
    $.writeln("Line: " + (e.line || "unknown"));
    alert("Test failed:\n\n" + e.toString() + "\n\nLine: " + (e.line || "unknown"));
}

$.writeln("=== TEST END ===");
