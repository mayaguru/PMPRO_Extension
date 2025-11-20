/**
 * 08 스크립트 최소 버전 - 한 단계씩 테스트
 */

$.writeln("=== 08 Minimal Test START ===");

// Step 1: 기본 alert
alert("Step 1: Script loaded!");

// Step 2: 프로젝트/시퀀스 확인
if (!app.project) {
    alert("ERROR: No project!");
} else if (!app.project.activeSequence) {
    alert("ERROR: No active sequence!");
} else {
    var seq = app.project.activeSequence;
    alert("Step 2: OK\n\nSequence: " + seq.name);

    // Step 3: Prompt 테스트
    var showId = prompt("Enter Show ID:", seq.name);
    if (!showId) {
        alert("Cancelled");
    } else {
        alert("Step 3: OK\n\nShow ID: " + showId);

        // Step 4: File 경로 확인
        if (!app.project.path) {
            alert("ERROR: Project not saved!\n\nPlease save the project first.");
        } else {
            var projPath = app.project.path;
            alert("Step 4: OK\n\nProject path:\n" + projPath);

            // Step 5: File 객체 생성
            try {
                var projFile = new File(projPath);
                alert("Step 5: OK\n\nFile object created\nPath: " + projFile.path);

                // Step 6: JSON 경로 구성
                var jsonPath1 = projFile.path + "/" + showId + ".showflow.json";
                var jsonPath2 = "P:/99-Pipeline/PremiereScripts/Scripts/flow/" + showId + ".showflow.json";

                var f1 = new File(jsonPath1);
                var f2 = new File(jsonPath2);

                var msg = "Step 6: JSON Paths\n\n";
                msg += "Path 1: " + jsonPath1 + "\n";
                msg += "Exists: " + f1.exists + "\n\n";
                msg += "Path 2: " + jsonPath2 + "\n";
                msg += "Exists: " + f2.exists;

                alert(msg);

                // Step 7: 파일 선택 다이얼로그
                if (!f1.exists && !f2.exists) {
                    alert("Step 7: No JSON found\n\nOpening file dialog...");
                    var selectedFile = File.openDialog("Select showflow JSON", "JSON:*.json");
                    if (selectedFile) {
                        alert("Step 7: File selected\n\n" + selectedFile.fsName);
                    } else {
                        alert("Step 7: No file selected (cancelled)");
                    }
                }

                // Step 8: Folder 객체 생성
                try {
                    var defaultFolder = "P:/TXTB/FinalMovie/TheaterApp/MP4_Final/with_audio";
                    var folder = new Folder(defaultFolder);

                    var folderMsg = "Step 8: Folder Test\n\n";
                    folderMsg += "Default: " + defaultFolder + "\n";
                    folderMsg += "Exists: " + folder.exists;

                    alert(folderMsg);

                    if (!folder.exists) {
                        alert("Step 9: Opening folder dialog...");
                        var selectedFolder = Folder.selectDialog("Select media folder");
                        if (selectedFolder) {
                            alert("Step 9: Folder selected\n\n" + selectedFolder.fsName);
                        } else {
                            alert("Step 9: No folder selected (cancelled)");
                        }
                    }

                    alert("✓✓✓ ALL TESTS PASSED! ✓✓✓\n\nThe full 08 script should work now.");

                } catch (eFolderTest) {
                    alert("ERROR at Step 8 (Folder):\n\n" + eFolderTest + "\n\nLine: " + (eFolderTest.line || "?"));
                }

            } catch (eFileTest) {
                alert("ERROR at Step 5 (File):\n\n" + eFileTest + "\n\nLine: " + (eFileTest.line || "?"));
            }
        }
    }
}

$.writeln("=== 08 Minimal Test END ===");
