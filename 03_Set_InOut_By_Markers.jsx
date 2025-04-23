(function () {
    try {
        // 현재 활성화된 시퀀스 가져오기
        var seq = app.project.activeSequence;
        if (!seq) {
            $.writeln("❌ 시퀀스를 선택해주세요.");
            return;
        }

        // 현재 재생헤드(CTI) 위치 가져오기
        var currentTime = seq.getPlayerPosition().ticks;

        // 메인 시퀀스의 마커만 수집
        var markers = seq.markers;
        if (!markers || markers.numMarkers === 0) {
            $.writeln("❌ 메인 시퀀스에 마커가 없습니다.");
            return;
        }

        // 메인 시퀀스의 마커 시간만 배열로 수집
        var markerTimes = [];
        var currentMarker = markers.getFirstMarker();
        while (currentMarker) {
            // 메인 시퀀스의 마커만 추가
            markerTimes.push(Number(currentMarker.start.ticks));
            currentMarker = markers.getNextMarker(currentMarker);
        }
        
        // 시간순 정렬
        markerTimes.sort(function (a, b) { return a - b; });

        // 현재 시간 기준으로 앞뒤 마커 찾기
        var prevMarker = null;
        var nextMarker = null;

        for (var i = 0; i < markerTimes.length; i++) {
            if (markerTimes[i] <= currentTime) {
                prevMarker = markerTimes[i];
            } else {
                nextMarker = markerTimes[i];
                break;
            }
        }

        // 마커가 충분하지 않은 경우 처리
        if (prevMarker === null) {
            $.writeln("❌ 현재 위치 이전의 마커가 없습니다.");
            return;
        }
        if (nextMarker === null) {
            $.writeln("❌ 현재 위치 이후의 마커가 없습니다.");
            return;
        }

        // In/Out 포인트 설정
        seq.setInPoint(prevMarker.toString());
        seq.setOutPoint((nextMarker - 1).toString());

        $.writeln("✅ In/Out 포인트 설정 완료");
        $.writeln("In: " + seq.getInPoint().ticks);
        $.writeln("Out: " + seq.getOutPoint().ticks);

    } catch (e) {
        $.writeln("🔥 오류 발생: " + e.toString());
    }
})(); 