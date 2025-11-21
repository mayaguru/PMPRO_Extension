# 트러블슈팅 및 개발 가이드

## Adobe Media Encoder (AME) 렌더링 시 In/Out 포인트 설정하여 큐에 추가하기

스크립트를 통해 시퀀스의 특정 구간(In/Out 포인트)만 AME 큐에 추가하려면 다음 절차를 따릅니다.

### 1. 시퀀스에 In/Out 포인트 설정
먼저 활성 시퀀스 객체에 `setInPoint()`와 `setOutPoint()` 메서드를 사용하여 구간을 설정해야 합니다. 시간 단위는 **Ticks** 문자열이어야 합니다.

```javascript
var seq = app.project.activeSequence;
var startTick = "1234567890"; // 시작 시간 (Ticks)
var endTick = "1234999999";   // 종료 시간 (Ticks)

seq.setInPoint(startTick);
seq.setOutPoint(endTick);
```

### 2. AME 큐에 추가 (encodeSequence)
`app.encoder.encodeSequence()` 함수를 호출할 때 4번째 인자로 **렌더링 범위(Range)**를 지정해야 합니다.

*   **0**: 전체 시퀀스 (Entire Sequence)
*   **1**: In/Out 구간 (In to Out)
*   **2**: 작업 영역 (Work Area)

따라서 In/Out 구간을 렌더링하려면 `1`을 전달하거나 `app.encoder.ENCODE_IN_TO_OUT` 상수를 사용합니다.

```javascript
var outPath = "C:/Output/MyVideo.mp4";
var presetPath = "C:/Presets/MyPreset.epr";
var rangeToEncode = 1; // 1 = In/Out 구간
var removeFromQueue = 1; // 1 = 성공 시 큐에서 제거

var jobID = app.encoder.encodeSequence(
    seq, 
    outPath, 
    presetPath, 
    rangeToEncode, 
    removeFromQueue
);

if (jobID) {
    $.writeln("큐 추가 성공: " + jobID);
} else {
    $.writeln("큐 추가 실패");
}
```

### 주의사항
*   `app.encoder` 객체가 존재하는지 먼저 확인해야 합니다 (`if (app.encoder) ...`).
*   `launchEncoder()`를 호출하여 AME가 실행 중인지 확인하는 것이 좋습니다.
*   `setOutPoint` 설정 시, 다음 클립의 시작과 겹치지 않게 하려면 1 Tick을 빼주는 것이 안전할 수 있습니다.

## 사용자 정의 프리셋(.epr) 사용 시 주의사항 (Silent Failure)

사용자 정의 프리셋을 사용할 때, 스크립트에서는 "성공(Job ID 반환)"했다고 나오지만 실제 AME 큐에는 추가되지 않는 현상이 발생할 수 있습니다. 이는 AME가 API를 통해 호출될 때 프리셋의 유효성을 엄격하게 체크하거나, "시스템 프리셋"으로 인식되지 않는 경우 발생할 수 있습니다.

### 해결 방법: 프리셋 파일(.epr) 수정

`.epr` 파일(XML 형식)을 텍스트 에디터로 열어 다음 태그를 확인하고 수정합니다.

1.  **FolderDisplayPath 추가**:
    `<FolderDisplayPath>` 태그가 비어있다면, 시스템 경로처럼 보이도록 값을 채워줍니다.
    ```xml
    <!-- 변경 전 -->
    <FolderDisplayPath></FolderDisplayPath>
    
    <!-- 변경 후 -->
    <FolderDisplayPath>System Presets/Custom</FolderDisplayPath>
    ```

2.  **PresetName 및 Comments 정리**:
    한글이나 특수문자가 포함된 경우 인코딩 문제가 발생할 수 있으므로 영문으로 변경해 봅니다.

3.  **Match Source 설정 확인**:
    프리셋이 "소스 일치(Match Source)" 설정을 포함하고 있다면, 렌더링하려는 시퀀스의 해상도나 프레임레이트가 프리셋이 허용하는 범위 내에 있는지 확인해야 합니다. 특히 HEVC(H.265)의 경우 **Tier**나 **Level** 설정이 시퀀스 해상도(예: 8K)와 맞지 않으면 실패할 수 있습니다.
