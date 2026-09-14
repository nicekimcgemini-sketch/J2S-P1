package com.j2s.attendance.dto;

/**
 * 작업자 1명의 하루 근태 상태. 한 날에 여러 개가 붙을 수 있다 (예: LATE + EARLY_LEAVE).
 */
public enum DailyStatus {
    NORMAL,             // 정상: 평일 출퇴근 모두 있고 지각/조퇴/야근 없음
    LATE,               // 지각
    EARLY_LEAVE,        // 조퇴
    OVERTIME,           // 야근
    ABSENT,             // 결근: 지난 평일인데 출퇴근 기록이 하나도 없음
    MISSING_CHECK_IN,   // 출근 누락: 퇴근 기록만 있음
    MISSING_CHECK_OUT,  // 퇴근 누락: 지난 날인데 출근 기록만 있음
    WORKING,            // 근무 중: 오늘 출근했고 아직 퇴근 기록 없음
    NOT_YET,            // 미출근: 오늘(평일) 아직 기록 없음
    WEEKEND_WORK,       // 주말 특근: 토·일 기록 (지각/조퇴 판정 안 함)
    HOLIDAY_WORK        // 휴일 근무: 등록된 휴일(평일)에 기록 있음 (지각/조퇴 판정 안 함)
}
