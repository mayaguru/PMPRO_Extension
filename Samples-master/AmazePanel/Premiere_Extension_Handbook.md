# Premiere Extension Handbook

이 문서는 AmazePanel 기반 Premiere Pro 확장(Extensions 패널)에서 **직접 경험하며 확인한 명령/흐름/주의점**만 정리한 헬프 문서입니다. 새로 투입된 개발자가 같은 시행착오 없이 따라 할 수 있도록 **버튼/스크립트 위치, 실행 순서, 전제조건, 실패 시 회피법**을 단계별로 적었습니다.

**⚠️ 중요**: 이 문서는 사용법뿐만 아니라 **실제 코드 작성에 필요한 API 사용법과 예제**를 포함합니다. Premiere Pro ExtendScript API를 처음 사용하는 개발자도 이 문서만으로 기능을 구현할 수 있도록 상세히 작성되었습니다.

## 1) 기본 설정
- **패널 실행**: Premiere 메뉴 `Window > Extensions > AmazePanel` (또는 `Showflow Viz` 탭)에서 열기.
- **프리셋/출력 설정(필수)**: 패널 `Folder Setting` 탭  
  1) `Pick preset (.epr)`로 AME 프리셋 선택  
  2) `Pick output folder`로 렌더 출력 폴더 선택  
  → `flow_config.json`에 `renderPreset`, `renderOutput` 저장.
- **Showflow 파일 선택**: `flow/*.showflow.json` 사용. 패널에서 선택 시 `__showflow_backups`에 자동 백업 생성.
- **AME 필요**: 모든 렌더 스크립트가 `app.encoder.launchEncoder()` 호출. AME 미설치/미응답 시 큐 실패.

## 2) 타임라인 정리 / 인아웃 (jsx/custom)
- 실행 위치: 패널 버튼 또는 `File > Scripts`.
- **03_Set_InOut_By_Markers.jsx**: 플레이헤드 기준 앞/뒤 마커를 찾아 In/Out 설정(마커 2개 이상).
- **05_Clean_InOut.jsx**: 플레이헤드 인접 마커 구간만 남기고 밖의 클립 삭제(+1프레임 마진). 끝에 시퀀스 이름 변경 프롬프트 등장.
- **13_SetInOutFromClip.jsx**: 선택 클립(또는 전달 슬롯)으로 In/Out 설정.
- **04_Cal_Mark_Duration.jsx**: 마커 기반 구간 길이 계산 후 로그 출력.

### 2.1) In/Out 설정 API 사용법

```javascript
// 활성 시퀀스 가져오기
var seq = app.project.activeSequence;
if (!seq) {
    alert("No active sequence");
    return;
}

// In/Out 포인트 설정 (ticks 단위)
var TICKS_PER_SECOND = 254016000000;
var inTicks = 0; // 시작점 (초 단위로 변환: seconds * TICKS_PER_SECOND)
var outTicks = 10 * TICKS_PER_SECOND; // 10초 지점

seq.setInPoint(inTicks);
seq.setOutPoint(outTicks);

// 또는 문자열로 설정 (timecode 형식)
seq.setInPoint("00:00:00:00");
seq.setOutPoint("00:00:10:00");

// 현재 In/Out 포인트 읽기
var inPoint = seq.getInPoint(); // Time 객체 반환
var outPoint = seq.getOutPoint(); // Time 객체 반환
var inTicks = inPoint.ticks; // ticks 값
```

### 2.2) 마커 조작 API

```javascript
var seq = app.project.activeSequence;
var markers = seq.markers;

// 마커 개수 확인
var markerCount = markers.numMarkers;

// 첫 번째 마커 가져오기
var firstMarker = markers.getFirstMarker();

// 다음 마커 가져오기
var nextMarker = markers.getNextMarker(firstMarker);

// 모든 마커 순회
var markerList = [];
var currentMarker = markers.getFirstMarker();
while (currentMarker) {
    markerList.push({
        name: currentMarker.name || "",
        start: currentMarker.start.ticks, // ticks 단위
        comment: currentMarker.comments || ""
    });
    currentMarker = markers.getNextMarker(currentMarker);
}

// 마커 시간순 정렬
markerList.sort(function(a, b) {
    return Number(a.start) - Number(b.start);
});

// 마커 생성 (예제 - 실제 API는 제한적)
// 주의: ExtendScript에서는 마커 생성이 제한적일 수 있음
```

### 2.3) 클립 선택 및 조작

```javascript
var seq = app.project.activeSequence;

// 선택된 클립 가져오기
var selection = seq.getSelection();
if (selection && selection.length > 0) {
    var selectedClip = selection[0];
    var clipStart = selectedClip.start.ticks;
    var clipEnd = selectedClip.end.ticks;
    var clipDuration = clipEnd - clipStart;
}

// 트랙의 모든 클립 순회
for (var i = 0; i < seq.videoTracks.numTracks; i++) {
    var track = seq.videoTracks[i];
    for (var j = 0; j < track.clips.numItems; j++) {
        var clip = track.clips[j];
        // clip.name, clip.start.ticks, clip.end.ticks 등 사용
    }
}

// 클립 비활성화/활성화
if (typeof clip.setVideoEnabled === "function") {
    clip.setVideoEnabled(false); // 비활성화
    clip.setVideoEnabled(true);  // 활성화
} else {
    clip.disabled = true;  // 비활성화
    clip.disabled = false; // 활성화
}
```

## 3) Showflow 연동 및 시퀀스 생성/동기화
- **07_BuildTestScene.jsx** (패널 버튼): 선택한 Showflow JSON을 읽어 슬롯/마커 구조를 가진 테스트 시퀀스 생성 → 구조 검증용.
- **08_BuildFromMediaAndUpdateShowflow.jsx**: 미디어를 참조해 시퀀스를 빌드하고, 사용한 클립 메타를 Showflow JSON에 기록.
- **09_UpdateShowflow*.jsx** (세 변형): 현재 시퀀스 → 마커/클립 정보를 스캔해 원본 Showflow JSON을 갱신.
- **cleanup_showflow.py**: JSON 정리/백업 유틸. `python cleanup_showflow.py flow/<file>.showflow.json` 식으로 수동 실행 가능.

### 3.1) 시퀀스 생성 API

```javascript
// 방법 1: 기본 시퀀스 생성
var seqName = "My New Sequence";
var placeholderID = "xyz123"; // 임의의 ID (실제로는 사용되지 않음)
app.project.createNewSequence(seqName, placeholderID);

// 방법 2: 클립에서 시퀀스 생성
var selectedItems = app.getProjectViewSelection(viewIDs[0]);
if (selectedItems && selectedItems.length > 0) {
    var newSeq = app.project.createNewSequenceFromClips(
        "New Sequence from Clips",
        selectedItems,
        app.project.rootItem
    );
}

// 방법 3: 프리셋으로 시퀀스 생성 (QE API 필요)
app.enableQE();
var presetPath = "C:/path/to/preset.seqpreset";
var seqName = prompt("Sequence name?", "New Sequence");
if (seqName) {
    qe.project.newSequence(seqName, presetPath);
}

// 생성된 시퀀스 활성화
var newSeq = app.project.sequences[app.project.sequences.numSequences - 1];
app.project.activeSequence = newSeq;
```

### 3.2) 트랙 추가 및 클립 삽입

```javascript
var seq = app.project.activeSequence;

// 비디오 트랙 추가 (여러 방법 시도)
function ensureVideoTracks(seq, neededCount) {
    while (seq.videoTracks.numTracks < neededCount) {
        var before = seq.videoTracks.numTracks;
        
        // 방법 1
        if (typeof seq.videoTracks.addTrack === "function") {
            seq.videoTracks.addTrack();
        }
        // 방법 2
        else if (typeof seq.videoTracks.add === "function") {
            seq.videoTracks.add();
        }
        // 방법 3
        else if (typeof seq.insertVideoTrackAt === "function") {
            seq.insertVideoTrackAt(seq.videoTracks.numTracks);
        }
        // 방법 4
        else if (typeof seq.addTracks === "function") {
            seq.addTracks(1, 0); // 비디오 1개, 오디오 0개
        }
        
        // 무한루프 방지
        if (seq.videoTracks.numTracks === before) {
            alert("트랙 추가 실패. 수동으로 추가해주세요.");
            break;
        }
    }
}

// 오디오 트랙 추가
function ensureAudioTracks(seq, neededCount) {
    while (seq.audioTracks.numTracks < neededCount) {
        if (typeof seq.audioTracks.addTrack === "function") {
            seq.audioTracks.addTrack();
        } else if (typeof seq.addTracks === "function") {
            seq.addTracks(0, 1); // 비디오 0개, 오디오 1개
        } else {
            break;
        }
    }
}

// 클립 삽입
function insertClipAt(track, projectItem, timeSeconds, nameOverride) {
    try {
        track.insertClip(projectItem, timeSeconds);
        var clip = track.clips[track.clips.numItems - 1];
        
        // 클립 이름 설정
        if (nameOverride) {
            clip.name = nameOverride;
        }
        
        // 클립 길이 조정 (필요시)
        var endTime = new Time();
        endTime.seconds = timeSeconds + 10; // 예: 10초 길이
        clip.end = endTime;
        
        return clip;
    } catch (e) {
        $.writeln("insertClip failed: " + e);
        return null;
    }
}

// 사용 예제
var track = seq.videoTracks[0];
var projectItem = app.project.rootItem.children[0]; // 프로젝트의 첫 번째 아이템
insertClipAt(track, projectItem, 0, "My Clip");
```

### 3.3) FPS 및 시간 변환

```javascript
// FPS 가져오기
function getFPS(seq) {
    var fps = 60; // 기본값
    try {
        if (seq.videoFrameRate && seq.videoFrameRate.seconds) {
            fps = Math.round(1 / Number(seq.videoFrameRate.seconds));
        }
    } catch (e) {
        $.writeln("FPS detection failed: " + e);
    }
    return fps;
}

// 프레임 ↔ 초 변환
var TICKS_PER_SECOND = 254016000000; // Premiere의 ticks 상수

function framesToSeconds(frames, fps) {
    return frames / fps;
}

function secondsToFrames(seconds, fps) {
    return Math.round(seconds * fps);
}

function framesToTicks(frames, fps) {
    return Math.round((frames / fps) * TICKS_PER_SECOND);
}

function ticksToFrames(ticks, fps) {
    return Math.round((ticks / TICKS_PER_SECOND) * fps);
}

// 사용 예제
var seq = app.project.activeSequence;
var fps = getFPS(seq);
var frameNumber = 600; // 600프레임
var timeInSeconds = framesToSeconds(frameNumber, fps); // 10초 (60fps 기준)
var ticks = framesToTicks(frameNumber, fps);
```

## 4) 렌더링 워크플로 (버튼·전제·동작·주의)
- 공통: 프리셋/출력 폴더 설정 필수. AME 설치. EXR 등 무거운 시퀀스는 렌더 전에 Program Monitor를 수동으로 닫거나 다른 탭으로 전환(자동 토글 없음).

### 4.1) 렌더 큐 API 상세 사용법

렌더링은 `app.encoder` 객체를 통해 수행됩니다. AME(Adobe Media Encoder)가 설치되어 있어야 합니다.

```javascript
// 1. Encoder 객체 확인
if (!app.encoder) {
    alert("Encoder object not available. AME might not be installed.");
    return;
}

// 2. AME 실행 (필수 - 큐잉 전에 호출)
var encoderLaunched = app.encoder.launchEncoder();
if (!encoderLaunched) {
    alert("Failed to launch AME. Please check if AME is installed.");
    return;
}

// 3. 시퀀스 렌더 큐에 추가
var seq = app.project.activeSequence;
var outputPath = "C:/Output/MySequence.mp4"; // 전체 경로 포함 파일명
var presetPath = "C:/Presets/H264.epr"; // .epr 파일 경로

// WorkAreaType 상수 (app.encoder 객체에서 확인)
// 0: ENCODE_ENTIRE (전체 시퀀스)
// 1: ENCODE_IN_TO_OUT (In/Out 포인트)
// 2: ENCODE_WORKAREA (워크에어리어)
var rangeToEncode = app.encoder.ENCODE_IN_TO_OUT || 1;

// removeOnCompletion: 렌더 완료 후 큐에서 제거 여부 (1: 제거, 0: 유지)
var removeOnCompletion = 1;

// startQueueImmediately: 즉시 시작 여부 (선택사항, 기본값 true)
var startImmediately = true;

// Windows 경로 정규화 (필수!)
if ($.os.indexOf("Windows") !== -1) {
    outputPath = outputPath.replace(/\//g, "\\");
    presetPath = presetPath.replace(/\//g, "\\");
}

// 큐에 추가
var jobID = app.encoder.encodeSequence(
    seq,
    outputPath,
    presetPath,
    rangeToEncode,
    removeOnCompletion,
    startImmediately
);

if (jobID) {
    $.writeln("Render job queued: " + jobID + " -> " + outputPath);
    alert("Queued render:\n" + outputPath + "\nJob ID: " + jobID);
} else {
    alert("Failed to queue render. Check:\n- AME is running\n- Preset path is valid\n- Output path is writable");
}
```

### 4.2) 렌더 이벤트 리스너

```javascript
// 렌더 진행 상황 모니터링 (선택사항)
app.encoder.bind('onEncoderJobComplete', function(event) {
    $.writeln("Job completed: " + event.jobID);
});

app.encoder.bind('onEncoderJobError', function(event) {
    $.writeln("Job error: " + event.jobID + " - " + event.error);
});

app.encoder.bind('onEncoderJobProgress', function(event) {
    var percent = event.progress || 0;
    $.writeln("Job progress: " + percent + "%");
});

app.encoder.bind('onEncoderJobQueued', function(event) {
    $.writeln("Job queued: " + event.jobID);
});

app.encoder.bind('onEncoderJobCanceled', function(event) {
    $.writeln("Job canceled: " + event.jobID);
});
```

### 4.3) 파일명 생성 및 경로 처리

```javascript
// 파일명 정리 함수
function sanitizeFilename(name) {
    // 파일명에 사용할 수 없는 문자 제거
    return name.replace(/[<>:"/\\|?*]/g, "_")
               .replace(/\s+/g, "_")
               .replace(/_{2,}/g, "_");
}

// 확장자 결정 (프리셋 경로에서 추론)
function getExtensionFromPreset(presetPath) {
    if (/mov/i.test(presetPath)) return ".mov";
    if (/mxf/i.test(presetPath)) return ".mxf";
    if (/avi/i.test(presetPath)) return ".avi";
    return ".mp4"; // 기본값
}

// 출력 경로 생성
function buildOutputPath(outputFolder, sequenceName, clipName, presetPath) {
    var baseName = sanitizeFilename(sequenceName);
    var clipPart = clipName ? "_" + sanitizeFilename(clipName) : "";
    var ext = getExtensionFromPreset(presetPath);
    var fileName = baseName + clipPart + ext;
    
    // 폴더 구분자 정규화
    var sep = ($.os.indexOf("Windows") !== -1) ? "\\" : "/";
    if (outputFolder[outputFolder.length - 1] !== sep) {
        outputFolder += sep;
    }
    
    return outputFolder + fileName;
}

// 사용 예제
var outputFolder = "C:/Output";
var seqName = "My Sequence";
var clipName = "Clip A";
var presetPath = "C:/Presets/H264.epr";
var fullPath = buildOutputPath(outputFolder, seqName, clipName, presetPath);
// 결과: "C:\Output\My_Sequence_Clip_A.mp4"
```

### A. 전체/인아웃 렌더 (10_RenderSelected.jsx)
- 버튼: 패널 "Render Selected"
- 전제: 활성 시퀀스가 열려 있어야 함.
- 동작: 활성 시퀀스 In/Out(기본) 또는 전체 범위 → `<시퀀스명>.<확장자>`로 AME 큐.

**실제 구현 코드 예제:**

```javascript
(function() {
    // 설정 파일 로드
    function loadConfig() {
        var scriptFile = new File($.fileName);
        var panelRoot = scriptFile.parent.parent.parent;
        var cfg = new File(panelRoot.fullName + "/flow_config.json");
        if (cfg.exists) {
            cfg.encoding = "UTF-8";
            if (cfg.open("r")) {
                var txt = cfg.read();
                cfg.close();
                try { return JSON.parse(txt); } catch (e) { return null; }
            }
        }
        return null;
    }

    try {
        // 활성 시퀀스 확인
        if (!app.project || !app.project.activeSequence) {
            alert("No active sequence.");
            return;
        }

        // 설정 로드
        var cfg = loadConfig();
        if (!cfg || !cfg.renderPreset || !cfg.renderOutput) {
            alert("Render preset or output folder not set.");
            return;
        }

        var presetFile = new File(cfg.renderPreset);
        var outFolder = new Folder(cfg.renderOutput);
        
        if (!presetFile.exists || !outFolder.exists) {
            alert("Preset or output folder not found.");
            return;
        }

        var seq = app.project.activeSequence;
        var baseName = seq.name || "sequence";
        var ext = /mov/i.test(cfg.renderPreset) ? ".mov" : ".mp4";
        var outPath = outFolder.fsName + "/" + baseName + ext;

        // Windows 경로 정규화
        if ($.os.indexOf("Windows") !== -1) {
            outPath = outPath.replace(/\//g, "\\");
        }

        // AME 실행
        if (!app.encoder) {
            alert("Encoder not available.");
            return;
        }
        app.encoder.launchEncoder();

        // In/Out 범위로 렌더
        var rangeToEncode = app.encoder.ENCODE_IN_TO_OUT || 1;
        var removeFromQueue = 1;

        var jobID = app.encoder.encodeSequence(
            seq,
            outPath,
            presetFile.fsName,
            rangeToEncode,
            removeFromQueue
        );

        if (jobID) {
            alert("Queued: " + outPath + "\nJob ID: " + jobID);
        } else {
            alert("Failed to queue render.");
        }
    } catch (e) {
        alert("Error: " + e + "\nLine: " + (e.line || "?"));
    }
})();
```

### B. 마커 단위 렌더 (11_Queue_Markers_To_AME.jsx)
- 버튼: 패널 "Queue Markers to AME"
- 전제: 마커 2개 이상.
- 동작: 마커 시간 정렬 → [마커 i, 마커 i+1) 구간으로 In/Out 설정 후 큐.
- 파일명: 마커 이름 있으면 사용, 없으면 `<시퀀스명>_번호`.

**핵심 구현 로직:**

```javascript
// 마커 수집 및 정렬
var markers = seq.markers;
var markerList = [];
var currentMarker = markers.getFirstMarker();
while (currentMarker) {
    markerList.push(currentMarker);
    currentMarker = markers.getNextMarker(currentMarker);
}

// 시간순 정렬
markerList.sort(function(a, b) {
    return Number(a.start.ticks) - Number(b.start.ticks);
});

// 각 마커 구간별로 렌더 큐
for (var i = 0; i < markerList.length - 1; i++) {
    var startMarker = markerList[i];
    var endMarker = markerList[i + 1];

    // In/Out 설정
    seq.setInPoint(startMarker.start.ticks);
    seq.setOutPoint(endMarker.start.ticks - 1); // 겹침 방지

    // 파일명 생성
    var fileName;
    if (startMarker.name && startMarker.name.length > 0) {
        fileName = sanitizeFilename(startMarker.name) + ext;
    } else {
        fileName = seqName + "_" + (i + 1) + ext;
    }

    var outPath = outputFolder + "\\" + fileName;

    // 큐에 추가
    var jobID = app.encoder.encodeSequence(
        seq,
        outPath,
        presetPath,
        app.encoder.ENCODE_IN_TO_OUT || 1,
        1 // removeOnCompletion
    );
}
```

### C. 선택된 Showflow 클립 렌더 (12_RenderSelectedClips.jsx)
- 버튼: `showflow_viz.html` 타임라인 뷰 → 렌더할 클립 선택 → "Render Selected"
- 전제: 최소 1개 클립 선택, 프리셋/출력 폴더 설정 완료.
- In/Out: `time`/`duration`(프레임) → 틱 변환 → 활성 시퀀스 In/Out 설정.
- 범위 밖 처리 모드  
  - 기본(안전): 범위 밖 클립을 비활성화 → 큐 → 끝나면 복원.  
  - 삭제 모드(복구 없음): payload에 `deleteOutside: true`를 넣어 호출하면 범위 밖 클립 삭제 후 큐.  
    - 예시 payload:
      ```json
      {"clips":[...],"presetPath":"...","outputFolder":"...","deleteOutside":true}
      ```
- 브랜치 격리: 클립명 끝의 대문자 한 글자(A/B 등)를 감지 → 같은 접미어만 활성화 후 큐.
- 파일명: `<시퀀스명>_<클립명>.<확장자>`.

**핵심 구현 로직:**

```javascript
// 프레임 → 틱 변환
var TICKS_PER_SECOND = 254016000000;
function framesToTicks(frames, fps) {
    return Math.round((frames / fps) * TICKS_PER_SECOND);
}

// 각 클립별 렌더
for (var i = 0; i < clips.length; i++) {
    var clip = clips[i];
    var startFrame = clip.time || 0;
    var durationFrames = clip.duration || 0;
    var fps = getFPS(seq);

    // 프레임 → 틱 변환
    var inTicks = framesToTicks(startFrame, fps);
    var outTicks = framesToTicks(startFrame + durationFrames, fps);

    // In/Out 설정
    seq.setInPoint(inTicks);
    seq.setOutPoint(outTicks - 1); // 겹침 방지

    // 범위 밖 클립 처리
    var toggledClips = [];
    if (!deleteOutside) {
        // 비활성화 모드: 범위 밖 클립 비활성화
        toggledClips = disableOutsideRange(seq, inTicks, outTicks, fps);
    } else {
        // 삭제 모드: 범위 밖 클립 삭제
        removeOutsideRange(seq, inTicks, outTicks, fps);
    }

    // 브랜치 격리 (클립명 끝의 대문자 한 글자 감지)
    var branchSuffix = clip.name.match(/_([A-Z])$/);
    if (branchSuffix) {
        var suffix = branchSuffix[1];
        // 같은 접미어만 활성화하는 로직...
    }

    // 렌더 큐
    var fileName = seq.name + "_" + clip.name + ext;
    var outPath = outputFolder + "\\" + fileName;
    var jobID = app.encoder.encodeSequence(seq, outPath, presetPath, 1, 1);

    // 복원 (비활성화 모드인 경우)
    if (!deleteOutside && toggledClips.length > 0) {
        restoreClipEnables(toggledClips);
    }
}
```

## 5) 기타 유틸리티/테스트
- **01_Create_Def_folders.jsx**: 기본 폴더 생성 스크립트.
- **02_Relink_Clip.jsx**: 미디어 재연결 보조.
- **06_ClipOption.jsx**: 클립 옵션 설정 보조.
- **09_Test_Minimal.jsx**, `test/*.jsx`: 패널/스크립트 동작 테스트용 샘플.
- **Logger.jsxinc / .debug**: 로그 출력 및 디버그 옵션.

## 6) 프론트엔드/서버 구성
- **패널 UI**: `index.html`, `showflow_viz.html`(에디터/타임라인 뷰), `css/style.css`, `js/server_manager.js`, `ext.js`.
- **AME 프리셋**: `preset/*.epr`, `payloads/png.epr` 등 샘플 프리셋 포함.
- **Python 서버(옵션)**: `python_server/vr_server.py`, 정적 자산(`static/js`, `templates/vr_client.html`) — VR/웹 뷰어 관련 기능. 패널과는 분리된 보조 도구.

## 7) 사용 시 팁
- **성능**: EXR 등 무거운 시퀀스는 렌더 전에 Program Monitor를 닫거나 다른 탭으로 전환(자동 토글 없음).
- **마커 의존**: 마커 기반 스크립트는 마커 2개 이상 필요.
- **삭제 모드(12번)**: `deleteOutside: true`는 복구 불가 → 사본 시퀀스에서만 사용.
- **브랜치 접미어**: 클립명 끝의 대문자 한 글자(A/B 등)를 브랜치로 취급, 겹치는 접미어만 활성화.
- **로그**: ExtendScript 로그는 `$.writeln` 출력 확인. 패널 오류는 "EvalScript error"로만 뜰 수 있으므로 콘솔/로그 체크 필요.

## 8) API 참조 요약

### 8.1) 핵심 객체 접근

```javascript
// 프로젝트 및 시퀀스
var project = app.project;
var seq = app.project.activeSequence;
var sequences = app.project.sequences; // SequenceCollection

// 트랙
var videoTracks = seq.videoTracks; // TrackCollection
var audioTracks = seq.audioTracks; // TrackCollection
var track = seq.videoTracks[0]; // 첫 번째 비디오 트랙

// 마커
var markers = seq.markers; // MarkerCollection

// 인코더
var encoder = app.encoder; // Encoder 객체
```

### 8.2) 주요 메서드 시그니처

```javascript
// 시퀀스 생성
app.project.createNewSequence(sequenceName: string, placeholderID: string): void
app.project.createNewSequenceFromClips(name: string, items: Array, bin: ProjectItem): Sequence

// In/Out 설정
seq.setInPoint(ticks: number | string): void
seq.setOutPoint(ticks: number | string): void
seq.getInPoint(): Time
seq.getOutPoint(): Time

// 렌더 큐
app.encoder.launchEncoder(): boolean
app.encoder.encodeSequence(
    sequence: Sequence,
    outputPath: string,
    presetPath: string,
    workAreaType?: number,      // 0:전체, 1:In/Out, 2:WorkArea
    removeOnCompletion?: number, // 0:유지, 1:제거
    startImmediately?: boolean   // true:즉시시작
): string // jobID 반환

// 클립 조작
track.insertClip(projectItem: ProjectItem, timeSeconds: number): void
clip.setVideoEnabled(enabled: boolean): void
clip.remove(): void

// 마커 순회
markers.getFirstMarker(): Marker
markers.getNextMarker(marker: Marker): Marker
markers.numMarkers: number
```

### 8.3) 상수 및 변환

```javascript
// 시간 상수
var TICKS_PER_SECOND = 254016000000; // Premiere Pro의 ticks 상수

// WorkAreaType 상수 (encoder 객체에서)
app.encoder.ENCODE_ENTIRE      // 0: 전체 시퀀스
app.encoder.ENCODE_IN_TO_OUT  // 1: In/Out 포인트
app.encoder.ENCODE_WORKAREA   // 2: 워크에어리어

// OS 확인
$.os.indexOf("Windows") !== -1  // Windows 확인
$.os.indexOf("Mac") !== -1      // Mac 확인
```

### 8.4) 파일 I/O 패턴

```javascript
// 파일 읽기
var file = new File("C:/path/to/file.json");
file.encoding = "UTF-8";
if (file.open("r")) {
    var content = file.read();
    file.close();
    var data = JSON.parse(content);
}

// 파일 쓰기
var outFile = new File("C:/path/to/output.json");
outFile.encoding = "UTF-8";
if (outFile.open("w")) {
    outFile.write(JSON.stringify(data, null, 2));
    outFile.close();
}

// 폴더 선택
var folder = Folder.selectDialog("Select folder");
if (folder) {
    var path = folder.fsName; // 전체 경로
}
```

### 8.5) 에러 처리 패턴

```javascript
try {
    // 코드 실행
    var result = someOperation();
    if (!result) {
        alert("Operation failed");
        return;
    }
} catch (e) {
    $.writeln("Error: " + e.toString());
    $.writeln("Line: " + (e.line || "unknown"));
    alert("Error occurred:\n" + e.toString());
}
```

### 8.6) JSON 처리 (ExtendScript ES3 호환)

```javascript
// JSON.parse 폴백 (ES3 환경)
if (typeof JSON === "undefined" || typeof JSON.parse !== "function") {
    JSON = {};
    JSON.parse = function(text) {
        return eval('(' + text + ')');
    };
}

// JSON.stringify 폴백 (간단한 버전)
if (typeof JSON.stringify !== "function") {
    JSON.stringify = function(obj) {
        // 간단한 구현 또는 수동 문자열화
        // (복잡한 객체는 라이브러리 사용 권장)
    };
}
```

## 9) 프로젝트 구조 및 파일 설명

### 9.1) 디렉토리 구조

```
AmazePanel/
├── CSXS/
│   └── manifest.xml          # CEP 확장 매니페스트 (패널 등록)
├── css/
│   └── style.css             # 패널 스타일시트
├── flow/                     # Showflow JSON 파일 저장소
│   ├── __showflow_backups/   # 자동 백업 (타임스탬프 포함)
│   └── *.showflow.json       # Showflow 파일들
├── js/
│   └── server_manager.js     # Python 서버 관리 (VR 기능용)
├── jsx/
│   ├── custom/               # 커스텀 스크립트들
│   │   ├── 01_Create_Def_folders.jsx
│   │   ├── 03_Set_InOut_By_Markers.jsx
│   │   ├── 04_Cal_Mark_Duration.jsx
│   │   ├── 05_Clean_InOut.jsx
│   │   ├── 07_BuildTestScene.jsx
│   │   ├── 08_BuildFromMediaAndUpdateShowflow.jsx
│   │   ├── 09_UpdateShowflow_temp.jsx
│   │   ├── 10_RenderSelected.jsx
│   │   ├── 11_Queue_Markers_To_AME.jsx
│   │   ├── 12_RenderSelectedClips.jsx
│   │   ├── 13_SetInOutFromClip.jsx
│   │   └── 14_VerifyMarkersAgainstShowflow.jsx
│   ├── PPRO/
│   │   └── Premiere.jsx      # Premiere API 래퍼 함수들
│   ├── PremierePro.23.0.d.ts # TypeScript 타입 정의
│   └── extendscript.d.ts     # ExtendScript 타입 정의
├── lib/                      # 외부 라이브러리
│   ├── CSInterface.js        # CEP 인터페이스
│   ├── jquery-1.9.1.js
│   └── Vulcan.js
├── payloads/                 # 테스트용 파일들
├── preset/                   # AME 프리셋 파일들 (.epr)
├── python_server/           # VR 스트리밍 서버 (선택사항)
├── flow_config.json          # 패널 설정 파일
├── index.html                # 메인 패널 UI
├── showflow_viz.html         # Showflow 에디터 UI
├── ext.js                    # CEP 초기화 및 이벤트 핸들러
└── PProPanel.jsx             # ExtendScript 진입점
```

### 9.2) 핵심 파일 설명

#### CSXS/manifest.xml
CEP 확장 매니페스트 파일. 패널을 Premiere Pro에 등록합니다.

```xml
<ExtensionManifest Version="5.0" ExtensionBundleId="com.adobe.AmazePanel">
  <ExtensionList>
    <Extension Id="com.adobe.AmazePanel" Version="99.0.0" />
  </ExtensionList>
  <ExecutionEnvironment>
    <HostList>
      <Host Name="PPRO" Version="9.0" />  <!-- Premiere Pro 2020+ -->
    </HostList>
  </ExecutionEnvironment>
  <DispatchInfoList>
    <Extension Id="com.adobe.AmazePanel">
      <DispatchInfo>
        <Resources>
          <MainPath>./index.html</MainPath>
          <ScriptPath>./PProPanel.jsx</ScriptPath>
        </Resources>
        <UI>
          <Type>Panel</Type>
          <Menu>AmazePanel</Menu>
        </UI>
      </DispatchInfo>
    </Extension>
  </DispatchInfoList>
</ExtensionManifest>
```

#### flow_config.json
패널의 전역 설정 파일. JSON 형식으로 저장됩니다.

```json
{
  "flowPath": "D:/path/to/showflow.showflow.json",  // 현재 선택된 Showflow 파일
  "mediaDir": "D:/path/to/media",                    // 미디어 폴더 (08 스크립트용)
  "renderOutput": "D:/RenderOut",                    // 렌더 출력 폴더
  "renderPreset": "D:/path/to/preset.epr",          // AME 프리셋 경로
  "quickScripts": [                                   // 빠른 실행 스크립트 목록
    {
      "path": "D:/path/to/script.jsx",
      "label": "Script Name"
    }
  ],
  "vr": {                                            // VR 서버 설정 (선택사항)
    "serverUrl": "http://localhost:5000",
    "mode": "region",
    "monitorIndex": 1,
    "fps": 30,
    "quality": 80,
    "region": {
      "top": 166,
      "left": 641,
      "width": 2190,
      "height": 1089
    }
  }
}
```

#### PProPanel.jsx
ExtendScript 진입점. `$._ext` 네임스페이스에 유틸리티 함수들을 제공합니다.

```javascript
$._ext = {
    evalFile: function(path) { /* 파일 실행 */ },
    evalFiles: function(jsxFolderPath) { /* 폴더 내 모든 .jsx 실행 */ },
    callScript: function(dataStr) { /* 스크립트 호출 헬퍼 */ }
};
```

#### ext.js
CEP 패널 초기화 및 이벤트 리스너 설정.

주요 기능:
- `loadJSX()`: ExtendScript 파일 자동 로드
- `onLoaded()`: 패널 로드 시 초기화
- 이벤트 리스너 등록 (시퀀스 변경, 프로젝트 변경 등)
- 테마 색상 동기화

### 9.3) Showflow JSON 구조

Showflow 파일은 시퀀스 구조를 JSON으로 표현합니다.

```json
{
  "showId": "TXTSceneSelect1",        // 쇼 ID (파일명 기반)
  "fps": 60,                          // 프레임레이트
  "tracks": {                         // 트랙 매핑 (브랜치 → 트랙 인덱스)
    "A": 0,
    "B": 1,
    "C": 2,
    "D": 3,
    "E": 4,
    "F": 5,
    "G": 6,
    "H": 7
  },
  "slots": [                          // 슬롯 배열 (마커 구간)
    {
      "time": 0,                      // 시작 프레임
      "duration": 600,                // 지속 프레임 수
      "name": "TXTBClip100",          // 슬롯 이름 (마커 이름과 일치)
      "clips": {                       // 각 트랙의 클립 정보
        "A": {                        // 브랜치 A의 클립
          "name": "TXTBClip100BranchA",
          "duration": 600,
          "in": 0,
          "out": 600
        },
        "B": "TXTBClip100BranchB",    // 간단한 문자열 형식도 지원
        "groupADFH": "SharedClip"     // 그룹 클립 (A,D,F,H 트랙에 복제)
      }
    }
  ]
}
```

**특수 키:**
- `groupADFH`: A, D, F, H 트랙에 동일 클립 배치
- `groupBCEG`: B, C, E, G 트랙에 동일 클립 배치

## 10) 각 스크립트 상세 기능

### 10.1) 01_Create_Def_folders.jsx
프로젝트에 표준 폴더 구조를 자동 생성합니다.

**기능:**
- 프로젝트 루트에 폴더 구조 생성
- 각 폴더에 컬러 라벨 자동 할당
- 중첩된 서브폴더 지원

**생성되는 폴더 구조:**
```
00_Render (보라색)
  ├── 00_Show (주황색)
  ├── 01_Mvers (주황색)
  └── 02_4DX (주황색)
01_Src (청색)
  ├── 00_Audio (청색)
  ├── 00_SFX (청색)
  ├── 01_Comp (청색)
  └── 01_SR (청색)
02_Proxy (초록색)
  ├── 01_Comp (초록색)
  └── 02_SR (초록색)
03_Seq (보라색)
  ├── 00_Show (주황색)
  │   ├── 00_FullShow (주황색)
  │   └── 01_Parts (주황색)
  ├── 01_Mvers (주황색)
  │   └── 01_Parts (주황색)
  └── 02_4DX (주황색)
99_Etc (빨간색)
```

**API 사용:**
```javascript
// 폴더 생성
var bin = project.rootItem.createBin("FolderName");
bin.setColorLabel(colorIndex); // 0-7 (색상 인덱스)

// 폴더 존재 확인
function folderExists(name, parent) {
    for (var i = 0; i < parent.children.numItems; i++) {
        var child = parent.children[i];
        if (child.type === ProjectItemType.BIN && child.name === name) {
            return true;
        }
    }
    return false;
}
```

### 10.2) 03_Set_InOut_By_Markers.jsx
플레이헤드 위치 기준으로 앞뒤 마커를 찾아 In/Out 포인트를 설정합니다.

**동작 방식:**
1. 현재 플레이헤드 위치 확인 (`seq.getPlayerPosition()`)
2. 모든 마커를 시간순으로 정렬
3. 플레이헤드 이전의 마커와 이후의 마커 찾기
4. 해당 구간을 In/Out으로 설정

**사용 예제:**
```javascript
var currentTime = seq.getPlayerPosition().ticks;
var markerTimes = []; // 마커 시간 배열

// 마커 수집 및 정렬
var m = markers.getFirstMarker();
while (m) {
    markerTimes.push(Number(m.start.ticks));
    m = markers.getNextMarker(m);
}
markerTimes.sort(function(a, b) { return a - b; });

// 앞뒤 마커 찾기
var prevMarker = null, nextMarker = null;
for (var i = 0; i < markerTimes.length; i++) {
    if (markerTimes[i] <= currentTime) {
        prevMarker = markerTimes[i];
    } else {
        nextMarker = markerTimes[i];
        break;
    }
}

// In/Out 설정
seq.setInPoint(prevMarker.toString());
seq.setOutPoint((nextMarker - 1).toString()); // 겹침 방지
```

### 10.3) 04_Cal_Mark_Duration.jsx
마커 간격과 In/Out 구간 정보를 계산하여 표시합니다.

**출력 정보:**
- 현재 위치 기준 앞뒤 마커 간격 (프레임, 타임코드)
- In/Out 구간 길이 및 구간 내 마커 목록
- 각 마커의 구간 시작점으로부터의 오프셋

**FPS 및 Timebase 감지:**
```javascript
// FPS 감지 (여러 방법 시도)
function detectFPS(seq) {
    try {
        // 방법 1: videoFrameRate.seconds
        if (seq.videoFrameRate && seq.videoFrameRate.seconds) {
            return Math.round(1 / Number(seq.videoFrameRate.seconds));
        }
        // 방법 2: timebase
        if (seq.timebase && !isNaN(seq.timebase)) {
            return Number(seq.timebase);
        }
        // 방법 3: framerate
        if (seq.framerate && !isNaN(seq.framerate)) {
            return Number(seq.framerate);
        }
    } catch (e) { }
    return 60; // 기본값
}

// Ticks → 프레임 변환
function ticksToFrames(ticks, timebase) {
    return Math.round(Number(ticks) / timebase);
}

// 프레임 → 타임코드 변환
function formatTimeCode(frames, fps) {
    var totalSeconds = Math.floor(frames / fps);
    var remainingFrames = Math.floor(frames % fps);
    var hours = Math.floor(totalSeconds / 3600);
    var minutes = Math.floor((totalSeconds % 3600) / 60);
    var seconds = totalSeconds % 60;
    return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds) + ':' + pad(remainingFrames);
}
```

### 10.4) 05_Clean_InOut.jsx
In/Out 구간 밖의 클립을 삭제하고 시퀀스 이름을 변경합니다.

**동작 순서:**
1. 플레이헤드 기준 인접 마커 찾기 (03과 동일)
2. In/Out 설정
3. 구간 밖 클립 삭제 (1프레임 마진 적용)
4. 시퀀스 이름 변경 프롬프트 표시

**클립 유지 조건:**
```javascript
function shouldKeepClip(clip, inTicks, outTicks, fps) {
    var clipStart = clip.start.ticks;
    var clipEnd = clip.end.ticks;
    var margin = Math.round(1 * 254016000000 / fps); // 1프레임 마진
    
    // 클립이 구간과 겹치면 유지
    if ((clipEnd > (inTicks - margin)) && (clipStart < (outTicks + margin))) {
        return true;
    }
    return false;
}

// 클립 삭제
function cleanTrack(track, inTicks, outTicks, fps) {
    for (var i = track.clips.numItems - 1; i >= 0; i--) {
        var clip = track.clips[i];
        if (!shouldKeepClip(clip, inTicks, outTicks, fps)) {
            clip.remove(0, 1); // remove(ripple, affectLinked)
        }
    }
}
```

**주의사항:**
- 삭제된 클립은 복구 불가능
- 비디오/오디오 트랙 모두 정리됨
- 마진 적용으로 구간 경계의 클립도 보존

### 10.5) 13_SetInOutFromClip.jsx
Showflow 에디터에서 선택한 클립의 시간 범위로 In/Out을 설정합니다.

**호출 방식:**
패널에서 `$._ext.setInOutFromClip()` 함수로 호출됩니다.

**파라미터:**
```javascript
{
    startFrame: 0,      // 시작 프레임
    endFrame: 600,      // 종료 프레임
    clipName: "ClipA"   // 클립 이름 (로깅용)
}
```

**구현:**
```javascript
$._ext.setInOutFromClip = function(payloadStr) {
    var data = JSON.parse(decodeURIComponent(payloadStr));
    var startFrame = Number(data.startFrame) || 0;
    var endFrame = Number(data.endFrame) || 0;
    
    var fps = getFPS(seq);
    var TICKS_PER_SECOND = 254016000000;
    
    // 프레임 → 초 변환
    var inSec = startFrame / fps;
    var outSec = endFrame / fps;
    
    // In/Out 설정 (여러 방법 시도)
    try {
        seq.setInPoint(inSec);      // 초 단위
        seq.setOutPoint(outSec);
    } catch (e) {
        // 틱 단위로 재시도
        var inTicks = Math.round(inSec * TICKS_PER_SECOND);
        var outTicks = Math.round(outSec * TICKS_PER_SECOND);
        seq.setInPoint(inTicks.toString());
        seq.setOutPoint(outTicks.toString());
    }
    
    return "OK: In/Out set for '" + clipName + "'";
};
```

### 10.6) 14_VerifyMarkersAgainstShowflow.jsx
시퀀스의 마커와 Showflow JSON의 슬롯을 비교하여 일치 여부를 검증합니다.

**검증 항목:**
1. 마커 개수 vs 슬롯 개수
2. 각 마커의 시간 vs 슬롯의 time (프레임 단위)
3. 마커 이름 vs 슬롯 이름

**구현:**
```javascript
// 마커 수집 및 정렬
var markerList = [];
var m = markers.getFirstMarker();
while (m) {
    markerList.push(m);
    m = markers.getNextMarker(m);
}
markerList.sort(function(a, b) {
    return Number(a.start.ticks) - Number(b.start.ticks);
});

// 슬롯 정렬
var slotList = flow.slots.slice().sort(function(a, b) {
    return Number(a.time || 0) - Number(b.time || 0);
});

// 비교
var errors = [];
if (markerList.length !== slotList.length) {
    errors.push("개수 불일치: 마커 " + markerList.length + " vs 슬롯 " + slotList.length);
}

for (var i = 0; i < Math.min(markerList.length, slotList.length); i++) {
    var mk = markerList[i];
    var sl = slotList[i];
    
    // 시간 비교 (프레임 단위)
    var mkFrame = Math.round((Number(mk.start.ticks) / TICKS_PER_SECOND) * fps);
    var slotFrame = Number(sl.time || 0);
    if (mkFrame !== slotFrame) {
        errors.push("[" + i + "] 시간 불일치: 마커 " + mkFrame + "f vs 슬롯 " + slotFrame + "f");
    }
    
    // 이름 비교
    var mkName = mk.name || "";
    var slotName = sl.name || "";
    if (slotName && mkName !== slotName) {
        errors.push("[" + i + "] 이름 불일치: 마커 '" + mkName + "' vs 슬롯 '" + slotName + "'");
    }
}
```

## 11) CEP 패널 구조 및 통신

### 11.1) HTML ↔ ExtendScript 통신

CEP 패널은 HTML/JavaScript와 ExtendScript 간의 통신을 위해 `CSInterface`를 사용합니다.

**ExtendScript 호출:**
```javascript
// JavaScript에서 ExtendScript 호출
var csInterface = new CSInterface();

// 간단한 호출
csInterface.evalScript("app.project.activeSequence.name", function(result) {
    console.log("Sequence name: " + result);
});

// 함수 호출
csInterface.evalScript("$._ext.renderSelectedClips('" + encodeURIComponent(JSON.stringify(data)) + "')", function(result) {
    if (result.indexOf("ERR") === 0) {
        alert("Error: " + result);
    } else {
        console.log("Success: " + result);
    }
});
```

**ExtendScript에서 결과 반환:**
```javascript
// ExtendScript 함수
$._ext.myFunction = function(param) {
    try {
        // 작업 수행
        var result = doSomething(param);
        return "OK:" + result;  // 문자열 반환
    } catch (e) {
        return "ERR:" + e.toString();  // 에러 반환
    }
};
```

### 11.2) 이벤트 리스너

Premiere Pro의 상태 변경을 감지하기 위한 이벤트 리스너를 등록합니다.

**등록 방법 (ext.js):**
```javascript
// 시퀀스 활성화 변경
csInterface.evalScript("$._PPP_.registerSequenceActivatedFxn()");

// 시퀀스 내 선택 변경
csInterface.evalScript("$._PPP_.registerSequenceSelectionChangedFxn()");

// 프로젝트 변경
csInterface.evalScript("$._PPP_.registerProjectChangedFxn()");

// 프로젝트 패널 선택 변경
csInterface.evalScript("$._PPP_.registerProjectPanelSelectionChangedFxn()");
```

**콜백 함수:**
```javascript
function myCallBackFunction(data) {
    // 활성 시퀀스 이름 업데이트
    var seqDisplay = document.getElementById("active_seq");
    if (seqDisplay) {
        seqDisplay.innerHTML = data;
    }
}

// 주기적으로 활성 시퀀스 이름 가져오기
setInterval(function() {
    csInterface.evalScript("$._PPP_.getActiveSequenceName()", myCallBackFunction);
}, 1000);
```

### 11.3) 파일 시스템 접근

CEP 패널에서 파일 시스템에 접근하려면 ExtendScript를 통해야 합니다.

**파일 읽기:**
```javascript
// JavaScript
var jsx = "(function(){" +
    "var f = new File('" + filePath + "');" +
    "if(!f.exists) return 'missing';" +
    "f.encoding = 'UTF-8';" +
    "if(!f.open('r')) return 'cannot_open';" +
    "var txt = f.read();" +
    "f.close();" +
    "return txt;" +
    "})();";

csInterface.evalScript(jsx, function(result) {
    if (result === "missing" || result === "cannot_open") {
        alert("File error: " + result);
    } else {
        var data = JSON.parse(result);
        // 데이터 처리
    }
});
```

**파일 쓰기:**
```javascript
var jsx = "(function(){" +
    "var f = new File('" + filePath + "');" +
    "f.encoding = 'UTF-8';" +
    "if(!f.open('w')) return 'cannot_write';" +
    "f.write('" + content.replace(/'/g, "\\'") + "');" +
    "f.close();" +
    "return 'ok';" +
    "})();";
```

## 12) 트러블슈팅 가이드

### 12.1) AME 렌더 큐 실패

**증상:** `encodeSequence()`가 `null`을 반환하거나 Job ID가 없음

**원인 및 해결:**
1. **AME 미설치/미실행**
   ```javascript
   if (!app.encoder) {
       alert("AME not available");
       return;
   }
   app.encoder.launchEncoder(); // AME 실행
   ```

2. **프리셋 파일 문제**
   - `.epr` 파일이 손상되었거나 유효하지 않음
   - 프리셋이 시퀀스 설정과 호환되지 않음 (해상도, 프레임레이트)
   - 해결: 프리셋 파일을 텍스트 에디터로 열어 `<FolderDisplayPath>` 태그 확인

3. **경로 문제**
   ```javascript
   // Windows 경로 정규화 필수!
   if ($.os.indexOf("Windows") !== -1) {
       outPath = outPath.replace(/\//g, "\\");
       presetPath = presetPath.replace(/\//g, "\\");
   }
   ```

### 12.2) 마커 관련 오류

**증상:** "Not enough markers" 또는 마커를 찾을 수 없음

**원인:**
- 시퀀스에 마커가 없음
- 마커가 메인 시퀀스가 아닌 다른 위치에 있음
- 마커 시간 정보가 손상됨

**해결:**
```javascript
// 마커 존재 확인
var markers = seq.markers;
if (!markers || markers.numMarkers === 0) {
    alert("No markers found");
    return;
}

// 마커 시간 유효성 검사
var m = markers.getFirstMarker();
while (m) {
    if (!m.start || !m.start.ticks) {
        $.writeln("Invalid marker: " + m.name);
    }
    m = markers.getNextMarker(m);
}
```

### 12.3) 트랙 추가 실패

**증상:** `addTrack()` 호출해도 트랙이 추가되지 않음

**원인:**
- Premiere Pro 버전에 따라 트랙 추가 API가 제한됨
- 권한 문제

**해결:**
```javascript
// 여러 방법 시도
function ensureTracks(seq, neededCount) {
    while (seq.videoTracks.numTracks < neededCount) {
        var before = seq.videoTracks.numTracks;
        
        // 방법 1
        if (typeof seq.videoTracks.addTrack === "function") {
            seq.videoTracks.addTrack();
        }
        // 방법 2
        else if (typeof seq.insertVideoTrackAt === "function") {
            seq.insertVideoTrackAt(seq.videoTracks.numTracks);
        }
        // 방법 3
        else if (typeof seq.addTracks === "function") {
            seq.addTracks(1, 0);
        }
        
        // 무한루프 방지
        if (seq.videoTracks.numTracks === before) {
            alert("Cannot add tracks automatically. Please add manually.");
            break;
        }
    }
}
```

### 12.4) JSON 파싱 오류

**증상:** `JSON.parse()` 실패 또는 한글 인코딩 문제

**해결:**
```javascript
// 파일 인코딩 명시
file.encoding = "UTF-8";

// JSON.parse 폴백
if (typeof JSON !== "undefined" && JSON.parse) {
    try {
        data = JSON.parse(text);
    } catch (e) {
        $.writeln("JSON parse error: " + e);
    }
} else {
    // ES3 호환: eval 사용 (주의!)
    data = eval('(' + text + ')');
}
```

### 12.5) CEP 패널 로드 실패

**증상:** 패널이 표시되지 않거나 "Unsigned extension" 오류

**해결:**
1. **Windows Registry 설정:**
   ```
   HKEY_CURRENT_USER\Software\Adobe\CSXS.12
   PlayerDebugMode = "1" (String)
   ```

2. **Mac plist 설정:**
   ```bash
   defaults write ~/Library/Preferences/com.adobe.CSXS.12.plist PlayerDebugMode 1
   ```

3. **확장 설치 위치 확인:**
   - Windows: `C:\Program Files (x86)\Common Files\Adobe\CEP\extensions`
   - Mac: `/Library/Application Support/Adobe/CEP/extensions`

## 13) Python 서버 (VR 기능)

### 13.1) 개요

`python_server/vr_server.py`는 VR 헤드셋으로 Premiere Pro 화면을 스트리밍하는 선택적 기능입니다.

**기능:**
- 화면 캡처 (전체 모니터 또는 영역)
- JPEG 압축 및 스트리밍
- 웹 기반 VR 뷰어 제공

**시작 방법:**
1. 패널의 "Start Server" 버튼 클릭
2. 또는 `python_server/start_server.bat` 직접 실행
3. 브라우저에서 `http://localhost:5000` 접속

**설정 (flow_config.json):**
```json
{
  "vr": {
    "serverUrl": "http://localhost:5000",
    "mode": "region",           // "region" 또는 "monitor"
    "monitorIndex": 1,          // 모니터 인덱스 (0=전체, 1=주 모니터)
    "fps": 30,                  // 캡처 프레임레이트
    "quality": 80,              // JPEG 품질 (1-100)
    "region": {                  // mode="region"일 때 사용
      "top": 166,
      "left": 641,
      "width": 2190,
      "height": 1089
    }
  }
}
```

### 13.2) 서버 관리 API

**JavaScript (server_manager.js):**
```javascript
var ServerManager = {
    startServer: function() {
        // Windows: start_server.bat 실행
        // Mac: uv run vr_server.py 실행
    },
    stopServer: function() {
        // 프로세스 종료
    },
    openServerFolder: function() {
        // 서버 폴더 열기
    }
};
```

---
**적용 범위**: 위 목록은 현재 저장소에 포함되어 있고 실제 동작 확인된 스크립트/기능만 정리했습니다. 새로 추가/실험 기능은 이 문서에 별도 섹션으로 명시 후 업데이트하세요.

**📚 추가 학습 자료**:
- `jsx/PremierePro.23.0.d.ts`: TypeScript 정의 파일 (API 참조용)
- `jsx/PPRO/Premiere.jsx`: 실제 구현 예제 모음
- `jsx/custom/*.jsx`: 각 기능별 구현 예제
- `Showflow_Workflow.md`: Showflow 워크플로우 상세 설명
- `RenderSelectedClips_README.md`: 선택 클립 렌더 기능 설명
- `Troubleshooting.md`: 트러블슈팅 가이드
