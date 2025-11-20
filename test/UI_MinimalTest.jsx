/**
 * 최소 테스트 - 이것도 안되면 Premiere Pro 설정 문제
 */

$.writeln("=== Script Start ===");

try {
    alert("Step 1: Script loaded!");

    var win = new Window("dialog", "Minimal Test");
    win.add("statictext", undefined, "If you see this, UI works!");
    var btn = win.add("button", undefined, "OK");

    btn.onClick = function () {
        win.close();
    };

    $.writeln("Window created successfully");
    win.show();
    $.writeln("Window closed");

} catch (e) {
    $.writeln("ERROR: " + e.toString());
    alert("Error: " + e.toString());
}

$.writeln("=== Script End ===");
