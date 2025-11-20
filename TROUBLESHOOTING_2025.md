# Premiere 2025 Showflow 스크립트 히스토리 / 트러블슈팅 노트

## 최근 해결 내역
- **JSON.parse 미제공 호스트**: `07/08_*` 스크립트에 `JSON.parse` 부재 시 `eval` 폴백 추가.
- **showflow 경로 탐색**: 프로젝트 폴더 → `P:/99-Pipeline/PremiereScripts/Scripts/flow/<showId>.showflow.json` → 없으면 파일 선택창.
- **트랙 자동 생성 실패**: addTrack/add/addTracks/insertVideoTrackAt + QE fallback 시도. 그래도 막히면 수동으로 V/A 트랙 추가 후 계속 진행 또는 현존 트랙까지만 배치.
- **오디오 겹침 문제**: 브랜치 A만 오디오 유지, 나머지는 삽입 직후 링크된 오디오 삭제.
- **특수 그룹 슬롯 처리**: `groupADFH`, `groupBCEG`를 A,D,F,H / B,C,E,G 트랙에 복제 배치.

## 08_BuildFromMediaAndUpdateShowflow.jsx 실행 가이드
1. 시퀀스 활성화(60fps).
2. 스크립트 실행 → Show ID 입력(예: `TXTB`).
3. showflow JSON 자동 탐색 실패 시 파일 선택창에서 직접 선택.
4. 미디어 폴더 기본값: `P:/TXTB/FinalMovie/TheaterApp/MP4_Final/with_audio` (없으면 폴더 선택창).
5. 트랙 자동 추가 실패 시 알림에 따라 V/A 트랙을 수동 추가(또는 무시하면 기존 트랙까지만 배치).
6. 브랜치 A 외 오디오는 제거됨. 실제 미디어 길이로 showflow JSON의 `duration/in/out`을 업데이트 후 덮어씀.

## 예상 팝업 흐름 (디버그 표시 포함)
- `BuildFromMediaAndUpdateShowflow: start`
- `Show ID: <입력값>`
- `Loaded showflow JSON` (로드 성공 시)
- `Media folder: <경로>` (폴더 선택/확인 후)

## 빈번한 문제와 대안
- **자동 트랙 생성 불가**: 호스트가 막으면 수동으로 V/A 트랙 추가 후 OK. 추가하지 않으면 스크립트가 기존 트랙까지만 사용하므로 일부 브랜치가 생략됨.
- **JSON 파싱 오류**: JSON 파일이 유효한지 확인, `*.showflow.json` 확장자/인코딩(UTF-8) 확인.
- **미디어 매칭 실패**: 미디어 폴더 내 실제 파일명이 showflow의 `name`과 동일한 베이스명인지 확인(확장자는 달라도 됨).
- **오디오 겹침**: 설계상 브랜치 A만 오디오 유지, 나머지는 삽입 즉시 삭제. 필요 시 JSON의 브랜치 매핑을 조정.

## 향후 작업 시 체크리스트
- 프롬프트/알림이 전혀 안 뜨면: 스크립트가 실행되지 않은 것 → 올바른 파일 실행 여부, 액티브 시퀀스 여부 확인.
- 트랙 부족 경고 후에도 계속 실패하면: QE 옵션이 막힌 환경일 수 있으므로 무조건 수동으로 필요한 트랙 수 확보 후 재실행.
- showflow를 수정했다면: JSON이 덮어써지므로 필요 시 백업.

---

# 🚨 Premiere Pro 2025 ExtendScript 주요 이슈 (2025-11-20 발견)

## ❌ 절대 사용 금지

### 1. `confirm()` 함수 - "Not Enough Parameters" 오류 발생

```javascript
// ❌ 잘못된 사용 - 크래시!
var result = confirm("계속하시겠습니까?");
if (result) { /* ... */ }

// ✅ 올바른 방법 1: alert() + 자동 진행
alert("다음 단계를 자동으로 진행합니다.");
doSomething();

// ✅ 올바른 방법 2: prompt()로 입력 받기
var response = prompt("'yes' 입력하여 계속:", "no");
if (response === "yes") { doSomething(); }
```

### 2. `new` 키워드 생략 - "Not Enough Parameters" 오류

```javascript
// ❌ 잘못 - new 없이 생성자 호출
var folder = Folder("C:/Path");
var file = File("C:/Path/file.txt");

// ✅ 올바름 - new 키워드 필수
var folder = new Folder("C:/Path");
var file = new File("C:/Path/file.txt");
```

### 3. Window Type `"palette"` - 불안정

```javascript
// ❌ 불안정
var win = new Window("palette", "My Panel");

// ✅ 안정적
var win = new Window("dialog", "My Panel");
```

### 4. IIFE 패턴 - 실행 안 될 수 있음

```javascript
// ❌ 간헐적 실행 실패
(function() { /* 코드 */ })();

// ✅ 명시적 함수 호출
function main() { /* 코드 */ }
main();
```

### 5. `Object.keys()` - "is not a function" 오류

```javascript
// ❌ ES5 함수 - 작동 안 함!
var keys = Object.keys(myObject);
var count = Object.keys(myObject).length;

// ✅ ES3 호환 - for...in 루프 사용
var keys = [];
for (var k in myObject) {
    if (myObject.hasOwnProperty(k)) {
        keys.push(k);
    }
}

// ✅ 객체 속성 개수 세기
var count = 0;
for (var k in myObject) {
    if (myObject.hasOwnProperty(k)) {
        count++;
    }
}
```

**원인**: ExtendScript는 ES3 기반이므로 `Object.keys()`, `Object.values()`, `Array.forEach()` 등 ES5+ 함수 미지원

## ✅ 반드시 해야 할 것

### 1. 에러 핸들링

```javascript
try {
    var file = new File(path);
    if (!file.exists) {
        alert("파일 없음: " + path);
        return;
    }
} catch (e) {
    $.writeln("ERROR: " + e);
    alert("오류: " + e + "\nLine: " + (e.line || "?"));
}
```

### 2. 디버그 로깅

```javascript
$.writeln("=== 스크립트 시작 ===");
$.writeln("처리 중: " + filename);
$.writeln("완료");
```

### 3. 환경 검증

```javascript
if (!app.project || !app.project.activeSequence) {
    alert("프로젝트와 시퀀스를 여세요!");
    return;
}
```

---

## 🔧 자주 발생하는 오류

| 오류 메시지 | 원인 | 해결책 |
|------------|------|--------|
| "Not Enough Parameters" | `confirm()` 사용 | `alert()` 또는 `prompt()` 사용 |
| "Not Enough Parameters" | `new` 키워드 누락 | `new Folder()`, `new File()` |
| "Window does not have a constructor" | `"palette"` 타입 | `"dialog"` 타입 사용 |
| 스크립트 무반응 | IIFE 패턴 | 명시적 함수 호출 |

---

## 📋 실행 전 체크리스트

- [ ] `confirm()` 사용하지 않음
- [ ] 모든 `Folder()`, `File()`에 `new` 키워드 사용
- [ ] Window 타입이 `"dialog"`
- [ ] IIFE 패턴 미사용
- [ ] try/catch 에러 핸들링
- [ ] `$.writeln()` 로깅 추가
- [ ] `alert()`로 사용자 피드백

---

## 📝 안전한 스크립트 템플릿

```javascript
var SCRIPT_NAME = "MyScript";

function log(msg) {
    $.writeln("[" + SCRIPT_NAME + "] " + msg);
}

function main() {
    log("=== START ===");
    
    try {
        // 1. 환경 검증
        if (!app.project || !app.project.activeSequence) {
            alert("프로젝트와 시퀀스를 열어주세요!");
            return;
        }
        
        // 2. 사용자 입력 (confirm 금지!)
        var input = prompt("값 입력:", "default");
        if (!input) {
            alert("취소됨");
            return;
        }
        log("입력: " + input);
        
        // 3. 처리
        var result = doWork(input);
        
        // 4. 결과
        if (result.success) {
            alert("✓ 완료!\n\n" + result.message);
            log("SUCCESS");
        } else {
            alert("✗ 실패!\n\n" + result.error);
            log("ERROR: " + result.error);
        }
        
    } catch (e) {
        log("FATAL: " + e + " (Line " + (e.line || "?") + ")");
        alert("오류:\n" + e + "\n\nLine: " + (e.line || "unknown"));
    }
    
    log("=== END ===");
}

function doWork(input) {
    try {
        // 실제 작업
        return { success: true, message: "처리 완료" };
    } catch (e) {
        return { success: false, error: e.toString() };
    }
}

// 실행
log("스크립트 로드됨, main() 호출...");
main();
```

---

**마지막 업데이트**: 2025-11-20  
**Premiere Pro 버전**: 2025 (25.0.0)  
**ExtendScript 버전**: ES3 호환
