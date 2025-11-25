# AmazePanel 설치 가이드

## 다른 PC에 설치하는 방법

### 1. Premiere Pro CEP 패널 설치

#### Windows:
1. **전체 프로젝트 폴더 복사**
   - 현재 `AmazePanel` 폴더 전체를 복사합니다
   - 설치 경로: `C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\AmazePanel`
   - 또는 사용자별 경로: `C:\Users\[사용자명]\AppData\Roaming\Adobe\CEP\extensions\AmazePanel`

2. **관리자 권한 필요**
   - `C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\` 폴더에 복사하려면 관리자 권한이 필요합니다
   - 폴더를 우클릭 → "속성" → "보안" 탭에서 권한 확인

#### macOS:
1. **전체 프로젝트 폴더 복사**
   - 설치 경로: `/Library/Application Support/Adobe/CEP/extensions/AmazePanel`
   - **주의**: 루트 `/Library`입니다 (사용자 `~/Library`가 아님)

2. **터미널에서 복사 (관리자 권한 필요)**
   ```bash
   sudo cp -R /path/to/AmazePanel /Library/Application\ Support/Adobe/CEP/extensions/
   ```

### 2. 서명되지 않은 패널 허용 설정

#### Windows:
레지스트리 편집기에서 다음 키를 생성합니다:

**경로**: `HKEY_CURRENT_USER\Software\Adobe\CSXS.12`

**키 이름**: `PlayerDebugMode`  
**타입**: `String` (REG_SZ)  
**값**: `1`

또는 PowerShell에서 실행:
```powershell
New-Item -Path "HKCU:\Software\Adobe\CSXS.12" -Force
Set-ItemProperty -Path "HKCU:\Software\Adobe\CSXS.12" -Name "PlayerDebugMode" -Value "1" -Type String
```

#### macOS:
터미널에서 실행:
```bash
defaults write ~/Library/Preferences/com.adobe.CSXS.12.plist PlayerDebugMode 1
```

### 3. Python 서버 설치 및 설정

#### 필수 요구사항:
- Python 3.8 이상
- pip 또는 uv 패키지 매니저

#### 설치 방법:

**방법 1: uv 사용 (권장)**
```bash
cd python_server
uv sync
uv run python vr_server.py
```

**방법 2: pip 사용**
```bash
cd python_server
pip install -r requirements.txt
python vr_server.py
```

#### 필요한 Python 패키지:
- flask
- mss (화면 캡처)
- PIL (Pillow, 이미지 처리)

### 4. Premiere Pro에서 패널 로드

1. Premiere Pro를 완전히 종료합니다
2. Premiere Pro를 다시 실행합니다
3. 메뉴에서 `Window` → `Extensions` → `AmazePanel` 선택
4. 패널이 열리면 설치 완료입니다

### 5. 확인 사항

#### 패널이 보이지 않는 경우:
1. **경로 확인**: 확장 폴더 경로가 정확한지 확인
2. **서명 설정 확인**: PlayerDebugMode가 1로 설정되어 있는지 확인
3. **Premiere Pro 재시작**: 설정 변경 후 반드시 재시작
4. **CEP 로그 확인**:
   - Windows: `%AppData%\Local\Temp\csxs12-PPRO.log`
   - macOS: `/Library/Logs/CSXS/csxs12-PPRO.log`

#### Python 서버가 실행되지 않는 경우:
1. Python 버전 확인: `python --version` (3.8 이상 필요)
2. 패키지 설치 확인: `pip list` 또는 `uv pip list`
3. 포트 충돌 확인: 5000번 포트가 사용 중인지 확인
4. 방화벽 설정: 로컬 네트워크에서 접근 가능하도록 설정

### 6. 파일 구조 확인

설치 후 다음 파일들이 있어야 합니다:

```
AmazePanel/
├── CSXS/
│   └── manifest.xml          (필수)
├── index.html                (필수)
├── PProPanel.jsx             (필수)
├── ext.js                    (필수)
├── python_server/
│   ├── vr_server.py          (VR 기능용)
│   ├── requirements.txt      (Python 의존성)
│   └── templates/
│       └── vr_client.html
└── ... (기타 파일들)
```

### 7. 네트워크 설정 (VR 기능 사용 시)

VR 스트리밍 기능을 사용하려면:
1. Python 서버가 실행 중이어야 합니다
2. 패널의 "Server URL"에 `http://localhost:5000` 입력
3. 다른 기기(Quest 등)에서 접근하려면 PC의 로컬 IP 주소 사용
   - 예: `http://192.168.1.100:5000`

### 8. 문제 해결

#### 패널이 로드되지 않음:
- CEP 확장 폴더 경로 확인
- PlayerDebugMode 레지스트리/plist 설정 확인
- Premiere Pro 버전 확인 (Premiere Pro 2023 이상 권장)

#### Python 서버 오류:
- Python 버전 확인
- 필요한 패키지 설치 확인
- 포트 5000번 사용 가능 여부 확인

#### VR 기능이 작동하지 않음:
- Python 서버 실행 상태 확인
- 방화벽 설정 확인
- 네트워크 연결 확인

### 9. 빠른 설치 체크리스트

- [ ] AmazePanel 폴더를 CEP extensions 폴더에 복사
- [ ] PlayerDebugMode 레지스트리/plist 설정
- [ ] Python 3.8+ 설치 확인
- [ ] Python 패키지 설치 (requirements.txt)
- [ ] Premiere Pro 재시작
- [ ] 패널 메뉴에서 AmazePanel 선택
- [ ] Python 서버 실행 (VR 기능 사용 시)

### 참고 사항

- **관리자 권한**: Windows에서 Program Files에 설치하려면 관리자 권한이 필요합니다
- **사용자별 설치**: 각 사용자별로 설치하려면 AppData 경로 사용
- **버전 호환성**: Premiere Pro 2023 이상에서 테스트됨
- **Python 서버**: VR 기능만 사용한다면 선택 사항입니다




