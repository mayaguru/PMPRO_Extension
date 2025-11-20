/**
 * Logger 테스트 스크립트
 * 바탕화면에 로그 파일을 생성합니다
 * 
 * 주의: VSCode에서 lint 오류가 보이지만 ExtendScript에서는 정상 작동합니다
 */

//@include "Logger.jsxinc"

(function () {

    // 로거 초기화
    var logger = new FileLogger("LoggerTest");

    logger.log("스크립트 시작");
    logger.info("Premiere Pro 버전: " + app.version);

    // 프로젝트 정보
    if (app.project) {
        logger.log("프로젝트 이름: " + (app.project.name || "Untitled"));
        logger.log("프로젝트 경로: " + (app.project.path || "Not saved"));
    } else {
        logger.warn("프로젝트가 열려있지 않습니다");
    }

    // 시퀀스 정보
    if (app.project && app.project.activeSequence) {
        var seq = app.project.activeSequence;
        logger.success("활성 시퀀스: " + seq.name);
        logger.log("비디오 트랙 수: " + seq.videoTracks.numTracks);
        logger.log("오디오 트랙 수: " + seq.audioTracks.numTracks);
        logger.log("프레임레이트: " + seq.framerate);

        // 각 비디오 트랙의 클립 수
        for (var i = 0; i < seq.videoTracks.numTracks; i++) {
            var track = seq.videoTracks[i];
            logger.log("  V" + (i + 1) + ": " + track.clips.numItems + " clips");
        }
    } else {
        logger.warn("활성 시퀀스가 없습니다");
    }

    // 의도적인 에러 테스트
    try {
        logger.log("에러 테스트 시작...");
        throw new Error("테스트 에러입니다!");
    } catch (e) {
        logger.error("에러 발생: " + e.toString());
        logger.error("Line: " + (e.line || "unknown"));
    }

    logger.success("모든 테스트 완료!");
    logger.log("=== 스크립트 종료 ===");

    // 로그 저장 및 파일 열기
    var logPath = logger.saveAndShow();

    if (!logPath) {
        // 파일 저장 실패시 alert로 표시
        alert("로그:\n\n" + logger.getLog());
    }

})();
