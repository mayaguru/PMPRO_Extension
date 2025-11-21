(function () {
    try {
        var seq = app.project.activeSequence;
        if (!seq) {
            $.writeln("❌ 시퀀스를 선택해주세요.");
            return;
        }

        var markers = seq.markers;
        if (!markers || markers.numMarkers === 0) {
            $.writeln("❌ 시퀀스에 마커가 없습니다.");
            return;
        }

        // 마커 정렬 및 In/Out 설정
        var markerTimes = [];
        var currentMarker = markers.getFirstMarker();
        while (currentMarker) {
            markerTimes.push(Number(currentMarker.start.ticks));
            currentMarker = markers.getNextMarker(currentMarker);
        }
        markerTimes.sort(function (a, b) { return a - b; });

        var currentTime = seq.getPlayerPosition().ticks;
        var inTicks = null, outTicks = null;
        for (var i = 0; i < markerTimes.length; i++) {
            if (markerTimes[i] <= currentTime) {
                inTicks = markerTimes[i];
            } else {
                outTicks = markerTimes[i];
                break;
            }
        }

        if (!inTicks || !outTicks) {
            $.writeln("⚠️ 인접한 마커를 찾을 수 없습니다.");
            return;
        }

        seq.setInPoint(inTicks.toString());
        seq.setOutPoint((outTicks - 1).toString());
        $.writeln("✅ In/Out 설정 완료");

        // === 클립 유지 조건 함수 ===
        function shouldKeepClip(clip, inTicks, outTicks) {
            var clipStart = clip.start.ticks;
            var clipEnd = clip.end.ticks;

            var fps = 1 / app.project.activeSequence.getSettings().videoFrameRate.seconds;
            var margin = Math.round(1 * 254016000000 / fps); // 1프레임 마진

            if ((clipEnd > (inTicks - margin)) && (clipStart < (outTicks + margin))) {
                return true;
            }

            return false;
        }

        // === 클립 정리 ===
        var videoTracks = seq.videoTracks;
        var audioTracks = seq.audioTracks;

        function cleanTrack(track) {
            for (var i = track.clips.numItems - 1; i >= 0; i--) {
                var clip = track.clips[i];
                if (!shouldKeepClip(clip, inTicks, outTicks)) {
                    clip.remove(0, 1);
                }
            }
        }

        for (var i = 0; i < videoTracks.numTracks; i++) cleanTrack(videoTracks[i]);
        for (var i = 0; i < audioTracks.numTracks; i++) cleanTrack(audioTracks[i]);

        $.writeln("✂️ 인아웃 외 클립 정리 완료");

        // === 시퀀스 이름 변경 UI ===
        var currentName = seq.name;
        var newName = prompt("새 시퀀스 이름을 입력하세요:", currentName);
        if (newName && newName !== currentName) {
            seq.name = newName;
            $.writeln("✅ 시퀀스 이름 변경 완료: " + newName);
        } else {
            $.writeln("ℹ️ 시퀀스 이름 변경 취소 또는 동일 이름 유지");
        }

    } catch (e) {
        $.writeln("🔥 오류 발생: " + e.toString());
    }
})();
