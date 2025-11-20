// 09_UpdateShowflowFromTimeline - 최소 버전으로 재시작
alert("스크립트 시작됨");

// 다음 단계: 전체 마커 순회
alert("전체 마커 순회 시작");

var markerCount = 0;
var marker = markers.getFirstMarker();
alert("첫 마커: " + (marker ? "있음" : "없음"));

while (marker && markerCount < 50) { // 최대 50개로 제한
    markerCount++;
    alert("마커 " + markerCount + " 처리 중");
    marker = markers.getNextMarker(marker);
}

alert("순회 완료: " + markerCount + "개 마커 확인");

// 다음 단계: JSON 파일 선택
alert("JSON 파일 선택 단계 시작");

// File.openDialog 대신 더 간단한 방법 시도
alert("파일 선택 다이얼로그 준비");

var jsonFile = null;
alert("jsonFile 변수 초기화됨");

// 파일 선택 시도
try {
    alert("File.openDialog 호출 시도");
    jsonFile = File.openDialog("Select showflow JSON file", "JSON:*.json");
    alert("File.openDialog 호출 완료");

    if (jsonFile) {
        alert("파일 선택됨: " + jsonFile.fsName);
    } else {
        alert("파일 선택 취소됨");
        return;
    }
} catch (e) {
    alert("파일 선택 실패: " + e);
    return;
}

alert("JSON 파일 선택 완료");

// 다음 단계: JSON 파일 읽기
if (jsonFile) {
    alert("JSON 파일 읽기 시작");

    try {
        jsonFile.encoding = "UTF-8";
        if (jsonFile.open("r")) {
            var jsonText = jsonFile.read();
            jsonFile.close();

            alert("JSON 파일 읽기 성공\n크기: " + jsonText.length + " 문자");

            // 다음 단계: JSON 파싱
            alert("JSON 파싱 시작");

            var jsonData = null;
            try {
                if (typeof JSON !== "undefined" && JSON.parse) {
                    jsonData = JSON.parse(jsonText);
                    alert("JSON 파싱 성공");
                } else {
                    alert("JSON.parse를 사용할 수 없음");
                }
            } catch (parseError) {
                alert("JSON 파싱 실패: " + parseError);
            }

        } else {
            alert("JSON 파일 열기 실패");
        }
    } catch (readError) {
        alert("JSON 파일 읽기 에러: " + readError);
    }
}

// JSON 파싱 성공 이후부터 다시 시작
alert("JSON 파싱 완료 - 다음 단계 체크");

if (!jsonData) {
    alert("jsonData가 없습니다");
    return;
}

alert("jsonData 확인됨 - 타입: " + typeof jsonData);

try {
    var tracksProp = jsonData.tracks;
    alert("jsonData.tracks 접근: " + (tracksProp ? "성공" : "실패"));
} catch (e) {
    alert("jsonData.tracks 접근 에러: " + e);
    return;
}

alert("JSON 파싱 성공 확인됨 - 다음 단계 시작");

// 다음 단계: 마커 데이터를 슬롯으로 변환
if (jsonData && jsonData.slots) {
    alert("마커 데이터를 슬롯으로 변환 시작");

    // 마커 리스트 생성
    var markerList = [];
    var marker = markers.getFirstMarker();
    while (marker) {
        // 프레임으로 변환 (간단하게 30fps 가정)
        var frameTime = Math.round(marker.start.seconds * 30);
        markerList.push({
            time: frameTime,
            name: marker.name || ""
        });
        marker = markers.getNextMarker(marker);
    }

    alert("마커 변환 완료: " + markerList.length + "개");

    // 슬롯 생성
    alert("슬롯 생성 시작");

    var newSlots = [];
    alert("newSlots 배열 생성");

    for (var i = 0; i < markerList.length; i++) {
        alert("슬롯 " + i + " 생성 중");

        var slotStart = markerList[i].time;
        var slotEnd = (i < markerList.length - 1) ? markerList[i + 1].time - 1 : slotStart + 600; // 기본 600프레임

        alert("슬롯 " + i + ": start=" + slotStart + ", end=" + slotEnd);

        var slot = {
            time: slotStart,
            duration: slotEnd - slotStart + 1,
            clips: {}
        };

        newSlots.push(slot);
        alert("슬롯 " + i + " 추가 완료");
    }

    alert("슬롯 생성 완료: " + newSlots.length + "개");

    // 다음 단계: 클립 정보 추가 (단계별 테스트)
    alert("클립 정보 분석 시작 - 단계 1");

    var tracksMap = jsonData.tracks || { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7 };
    alert("tracksMap 확인: " + Object.keys(tracksMap).length + "개 트랙");

    var reverseTracks = {};
    for (var key in tracksMap) {
        if (tracksMap.hasOwnProperty(key)) {
            reverseTracks[tracksMap[key]] = key;
        }
    }
    alert("reverseTracks 생성 완료");

    // 비디오 트랙 기본 확인
    var videoTracks = seq.videoTracks;
    alert("videoTracks 접근: " + (videoTracks ? "성공" : "실패"));

    var trackCount = videoTracks.numTracks;
    alert("트랙 개수: " + trackCount);

    // 첫 번째 슬롯만 테스트
    if (newSlots.length > 0) {
        alert("첫 번째 슬롯 분석 시작");

        var slot = newSlots[0];
        alert("슬롯 시간: " + slot.time + ", 지속시간: " + slot.duration);

        // 첫 번째 트랙만 테스트
        if (trackCount > 0) {
            var track = videoTracks[0];
            alert("첫 번째 트랙 접근: " + (track ? "성공" : "실패"));

            if (track && track.clips) {
                var clipCount = track.clips.numItems;
                alert("클립 개수: " + clipCount);

                if (clipCount > 0) {
                    var firstClip = track.clips[0];
                    alert("첫 번째 클립: " + (firstClip ? firstClip.name || "이름없음" : "접근실패"));
                }
            }
        }
    }

    alert("기본 클립 분석 완료");

    // 다음 단계: JSON 업데이트 및 저장
    alert("JSON 업데이트 및 저장 시작");

    var updatedData = {};
    for (var k in jsonData) {
        if (jsonData.hasOwnProperty(k) && k !== "slots") {
            updatedData[k] = jsonData[k];
        }
    }
    updatedData.slots = newSlots;

    // JSON 문자열로 변환
    var updatedJson = "";
    try {
        if (typeof JSON !== "undefined" && JSON.stringify) {
            updatedJson = JSON.stringify(updatedData, null, 2);
        } else {
            // 간단한 stringify 구현
            updatedJson = "{";
            for (var key in updatedData) {
                if (updatedData.hasOwnProperty(key)) {
                    updatedJson += '"' + key + '":';
                    if (typeof updatedData[key] === "object") {
                        updatedJson += "[슬롯데이터]";
                    } else {
                        updatedJson += '"' + updatedData[key] + '"';
                    }
                    updatedJson += ",";
                }
            }
            updatedJson = updatedJson.slice(0, -1) + "}";
        }
    } catch (e) {
        alert("JSON 변환 실패: " + e);
        return;
    }

    // 파일에 저장
    try {
        var outFile = new File(jsonFile.fsName);
        outFile.encoding = "UTF-8";
        if (outFile.open("w")) {
            outFile.write(updatedJson);
            outFile.close();
            alert("✓ 성공! JSON 파일 업데이트 완료\n\n" + outFile.fsName);
        } else {
            alert("파일 쓰기 실패");
        }
    } catch (e) {
        alert("파일 저장 에러: " + e);
    }
}
