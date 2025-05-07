// 리링크 도구 - 단순화 버전 (프리미어 프로 2025 호환)
(function() {
    // 디버그 모드 설정
    var DEBUG = true;
    
    // 디버그 로그 함수
    function log(message) {
        if (DEBUG) {
            $.writeln("[리링크 도구] " + message);
        }
    }
    
    try {
        log("스크립트 시작");
        
        // 프로젝트 확인
        if (!app.project) {
            alert("열린 프로젝트가 없습니다.");
            return;
        }
        
        // 파일 확장자 추출 함수
        function getExtension(filePath) {
            var match = filePath.match(/\.([^.]+)$/);
            return match ? match[1].toLowerCase() : "";
        }
        
        // 간단히 지정된 파일로 리링크 시도하는 함수
        function tryLinkToFile(projectItem, file) {
            try {
                log("선택된 파일로 리링크 시도: " + file.fsName);
                
                // 가장 단순한 형태로 시도 - 예외 발생 가능성 높음
                try {
                    projectItem.changeMediaPath(file.fsName);
                    log("기본 메서드로 성공!");
                    return true;
                } catch (e) {
                    log("기본 리링크 실패: " + e.message);
                    
                    // 수동 리링크 안내
                    var message = "자동 리링크가 실패했습니다. 수동으로 연결해주세요:\n\n" +
                                 "1. 프로젝트 패널에서 클립을 선택하세요\n" +
                                 "2. 마우스 오른쪽 버튼 클릭 > '미디어 연결...' 선택\n" +
                                 "3. 다음 파일을 선택하세요:\n   " + file.fsName;
                    
                    alert(message);
                    
                    // 사용자가 수동으로 완료했는지 확인
                    return confirm("리링크를 완료하셨나요?\n\n완료했으면 '확인'을 클릭하세요.");
                }
            } catch (e) {
                log("심각한 오류: " + e.message);
                return false;
            }
        }
        
        // 프로젝트에서 클립 찾기
        function findClipsInProject() {
            var result = {
                allClips: [],
                selectedClips: [],
                offlineClips: []
            };
            
            // 재귀적으로 프로젝트 아이템 탐색
            function scanProjectItem(item) {
                try {
                    // 선택된 항목인지 확인
                    var isSelected = false;
                    if (app.project.selection && app.project.selection.length > 0) {
                        for (var i = 0; i < app.project.selection.length; i++) {
                            if (app.project.selection[i] === item) {
                                isSelected = true;
                                break;
                            }
                        }
                    }
                    
                    // 클립인지 확인 (형식 없이 간단하게)
                    if (item.type && item.type.toString() === "1") { // ProjectItemType.CLIP
                        // 배열에 추가
                        result.allClips.push(item);
                        
                        // 선택된 항목이면 선택 배열에 추가
                        if (isSelected) {
                            result.selectedClips.push(item);
                        }
                        
                        // 오프라인 확인
                        try {
                            if (item.isOffline && item.isOffline()) {
                                result.offlineClips.push(item);
                            }
                        } catch (e) {
                            log("오프라인 상태 확인 오류: " + e.message);
                        }
                    }
                    
                    // 하위 항목 탐색
                    if (item.children && item.children.numItems > 0) {
                        for (var j = 0; j < item.children.numItems; j++) {
                            scanProjectItem(item.children[j]);
                        }
                    }
                } catch (e) {
                    log("항목 스캔 오류: " + e.message);
                }
            }
            
            // 루트 아이템부터 시작
            if (app.project.rootItem) {
                scanProjectItem(app.project.rootItem);
            }
            
            return result;
        }
        
        // 파일 선택 대화상자 (먼저 사용자에게 파일 선택 요청)
        var selectedFile = File.openDialog("리링크할 파일 선택", "*.*", false);
        if (!selectedFile) {
            alert("파일 선택이 취소되었습니다.");
            return;
        }
        
        log("선택된 파일: " + selectedFile.fsName);
        
        // 프로젝트에서 클립 찾기
        var projectClips = findClipsInProject();
        log("전체 클립 수: " + projectClips.allClips.length);
        log("선택된 클립 수: " + projectClips.selectedClips.length);
        log("오프라인 클립 수: " + projectClips.offlineClips.length);
        
        // 처리할 클립 결정
        var itemToProcess = null;
        
        if (projectClips.selectedClips.length > 0) {
            // 선택된 클립이 있으면 첫 번째 사용
            itemToProcess = projectClips.selectedClips[0];
            log("선택된 클립 사용: " + itemToProcess.name);
        } else if (projectClips.offlineClips.length > 0) {
            // 선택된 클립이 없지만 오프라인 클립이 있으면 첫 번째 사용
            itemToProcess = projectClips.offlineClips[0];
            log("오프라인 클립 사용: " + itemToProcess.name);
            
            // 사용자에게 알림
            alert("선택된 클립이 없습니다. 오프라인 클립 '" + itemToProcess.name + "'을(를) 사용합니다.");
        } else if (projectClips.allClips.length > 0) {
            // 선택된 클립도 없고 오프라인 클립도 없지만 일반 클립이 있으면 사용자에게 선택 요청
            alert("선택된 클립이나 오프라인 클립이 없습니다. 프로젝트 패널에서 리링크할 클립을 선택한 후 '확인'을 클릭하세요.");
            
            // 사용자가 선택할 시간 제공 후 다시 확인
            if (app.project.selection && app.project.selection.length > 0) {
                itemToProcess = app.project.selection[0];
                log("사용자 선택 후 클립: " + itemToProcess.name);
            } else {
                alert("선택된 클립이 없습니다. 스크립트를 종료합니다.");
                return;
            }
        } else {
            // 클립이 아예 없음
            alert("프로젝트에 클립이 없습니다. 스크립트를 종료합니다.");
            return;
        }
        
        // 리링크 시도
        if (tryLinkToFile(itemToProcess, selectedFile)) {
            alert("리링크 성공!");
        } else {
            alert("리링크가 완료되지 않았습니다. 다음 방법을 시도해보세요:\n\n" +
                 "1. 프리미어 프로를 재시작한 후 다시 시도\n" +
                 "2. 새 파일을 가져와서 시퀀스에서 교체\n" +
                 "3. 미디어 브라우저에서 파일을 직접 열기");
        }
        
        log("스크립트 종료");
    } catch (e) {
        alert("스크립트 오류: " + e.message);
        log("치명적 오류: " + e.message);
    }
})();


