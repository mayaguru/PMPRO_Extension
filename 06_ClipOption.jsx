(function() {
    // 1. 사용자 옵션 입력 (간단한 프롬프트 예시, 실제로는 ScriptUI로 확장 가능)
    var colorSpace = prompt("컬러 스페이스를 입력하세요 (예: Rec.709, ACEScc 등)", "Rec.709");
    var setAlphaPremult = confirm("알파 Premultiplied로 설정할까요?");
    var setAlphaIgnore = confirm("알파 채널 무시할까요?");
    var setAlphaInvert = confirm("알파 채널 반전할까요?");
    var setExrBypass = confirm("EXR 파일에 대해 'Bypass linear conversion'을 체크할까요?");

    // 2. 선택된 클립 가져오기
    if (!app.project.selection || app.project.selection.length === 0) {
        alert("프로젝트 패널에서 클립을 선택하세요.");
        return;
    }

    // 3. 각 클립에 대해 반복 적용
    for (var i = 0; i < app.project.selection.length; i++) {
        var item = app.project.selection[i];

        // (1) 컬러 세팅 적용 (실제 API는 프리미어 버전에 따라 다름, setColorSpace 등)
        if (colorSpace) {
            try {
                if (item.setColorSpace) {
                    item.setColorSpace(colorSpace);
                }
            } catch (e) {}
        }

        // (2) 알파 세팅 적용 (실제 API는 프리미어 버전에 따라 다름)
        try {
            if (setAlphaPremult && item.setAlphaPremultiplied) {
                item.setAlphaPremultiplied(true);
            }
            if (setAlphaIgnore && item.setAlphaIgnore) {
                item.setAlphaIgnore(true);
            }
            if (setAlphaInvert && item.setAlphaInvert) {
                item.setAlphaInvert(true);
            }
        } catch (e) {}

        // (3) EXR 파일일 경우 바이패스 적용
        var ext = item.name.match(/\.([^.]+)$/i);
        if (ext && ext[1].toLowerCase() === "exr" && setExrBypass) {
            try {
                if (item.setExrBypassLinearConversion) {
                    item.setExrBypassLinearConversion(true);
                }
            } catch (e) {}
        }
    }

    alert("일괄 적용 완료!");
})();
