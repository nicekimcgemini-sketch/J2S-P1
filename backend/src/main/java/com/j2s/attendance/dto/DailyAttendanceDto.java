package com.j2s.attendance.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 일별 근태 요약 한 행 (작업자 × 날짜).
 * workMinutes 는 출근~퇴근 사이 분(휴게시간 미차감), 둘 중 하나라도 없으면 null.
 */
public record DailyAttendanceDto(
        LocalDate date,
        String workerName,
        String employeeNo,
        LocalDateTime checkInAt,
        LocalDateTime checkOutAt,
        Long workMinutes,
        List<DailyStatus> statuses
) {
}
