(function () {
    try {
        // 현재 활성화된 시퀀스 가져오기
        var seq = app.project.activeSequence;
        if (!seq) {
            alert("❌ 시퀀스를 선택해주세요.");
            return;
        }

        // 시퀀스의 설정 가져오기 및 유효성 검사
        var fps = 1 / seq.getSettings().videoFrameRate.seconds;
        var timebase = seq.timebase;

        // fps와 timebase 값 로깅
        $.writeln("=== 시퀀스 설정 ===");
        $.writeln("FPS: " + fps);
        $.writeln("Timebase: " + timebase);

        // fps 유효성 검사
        if (!fps || isNaN(fps) || fps <= 0) {
            throw new Error("⚠️ 시퀀스의 FPS가 유효하지 않습니다: " + fps);
        }

        // timebase 유효성 검사
        if (!timebase || isNaN(timebase) || timebase <= 0) {
            throw new Error("⚠️ 시퀀스의 timebase가 유효하지 않습니다: " + timebase);
        }

        // 숫자를 2자리로 패딩하는 함수
        function pad(number) {
            return number < 10 ? '0' + number : number.toString();
        }

        // ticks를 프레임으로 변환하는 함수
        function ticksToFrames(ticks) {
            if (!ticks || isNaN(ticks)) {
                $.writeln("⚠️ 유효하지 않은 ticks 값: " + ticks);
                return 0;
            }

            if (!timebase || timebase <= 0) {
                $.writeln("⚠️ 유효하지 않은 timebase 값: " + timebase);
                return 0;
            }

            var frames = Math.round(Number(ticks) / timebase);
            $.writeln("Ticks to Frames 변환: " + ticks + " ticks -> " + frames + " frames");
            return frames >= 0 ? frames : 0;
        }

        // 프레임을 타임코드로 변환하는 함수
        function formatTimeCode(frames) {
            if (!frames || isNaN(frames)) {
                $.writeln("⚠️ 유효하지 않은 프레임 값: " + frames);
                return "00:00:00:00";
            }

            if (!fps || fps <= 0) {
                $.writeln("⚠️ 유효하지 않은 FPS 값: " + fps);
                return "00:00:00:00";
            }

            var totalSeconds = Math.floor(frames / fps);
            var remainingFrames = Math.floor(frames % fps);
            
            var hours = Math.floor(totalSeconds / 3600);
            var minutes = Math.floor((totalSeconds % 3600) / 60);
            var seconds = totalSeconds % 60;

            var timeCode = pad(hours) + ':' + pad(minutes) + ':' + pad(seconds) + ':' + pad(remainingFrames);
            $.writeln("프레임 -> 타임코드 변환: " + frames + " frames -> " + timeCode);
            return timeCode;
        }

        // 현재 재생헤드(CTI) 위치 가져오기
        var playerPosition = seq.getPlayerPosition();
        if (!playerPosition || !playerPosition.ticks) {
            throw new Error("⚠️ 현재 재생 위치를 가져올 수 없습니다.");
        }
        var currentFrames = ticksToFrames(playerPosition.ticks);

        // 메인 시퀀스의 마커 수집
        var markers = seq.markers;
        if (!markers || markers.numMarkers === 0) {
            alert("❌ 메인 시퀀스에 마커가 없습니다.");
            return;
        }

        // 마커 시간 배열 생성 및 정렬
        var markerTimes = [];
        var currentMarker = markers.getFirstMarker();
        while (currentMarker) {
            if (!currentMarker.start || !currentMarker.start.ticks) {
                $.writeln("⚠️ 마커의 시간 정보가 유효하지 않습니다: " + currentMarker.name);
                continue;
            }

            var markerFrames = ticksToFrames(currentMarker.start.ticks);
            markerTimes.push({
                frames: markerFrames,
                name: currentMarker.name || "마커",
                timeCode: formatTimeCode(markerFrames)
            });
            currentMarker = markers.getNextMarker(currentMarker);
        }
        markerTimes.sort(function (a, b) { return a.frames - b.frames; });

        // 현재 시간 기준으로 앞뒤 마커 찾기
        var prevMarker = null;
        var nextMarker = null;

        for (var i = 0; i < markerTimes.length; i++) {
            if (markerTimes[i].frames <= currentFrames) {
                prevMarker = markerTimes[i];
            } else {
                nextMarker = markerTimes[i];
                break;
            }
        }

        var resultText = "";

        // 마커 간격 계산
        if (prevMarker && nextMarker) {
            var durationFrames = nextMarker.frames - prevMarker.frames;

            resultText += "📊 마커 간격 정보\n";
            resultText += "시작 마커: " + prevMarker.name + " (" + prevMarker.timeCode + ")\n";
            resultText += "종료 마커: " + nextMarker.name + " (" + nextMarker.timeCode + ")\n";
            resultText += "간격: " + durationFrames + " 프레임 (" + formatTimeCode(durationFrames) + ")\n";
        } else {
            resultText += "❌ 현재 위치의 앞뒤 마커를 찾을 수 없습니다.\n";
        }

        // In/Out 포인트가 설정되어 있는 경우 해당 구간 계산
        var inPoint = seq.getInPoint();
        var outPoint = seq.getOutPoint();
        
        if (inPoint && outPoint && inPoint.ticks && outPoint.ticks) {
            var inFrames = ticksToFrames(inPoint.ticks);
            var outFrames = ticksToFrames(outPoint.ticks);
            var selectionDurationFrames = outFrames - inFrames;

            // In/Out 구간 내 마커 찾기
            var markersInSelection = markerTimes.filter(function(marker) {
                return marker.frames >= inFrames && marker.frames <= outFrames;
            });

            resultText += "\n📊 In/Out 구간 정보\n";
            resultText += "In 포인트: " + formatTimeCode(inFrames) + "\n";
            resultText += "Out 포인트: " + formatTimeCode(outFrames) + "\n";
            resultText += "구간 길이: " + selectionDurationFrames + " 프레임 (" + formatTimeCode(selectionDurationFrames) + ")\n";
            
            if (markersInSelection.length > 0) {
                resultText += "구간 내 마커 수: " + markersInSelection.length + "\n";
                markersInSelection.forEach(function(marker) {
                    var framesFromStart = marker.frames - inFrames;
                    resultText += "  - " + marker.name + ": " + framesFromStart + " 프레임 (" + formatTimeCode(framesFromStart) + ")\n";
                });
            }
        }

        alert(resultText);

    } catch (e) {
        alert("🔥 오류 발생:\n" + e.toString() + "\n\n디버그 정보:\nFPS: " + fps + "\nTimebase: " + timebase);
    }
})(); 