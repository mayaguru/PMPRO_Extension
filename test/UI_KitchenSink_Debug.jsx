/**
 * UI Kitchen Sink - DEBUG VERSION
 * 단계별로 테스트하면서 어디서 실패하는지 확인
 */

(function () {
    var log = [];

    function debug(msg) {
        log.push(msg);
        $.writeln("[DEBUG] " + msg); // ExtendScript Toolkit 콘솔에 출력
    }

    try {
        debug("=== UI Kitchen Sink Debug Start ===");

        // Step 1: 기본 윈도우 생성 테스트
        debug("Step 1: Creating window...");
        var win = new Window("palette", "UI Test - Debug");
        if (!win) {
            throw new Error("Window creation failed");
        }
        debug("Step 1: OK - Window created");

        // Step 2: 기본 설정
        debug("Step 2: Setting up window properties...");
        win.orientation = "column";
        win.alignChildren = ["fill", "top"];
        win.spacing = 10;
        win.margins = 15;
        debug("Step 2: OK");

        // Step 3: 간단한 텍스트 추가
        debug("Step 3: Adding static text...");
        var title = win.add("statictext", undefined, "Hello World!");
        if (!title) {
            throw new Error("StaticText creation failed");
        }
        debug("Step 3: OK");

        // Step 4: 버튼 추가
        debug("Step 4: Adding button...");
        var btn = win.add("button", undefined, "Click Me");
        if (!btn) {
            throw new Error("Button creation failed");
        }

        btn.onClick = function () {
            debug("Button clicked!");
            alert("Button works!");
        };
        debug("Step 4: OK");

        // Step 5: 슬라이더 테스트
        debug("Step 5: Adding slider...");
        var sliderGroup = win.add("group");
        sliderGroup.add("statictext", undefined, "Test:");
        var slider = sliderGroup.add("slider", undefined, 50, 0, 100);
        slider.preferredSize.width = 200;
        var sliderVal = sliderGroup.add("statictext", undefined, "50");

        slider.onChanging = function () {
            sliderVal.text = Math.round(this.value).toString();
        };
        debug("Step 5: OK");

        // Step 6: 닫기 버튼
        debug("Step 6: Adding close button...");
        var closeBtn = win.add("button", undefined, "Close");
        closeBtn.onClick = function () {
            debug("Closing window...");
            win.close();
        };
        debug("Step 6: OK");

        // Step 7: 윈도우 표시
        debug("Step 7: Showing window...");
        win.center();
        win.show();
        debug("Step 7: OK - Window shown");

        debug("=== All steps completed successfully ===");

    } catch (e) {
        var errorMsg = "ERROR at line " + (e.line || "?") + ": " + e.toString();
        debug(errorMsg);
        alert("스크립트 오류!\n\n" + errorMsg + "\n\nLog:\n" + log.join("\n"));
    }
})();
