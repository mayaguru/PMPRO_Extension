// 간단한 리링크 도구 - 선택 감지 문제 해결
(function () {
    try {
        // 프로젝트 확인
        if (!app.project) {
            alert("프로젝트가 열려있지 않습니다.");
            return;
        }

        // 선택된 클립 찾기 - 수동 선택 대화상자 사용
        var projectRoot = app.project.rootItem;
        var allClips = [];
        
        // 모든 클립 찾기
        function findAllClips(item, clipArray) {
            if (item.type === ProjectItemType.CLIP) {
                clipArray.push(item);
            }
            
            if (item.children && item.children.numItems > 0) {
                for (var i = 0; i < item.children.numItems; i++) {
                    findAllClips(item.children[i], clipArray);
                }
            }
        }
        
        findAllClips(projectRoot, allClips);
        
        if (allClips.length === 0) {
            alert("프로젝트에 클립이 없습니다.");
            return;
        }
        
        // 클립 선택 대화상자
        var clipNames = [];
        for (var i = 0; i < allClips.length; i++) {
            clipNames.push(allClips[i].name);
        }
        
        // 파일 선택 대화상자
        var selectedClipIndex = -1;
        var clipName = prompt("리링크할 클립 이름 선택 (다음 중 하나 입력):\n\n" + clipNames.join("\n"), "");
        
        if (!clipName) {
            alert("클립 선택이 취소되었습니다.");
            return;
        }
        
        // 입력한 이름과 일치하는 클립 찾기
        var selectedClip = null;
        for (var i = 0; i < allClips.length; i++) {
            if (allClips[i].name === clipName) {
                selectedClip = allClips[i];
                selectedClipIndex = i;
                break;
            }
        }
        
        if (!selectedClip) {
            alert("입력한 이름과 일치하는 클립을 찾을 수 없습니다.");
            return;
        }
        
        var item = selectedClip;
        alert("선택된 클립: " + item.name);

        // 클립이 오프라인인지 확인
        try {
            var isOffline = item.isOffline();
            alert("오프라인 상태: " + isOffline);
            
            if (!isOffline) {
                if (!confirm("이 클립은 이미 온라인 상태입니다. 계속 진행하시겠습니까?")) {
                    return;
                }
            }
        } catch (e) {
            alert("오프라인 상태 확인 실패: " + e.message);
        }

        // 미디어 경로 확인
        try {
            var mediaPath = item.getMediaPath();
            alert("현재 미디어 경로: " + mediaPath);
        } catch (e) {
            alert("미디어 경로 가져오기 실패: " + e.message);
        }

        // 새 파일 선택
        var newFile = File.openDialog("리링크할 파일 선택", "*.*", false);
        if (!newFile) {
            alert("파일 선택이 취소되었습니다.");
            return;
        }

        alert("선택한 파일: " + newFile.fsName);

        // 리링크 시도
        try {
            // 방법 1
            item.changeMediaPath(newFile.fsName);
            alert("리링크 성공!");
            return;
        } catch (e1) {
            try {
                // 방법 2
                item.changeMediaPath(newFile.fsName, true);
                alert("리링크 성공!");
                return;
            } catch (e2) {
                try {
                    // 방법 3
                    item.changeMediaPath(newFile.fsName, true, true);
                    alert("리링크 성공!");
                    return;
                } catch (e3) {
                    alert("리링크 실패: " + e3.message);
                }
            }
        }
    } catch (e) {
        alert("스크립트 오류: " + e.message);
    }
})();

