/**
 * Test: Video Track 추가 방법 테스트
 * Premiere Pro 2025 호환성 체크
 */

(function () {

    if (!app.project.activeSequence) {
        alert("활성 시퀀스가 없습니다. 시퀀스를 먼저 열어주세요.");
        return;
    }

    var seq = app.project.activeSequence;
    var log = [];

    log.push("현재 비디오 트랙 수: " + seq.videoTracks.numTracks);

    // 모든 가능한 메서드 테스트
    var methods = [
        "addTrack",
        "add",
        "insertVideoTrackAt",
        "addTracks"
    ];

    var success = false;
    var usedMethod = "";

    for (var i = 0; i < methods.length; i++) {
        var method = methods[i];
        log.push("\n테스트 중: seq.videoTracks." + method);

        try {
            if (method === "addTrack" && typeof seq.videoTracks.addTrack === "function") {
                seq.videoTracks.addTrack();
                usedMethod = "seq.videoTracks.addTrack()";
                success = true;
                break;
            }
            else if (method === "add" && typeof seq.videoTracks.add === "function") {
                seq.videoTracks.add();
                usedMethod = "seq.videoTracks.add()";
                success = true;
                break;
            }
            else if (method === "insertVideoTrackAt" && typeof seq.insertVideoTrackAt === "function") {
                seq.insertVideoTrackAt(seq.videoTracks.numTracks);
                usedMethod = "seq.insertVideoTrackAt(" + seq.videoTracks.numTracks + ")";
                success = true;
                break;
            }
            else if (method === "addTracks" && typeof seq.addTracks === "function") {
                seq.addTracks(1, 0); // 1 video, 0 audio
                usedMethod = "seq.addTracks(1, 0)";
                success = true;
                break;
            }
            else {
                log.push("  → 메서드 없음 또는 함수 아님");
            }
        } catch (e) {
            log.push("  → 오류: " + e.toString());
        }
    }

    log.push("\n=== 결과 ===");
    if (success) {
        log.push("✓ 성공!");
        log.push("사용된 메서드: " + usedMethod);
        log.push("새 트랙 수: " + seq.videoTracks.numTracks);
    } else {
        log.push("✗ 실패!");
        log.push("\n가능한 해결책:");
        log.push("1. 시퀀스에서 우클릭 → Add Tracks");
        log.push("2. Sequence 메뉴 → Add Tracks");
        log.push("3. 수동으로 V3, V4... 트랙 추가");
    }

    // API 검사
    log.push("\n=== API 정보 ===");
    log.push("seq.videoTracks.numTracks = " + seq.videoTracks.numTracks);
    log.push("typeof seq.videoTracks.addTrack = " + typeof seq.videoTracks.addTrack);
    log.push("typeof seq.videoTracks.add = " + typeof seq.videoTracks.add);
    log.push("typeof seq.insertVideoTrackAt = " + typeof seq.insertVideoTrackAt);
    log.push("typeof seq.addTracks = " + typeof seq.addTracks);

    alert(log.join("\n"));
    $.writeln(log.join("\n"));

})();
