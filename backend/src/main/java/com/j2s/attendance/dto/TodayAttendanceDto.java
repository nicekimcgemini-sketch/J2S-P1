package com.j2s.attendance.dto;

import java.time.LocalDateTime;

/**
 * 당일 출근/퇴근 시각 (모바일 체크인 화면 표시용).
 * checkInAt/checkOutAt 은 기록이 없으면 null.
 */
public record TodayAttendanceDto(boolean checkedIn, LocalDateTime checkInAt, LocalDateTime checkOutAt) {
}
