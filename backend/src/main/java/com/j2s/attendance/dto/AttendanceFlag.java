package com.j2s.attendance.dto;

/**
 * 근무시간 기준으로 판정한 출퇴근 기록의 특이사항 (DB 에 저장하지 않고 조회 시 계산한다).
 */
public enum AttendanceFlag {
    LATE,         // 지각: 출근 시각이 출근 기준 이후
    EARLY_LEAVE,  // 조퇴: 퇴근 시각이 퇴근 기준 이전
    OVERTIME      // 야근: 퇴근 시각이 야근 기준 이후
}
