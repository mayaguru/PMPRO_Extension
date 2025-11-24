# Premiere Extension Handbook

이 문서는 AmazePanel 기반 Premiere Pro 확장(Extensions 패널)에서 **직접 경험하며 확인한 명령/흐름/주의점**만 정리한 헬프 문서입니다. 새로 투입된 개발자가 같은 시행착오 없이 따라 할 수 있도록 **버튼/스크립트 위치, 실행 순서, 전제조건, 실패 시 회피법**을 단계별로 적었습니다.

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

## 3) Showflow 연동 및 시퀀스 생성/동기화
- **07_BuildTestScene.jsx** (패널 버튼): 선택한 Showflow JSON을 읽어 슬롯/마커 구조를 가진 테스트 시퀀스 생성 → 구조 검증용.
- **08_BuildFromMediaAndUpdateShowflow.jsx**: 미디어를 참조해 시퀀스를 빌드하고, 사용한 클립 메타를 Showflow JSON에 기록.
- **09_UpdateShowflow*.jsx** (세 변형): 현재 시퀀스 → 마커/클립 정보를 스캔해 원본 Showflow JSON을 갱신.
- **cleanup_showflow.py**: JSON 정리/백업 유틸. `python cleanup_showflow.py flow/<file>.showflow.json` 식으로 수동 실행 가능.

## 4) 렌더링 워크플로 (버튼·전제·동작·주의)
- 공통: 프리셋/출력 폴더 설정 필수. AME 설치. EXR 등 무거운 시퀀스는 렌더 전에 Program Monitor를 수동으로 닫거나 다른 탭으로 전환(자동 토글 없음).

### A. 전체/인아웃 렌더 (10_RenderSelected.jsx)
- 버튼: 패널 “Render Selected”
- 전제: 활성 시퀀스가 열려 있어야 함.
- 동작: 활성 시퀀스 In/Out(기본) 또는 전체 범위 → `<시퀀스명>.<확장자>`로 AME 큐.

### B. 마커 단위 렌더 (11_Queue_Markers_To_AME.jsx)
- 버튼: 패널 “Queue Markers to AME”
- 전제: 마커 2개 이상.
- 동작: 마커 시간 정렬 → [마커 i, 마커 i+1) 구간으로 In/Out 설정 후 큐.
- 파일명: 마커 이름 있으면 사용, 없으면 `<시퀀스명>_번호`.

### C. 선택된 Showflow 클립 렌더 (12_RenderSelectedClips.jsx)
- 버튼: `showflow_viz.html` 타임라인 뷰 → 렌더할 클립 선택 → “Render Selected”
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
 - **로그**: ExtendScript 로그는 `$.writeln` 출력 확인. 패널 오류는 “EvalScript error”로만 뜰 수 있으므로 콘솔/로그 체크 필요.

---
**적용 범위**: 위 목록은 현재 저장소에 포함되어 있고 실제 동작 확인된 스크립트/기능만 정리했습니다. 새로 추가/실험 기능은 이 문서에 별도 섹션으로 명시 후 업데이트하세요.
