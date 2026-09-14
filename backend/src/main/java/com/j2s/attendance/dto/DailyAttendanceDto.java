package com.j2s.attendance.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 일별 근태 요약 한 행 (작업자 × 날짜).
 * workMinutes 는 출근~퇴근 사이 분에서 휴게 구간과 겹친 breakMinutes 를 뺀 값. 출퇴근 중 하나라도 없으면 둘 다 null.
 * holidayName 은 그날이 등록된 휴일이면 그 이름, 아니면 null.
 */
public record DailyAttendanceDto(
        LocalDate date,
        String workerName,
        String employeeNo,
        LocalDateTime checkInAt,
        LocalDateTime checkOutAt,
        Long workMinutes,
        Long breakMinutes,
        String holidayName,
        List<DailyStatus> statuses
) {
}
