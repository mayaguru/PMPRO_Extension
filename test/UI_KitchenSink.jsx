/**
 * UI Kitchen Sink - STABLE VERSION for Premiere Pro
 * ExtendScript ES3 Compatible
 */

(function () {

    // ========================================
    // 메인 윈도우 생성
    // ========================================

    var win = new Window("dialog", "🎨 UI Kitchen Sink - ScriptUI 極限 테스트");
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 10;
    win.margins = 15;
    win.preferredSize = [700, 800];

    // ========================================
    // 헤더
    // ========================================

    var header = win.add("group");
    header.orientation = "column";
    header.alignChildren = ["center", "top"];

    var title = header.add("statictext", undefined, "🚀 Adobe ScriptUI Component Showcase");
    try {
        title.graphics.font = ScriptUI.newFont("Arial", "BOLD", 16);
    } catch (e) { }

    var subtitle = header.add("statictext", undefined, "모든 UI 컴포넌트를 한눈에!");

    win.add("panel").preferredSize = [-1, 2];

    // ========================================
    // 1. 버튼 섹션
    // ========================================

    var btnSection = win.add("panel", undefined, "🔘 Buttons");
    btnSection.orientation = "column";
    btnSection.alignChildren = ["fill", "top"];
    btnSection.spacing = 5;
    btnSection.margins = 10;

    var btnRow1 = btnSection.add("group");
    btnRow1.spacing = 10;

    var btn1 = btnRow1.add("button", undefined, "일반 버튼");
    var btn2 = btnRow1.add("button", undefined, "Success");
    var btn3 = btnRow1.add("button", undefined, "Warning");
    var btn4 = btnRow1.add("button", undefined, "Danger");

    var clickCount = 0;
    btn1.onClick = function () {
        clickCount++;
        btn1.text = "클릭됨 (" + clickCount + ")";
    };

    var toggleBtn = btnRow1.add("button", undefined, "Toggle Me");
    toggleBtn.onClick = function () {
        if (this.text === "Toggle Me") {
            this.text = "✓ Toggled ON";
        } else {
            this.text = "Toggle Me";
        }
    };

    // ========================================
    // 2. 텍스트 입력
    // ========================================

    var textSection = win.add("panel", undefined, "📝 Text Input");
    textSection.orientation = "column";
    textSection.alignChildren = ["fill", "top"];
    textSection.spacing = 5;
    textSection.margins = 10;

    var labelGroup = textSection.add("group");
    labelGroup.add("statictext", undefined, "이름:");
    var nameInput = labelGroup.add("edittext", undefined, "여기에 입력하세요");
    nameInput.characters = 25;

    var charCount = textSection.add("statictext", undefined, "문자 수: 0");
    nameInput.onChanging = function () {
        charCount.text = "문자 수: " + this.text.length;
    };

    textSection.add("statictext", undefined, "여러 줄 입력:");
    var multiText = textSection.add("edittext", undefined, "줄1\n줄2\n줄3", { multiline: true, scrolling: true });
    multiText.preferredSize = [-1, 60];

    var passwordGroup = textSection.add("group");
    passwordGroup.add("statictext", undefined, "비밀번호:");
    var pwInput = passwordGroup.add("edittext", undefined, "", { noecho: true });
    pwInput.characters = 20;

    // ========================================
    // 3. 체크박스 & 라디오
    // ========================================

    var checkSection = win.add("panel", undefined, "☑️ Checkboxes & Radio");
    checkSection.orientation = "column";
    checkSection.alignChildren = ["left", "top"];
    checkSection.spacing = 5;
    checkSection.margins = 10;

    var cb1 = checkSection.add("checkbox", undefined, "옵션 1 - 자막 표시");
    var cb2 = checkSection.add("checkbox", undefined, "옵션 2 - 자동 저장");
    cb2.value = true;
    var cb3 = checkSection.add("checkbox", undefined, "옵션 3 - 고급 모드");
    var cb4 = checkSection.add("checkbox", undefined, "옵션 4 - 디버그 로그");

    checkSection.add("statictext", undefined, "렌더링 품질:");
    var radio1 = checkSection.add("radiobutton", undefined, "Draft (빠름)");
    var radio2 = checkSection.add("radiobutton", undefined, "Medium (보통)");
    var radio3 = checkSection.add("radiobutton", undefined, "High (느림)");
    radio2.value = true;

    var radioStatus = checkSection.add("statictext", undefined, "선택: Medium");
    radio1.onClick = function () { radioStatus.text = "선택: Draft"; };
    radio2.onClick = function () { radioStatus.text = "선택: Medium"; };
    radio3.onClick = function () { radioStatus.text = "선택: High"; };

    // ========================================
    // 4. 슬라이더 & 스크롤바
    // ========================================

    var sliderSection = win.add("panel", undefined, "🎚️ Sliders");
    sliderSection.orientation = "column";
    sliderSection.alignChildren = ["fill", "top"];
    sliderSection.spacing = 5;
    sliderSection.margins = 10;

    var sliderGroup1 = sliderSection.add("group");
    sliderGroup1.add("statictext", undefined, "볼륨:");
    var slider1 = sliderGroup1.add("slider", undefined, 50, 0, 100);
    slider1.preferredSize.width = 200;
    var sliderValue1 = sliderGroup1.add("statictext", undefined, "50%");
    sliderValue1.characters = 5;

    slider1.onChanging = function () {
        sliderValue1.text = Math.round(this.value) + "%";
    };

    var scrollGroup1 = sliderSection.add("group");
    scrollGroup1.add("statictext", undefined, "타임라인:");
    var scrollbar1 = scrollGroup1.add("scrollbar", undefined, 0, 0, 1000);
    scrollbar1.preferredSize.width = 200;
    var scrollValue1 = scrollGroup1.add("statictext", undefined, "0f");
    scrollValue1.characters = 6;

    scrollbar1.onChanging = function () {
        scrollValue1.text = Math.round(this.value) + "f";
    };

    var sliderGroup2 = sliderSection.add("group");
    sliderGroup2.add("statictext", undefined, "투명도:");
    var slider2 = sliderGroup2.add("slider", undefined, 100, 0, 100);
    slider2.preferredSize.width = 150;
    var sliderValue2 = sliderGroup2.add("edittext", undefined, "100");
    sliderValue2.characters = 5;

    slider2.onChanging = function () {
        sliderValue2.text = Math.round(this.value);
    };

    sliderValue2.onChange = function () {
        var val = parseInt(this.text);
        if (!isNaN(val)) {
            slider2.value = Math.max(0, Math.min(100, val));
        }
    };

    // ========================================
    // 5. 드롭다운 & 리스트박스
    // ========================================

    var listSection = win.add("panel", undefined, "📋 Dropdowns & Lists");
    listSection.orientation = "column";
    listSection.alignChildren = ["fill", "top"];
    listSection.spacing = 5;
    listSection.margins = 10;

    var ddGroup = listSection.add("group");
    ddGroup.add("statictext", undefined, "코덱:");
    var dropdown = ddGroup.add("dropdownlist", undefined, [
        "H.264 (MP4)",
        "H.265 (HEVC)",
        "ProRes 422",
        "ProRes 4444",
        "DNxHD",
        "AVI Uncompressed"
    ]);
    dropdown.selection = 0;
    dropdown.preferredSize.width = 150;

    var ddStatus = listSection.add("statictext", undefined, "선택된 코덱: " + dropdown.selection.text);
    dropdown.onChange = function () {
        ddStatus.text = "선택된 코덱: " + (this.selection ? this.selection.text : "없음");
    };

    listSection.add("statictext", undefined, "효과 선택 (다중선택):");
    var listbox = listSection.add("listbox", undefined, [
        "Gaussian Blur",
        "Color Correction",
        "Sharpen",
        "Noise Reduction",
        "Chroma Key",
        "Time Remapping",
        "Warp Stabilizer"
    ], { multiselect: true });
    listbox.preferredSize = [400, 80];

    var listStatus = listSection.add("statictext", undefined, "선택된 효과 수: 0");
    listbox.onChange = function () {
        var count = 0;
        for (var i = 0; i < this.items.length; i++) {
            if (this.items[i].selected) count++;
        }
        listStatus.text = "선택된 효과 수: " + count;
    };

    // ========================================
    // 6. 트리뷰
    // ========================================

    var treeSection = win.add("panel", undefined, "🌳 TreeView");
    treeSection.orientation = "column";
    treeSection.alignChildren = ["fill", "top"];
    treeSection.spacing = 5;
    treeSection.margins = 10;

    var tree = treeSection.add("treeview", undefined);
    tree.preferredSize = [400, 120];

    var node1 = tree.add("node", "📁 프로젝트");
    var node1_1 = node1.add("node", "📁 시퀀스");
    node1_1.add("item", "🎬 Main_Timeline_01");
    node1_1.add("item", "🎬 Intro_Sequence");

    var node1_2 = node1.add("node", "📁 미디어");
    node1_2.add("item", "🎥 Clip_001.mp4");
    node1_2.add("item", "🎥 Clip_002.mp4");
    node1_2.add("item", "🎵 Audio_BGM.wav");

    var node2 = tree.add("node", "📁 에셋");
    node2.add("item", "🖼️ Logo.png");
    node2.add("item", "🖼️ Watermark.png");

    node1.expanded = true;
    node1_1.expanded = true;

    var treeStatus = treeSection.add("statictext", undefined, "선택: 없음");
    tree.onChange = function () {
        if (this.selection) {
            treeStatus.text = "선택: " + this.selection.text;
        }
    };

    // ========================================
    // 7. 프로그레스 바
    // ========================================

    var progressSection = win.add("panel", undefined, "⏳ Progress Bar");
    progressSection.orientation = "column";
    progressSection.alignChildren = ["fill", "top"];
    progressSection.spacing = 5;
    progressSection.margins = 10;

    var progressBar = progressSection.add("progressbar", undefined, 0, 100);
    progressBar.preferredSize.width = 400;

    var progressLabel = progressSection.add("statictext", undefined, "진행률: 0%");
    progressLabel.alignment = ["center", "top"];

    var progressBtnGroup = progressSection.add("group");
    var progressStartBtn = progressBtnGroup.add("button", undefined, "▶ 시작");
    var progressResetBtn = progressBtnGroup.add("button", undefined, "⟲ 리셋");

    progressStartBtn.onClick = function () {
        // 간단한 진행 시뮬레이션
        for (var i = 0; i <= 100; i += 10) {
            progressBar.value = i;
            progressLabel.text = "진행률: " + i + "%";
            win.update();
        }
        progressLabel.text = "✓ 완료!";
    };

    progressResetBtn.onClick = function () {
        progressBar.value = 0;
        progressLabel.text = "진행률: 0%";
    };

    // ========================================
    // 8. 컬러 피커
    // ========================================

    var colorSection = win.add("panel", undefined, "🎨 Color Picker");
    colorSection.orientation = "column";
    colorSection.alignChildren = ["fill", "top"];
    colorSection.spacing = 5;
    colorSection.margins = 10;

    var colorPreview = colorSection.add("panel");
    colorPreview.preferredSize = [100, 50];
    try {
        colorPreview.graphics.backgroundColor = colorPreview.graphics.newBrush(
            colorPreview.graphics.BrushType.SOLID_COLOR,
            [0.5, 0.3, 0.8]
        );
    } catch (e) { }

    var rGroup = colorSection.add("group");
    rGroup.add("statictext", undefined, "R:").preferredSize.width = 20;
    var rSlider = rGroup.add("slider", undefined, 127, 0, 255);
    rSlider.preferredSize.width = 200;
    var rVal = rGroup.add("statictext", undefined, "127");
    rVal.characters = 4;

    var gGroup = colorSection.add("group");
    gGroup.add("statictext", undefined, "G:").preferredSize.width = 20;
    var gSlider = gGroup.add("slider", undefined, 76, 0, 255);
    gSlider.preferredSize.width = 200;
    var gVal = gGroup.add("statictext", undefined, "76");
    gVal.characters = 4;

    var bGroup = colorSection.add("group");
    bGroup.add("statictext", undefined, "B:").preferredSize.width = 20;
    var bSlider = bGroup.add("slider", undefined, 204, 0, 255);
    bSlider.preferredSize.width = 200;
    var bVal = bGroup.add("statictext", undefined, "204");
    bVal.characters = 4;

    function updateColor() {
        var r = rSlider.value / 255;
        var g = gSlider.value / 255;
        var b = bSlider.value / 255;

        try {
            colorPreview.graphics.backgroundColor = colorPreview.graphics.newBrush(
                colorPreview.graphics.BrushType.SOLID_COLOR,
                [r, g, b]
            );
        } catch (e) { }

        rVal.text = Math.round(rSlider.value).toString();
        gVal.text = Math.round(gSlider.value).toString();
        bVal.text = Math.round(bSlider.value).toString();
    }

    rSlider.onChanging = updateColor;
    gSlider.onChanging = updateColor;
    bSlider.onChanging = updateColor;

    // ========================================
    // 9. 하단 액션 버튼
    // ========================================

    win.add("panel").preferredSize = [-1, 2];

    var footer = win.add("group");
    footer.orientation = "row";
    footer.alignment = ["center", "top"];
    footer.spacing = 20;

    var exportBtn = footer.add("button", undefined, "📤 Export Settings");
    var resetBtn = footer.add("button", undefined, "🔄 Reset All");
    var closeBtn = footer.add("button", undefined, "✖ Close");

    exportBtn.onClick = function () {
        var settings = {
            name: nameInput.text,
            volume: Math.round(slider1.value),
            codec: dropdown.selection ? dropdown.selection.text : "none",
            renderQuality: radio1.value ? "Draft" : (radio2.value ? "Medium" : "High"),
            options: {
                subtitles: cb1.value,
                autoSave: cb2.value,
                advanced: cb3.value,
                debug: cb4.value
            }
        };

        var output = "설정 내보내기:\n\n";
        output += "이름: " + settings.name + "\n";
        output += "볼륨: " + settings.volume + "\n";
        output += "코덱: " + settings.codec + "\n";
        output += "렌더링 품질: " + settings.renderQuality + "\n";
        output += "\n옵션:\n";
        output += "- 자막: " + settings.options.subtitles + "\n";
        output += "- 자동저장: " + settings.options.autoSave + "\n";
        output += "- 고급모드: " + settings.options.advanced + "\n";
        output += "- 디버그: " + settings.options.debug;

        alert(output);
    };

    resetBtn.onClick = function () {
        if (confirm("모든 설정을 초기화하시겠습니까?")) {
            nameInput.text = "여기에 입력하세요";
            slider1.value = 50;
            slider2.value = 100;
            dropdown.selection = 0;
            cb1.value = false;
            cb2.value = true;
            cb3.value = false;
            cb4.value = false;
            radio2.value = true;
            progressBar.value = 0;
            rSlider.value = 127;
            gSlider.value = 76;
            bSlider.value = 204;
            updateColor();
            alert("초기화 완료!");
        }
    };

    closeBtn.onClick = function () {
        win.close();
    };

    // ========================================
    // 상태바
    // ========================================

    var statusBar = win.add("panel");
    statusBar.alignment = ["fill", "bottom"];
    statusBar.preferredSize = [-1, 25];

    var statusGroup = statusBar.add("group");
    statusGroup.add("statictext", undefined, "● Ready");
    statusGroup.add("statictext", undefined, "|");
    statusGroup.add("statictext", undefined, "UI Kitchen Sink v1.0");

    // ========================================
    // 윈도우 표시
    // ========================================

    win.center();
    win.show();

})();
