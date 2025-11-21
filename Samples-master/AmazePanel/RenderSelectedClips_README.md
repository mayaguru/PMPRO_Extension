# Render Selected Clips 기능

## 개요
Showflow 에디터에서 선택한 카드(클립)들의 구간만 Premiere 시퀀스에 In/Out을 지정해 AME 렌더 큐에 보내는 기능

## 작동 방식

### 1. 파일 구조
- `12_RenderSelectedClips.jsx`: 선택된 클립들을 AME에 큐잉하는 ExtendScript
- `showflow_viz.html`: "Render Selected" 버튼과 UI 로직 포함

### 2. 사용 방법

#### 사전 설정 (index.html의 "Folder Setting" 탭에서)
1. **Render Preset**: AME 프리셋 파일(.epr) 선택
2. **Render Output**: 렌더 출력 폴더 선택

#### 렌더링 실행
1. Showflow 에디터에서 "Timeline View"로 전환
2. 렌더링할 클립들을 선택:
   - **단일 선택**: 클립 클릭
   - **다중 선택**: Ctrl/Cmd + 클릭으로 개별 추가
   - **범위 선택**: Shift + 클릭
3. "Render Selected" 버튼 클릭
4. AME가 실행되고 선택된 각 클립이 개별 렌더 작업으로 큐에 추가됨

### 3. 렌더 출력 파일명
각 렌더 파일은 다음 형식으로 저장됩니다:
```
<시퀀스명>_<클립명>.<확장자>
```

예시:
- `MySequence_ClipA.mp4`
- `MySequence_ClipB.mp4`

### 4. 기술 세부사항

#### In/Out 설정
- 각 클립의 시작 프레임(`time`)과 지속시간(`duration`)을 사용
- FPS는 활성 시퀀스에서 자동으로 가져옴
- 프레임 → 초 변환 후 시퀀스에 In/Out 포인트 설정

#### 오류 처리
- 프리셋/출력 폴더 미설정 시 경고
- 파일 시스템 오류 감지
- 개별 클립 큐잉 실패 시 오류 목록 표시

### 5. 관련 스크립트 비교

| 스크립트 | 용도 | 렌더 단위 |
|---------|------|----------|
| `10_RenderSelected.jsx` | 전체 시퀀스 렌더 (flow 마커 검증) | 1개 작업 |
| `11_Queue_Markers_To_AME.jsx` | 시퀀스 마커 기반 렌더 | 마커 구간마다 1개 |
| **`12_RenderSelectedClips.jsx`** | **선택된 클립만 렌더** | **선택된 클립마다 1개** |

## 문제 해결

### "No clips selected" 오류
- Showflow 에디터에서 최소 1개 이상의 클립을 선택해야 함
- 클립 선택 시 오렌지색 테두리가 표시됨

### "Render preset not set" 오류
- index.html의 "Folder Setting" 탭으로 이동
- "Pick preset (.epr)" 버튼으로 AME 프리셋 선택

### "Encoder not available" 오류
- Adobe Media Encoder가 설치되어 있는지 확인
- Premiere Pro를 재시작

### 렌더 작업이 큐에 추가되지 않음
- Premiere Pro에서 활성 시퀀스가 열려있는지 확인
- 클립의 duration이 0보다 큰지 확인
- ExtendScript 디버깅: `$.writeln()` 메시지 확인

## 개발 참고사항

### ExtendScript 함수 (`$._ext.renderSelectedClips`)
```javascript
Parameters:
  payloadStr: URL-encoded JSON string
    {
      clips: [{ name, time, duration, slotIndex, track }],
      presetPath: string,
      outputFolder: string
    }

Returns: 
  Success: "Successfully queued N clip(s)"
  Error: "ERR: <error message>"
```

### JavaScript 클립 선택 구조
```javascript
selectedClips = {
  "0__A": true,  // slotIndex 0, track A
  "1__B": true,  // slotIndex 1, track B
}
```

### 개선 가능 사항
- [ ] 렌더 진행 상태 표시
- [ ] 큐에 추가되기 전 미리보기
- [ ] 파일명 템플릿 커스터마이징
- [ ] 배치 렌더 옵션 (동시에 대기열에 추가 vs 순차)
