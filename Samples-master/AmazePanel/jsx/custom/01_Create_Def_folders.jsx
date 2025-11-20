(function createProjectFolders() {
    var project = app.project;
    
    // 폴더 구조와 컬러 정의
    var folderStructure = [
        { name: "00_Render", color: 6, subFolders: [  // 보라색
            { name: "00_Show", color: 5 },  // 주황색
            { name: "01_Mvers", color: 5 },  // 주황색
            { name: "02_4DX", color: 5 }  // 주황색
        ]},
        { name: "01_Src", color: 4, subFolders: [  // 청색
            { name: "00_Audio", color: 4 },
            { name: "00_SFX", color: 4 },
            { name: "01_Comp", color: 4 },
            { name: "01_SR", color: 4 }
        ]},
        { name: "02_Proxy", color: 1, subFolders: [  // 초록색
            { name: "01_Comp", color: 1 },
            { name: "02_SR", color: 1 }
        ]},
        { name: "03_Seq", color: 6, subFolders: [  // 보라색
            { name: "00_Show", color: 5, subFolders: [  // 주황색
                { name: "00_FullShow", color: 5 },
                { name: "01_Parts", color: 5 }
            ]},
            { name: "01_Mvers", color: 5, subFolders: [  // 주황색
                { name: "01_Parts", color: 5 }
            ]},
            { name: "02_4DX", color: 5 }  // 주황색
        ]},
        { name: "99_Etc", color: 2 }   // 빨간색
    ];
    
    // 폴더 존재 여부 확인 함수
    function folderExists(folderName, parentFolder) {
        var searchFolder = parentFolder || project.rootItem;
        for (var i = 0; i < searchFolder.children.numItems; i++) {
            var child = searchFolder.children[i];
            if (child.type === FolderItem.FOLDER && child.name === folderName) {
                return true;
            }
        }
        return false;
    }
    
    // 폴더 생성 함수 수정
    function createFolder(folderInfo, parentFolder) {
        var existingFolder = null;
        
        // 기존 폴더 찾기
        var searchFolder = parentFolder || project.rootItem;
        for (var i = 0; i < searchFolder.children.numItems; i++) {
            var child = searchFolder.children[i];
            if (child.type === ProjectItemType.BIN && child.name === folderInfo.name) {
                existingFolder = child;
                break;
            }
        }

        // 폴더가 없으면 새로 생성
        var targetFolder = existingFolder;
        if (!existingFolder) {
            targetFolder = parentFolder ? 
                parentFolder.createBin(folderInfo.name) : 
                project.rootItem.createBin(folderInfo.name);
            targetFolder.setColorLabel(folderInfo.color);
        }
        
        // 하위 폴더 생성
        if (folderInfo.subFolders) {
            for (var i = 0; i < folderInfo.subFolders.length; i++) {
                createFolder(folderInfo.subFolders[i], targetFolder);
            }
        }
        
        return targetFolder;
    }
    
    // 폴더 구조 생성
    try {
        for (var i = 0; i < folderStructure.length; i++) {
            createFolder(folderStructure[i]);
        }
        alert("폴더 구조 생성이 완료되었습니다."); // 최종 완료 메시지만 표시
    } catch (e) {
        alert("오류 발생: " + e.toString()); // 에러 발생 시에만 표시
    }
})(); 