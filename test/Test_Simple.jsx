/**
 * 08 스크립트 최종 테스트 - confirm() 없는 버전
 */

$.writeln("=== Simple Test START ===");

try {
    // 기본 확인
    if (!app.project || !app.project.activeSequence) {
        alert("Please open a project and activate a sequence first!");
        throw new Error("No sequence");
    }

    var seq = app.project.activeSequence;
    alert("✓ Step 1: Sequence OK\nName: " + seq.name);

    // Prompt 테스트
    var testInput = prompt("Enter test value:", "test123");
    if (testInput) {
        alert("✓ Step 2: Prompt OK\nValue: " + testInput);
    }

    // File 테스트
    if (!app.project.path) {
        alert("⚠ Project not saved!\n\nPlease save the project first.");
    } else {
        var projFile = new File(app.project.path);
        alert("✓ Step 3: File OK\nPath: " + projFile.path);
    }

    // Folder 테스트
    var testFolder = new Folder("C:/Windows");
    alert("✓ Step 4: Folder OK\nExists: " + testFolder.exists);

    // File.openDialog 테스트
    alert("Next: File selection dialog test\n\nClick OK to open file dialog (or Cancel to skip)");
    var selectedFile = File.openDialog("Select any file", "*.*");
    if (selectedFile) {
        alert("✓ Step 5: File Dialog OK\nSelected: " + selectedFile.name);
    } else {
        alert("Step 5: File Dialog - Cancelled");
    }

    // Folder.selectDialog 테스트  
    alert("Next: Folder selection dialog test\n\nClick OK to open folder dialog (or Cancel to skip)");
    var selectedFolder = Folder.selectDialog("Select any folder");
    if (selectedFolder) {
        alert("✓ Step 6: Folder Dialog OK\nSelected: " + selectedFolder.name);
    } else {
        alert("Step 6: Folder Dialog - Cancelled");
    }

    alert("✓✓✓ ALL TESTS PASSED! ✓✓✓\n\n08_BuildFromMediaAndUpdateShowflow.jsx should now work!");

} catch (e) {
    $.writeln("ERROR: " + e.toString());
    alert("Test failed:\n\n" + e.toString() + "\n\nLine: " + (e.line || "unknown"));
}

$.writeln("=== Simple Test END ===");
