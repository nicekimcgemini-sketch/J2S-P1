package com.j2s.attendance.service;

import com.j2s.attendance.dto.AttendanceFlag;
import com.j2s.attendance.entity.AttendanceType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.Set;

/**
 * 근무시간 규칙 (app.work-hours.*).
 * - 지각/조퇴/야근: 분 단위로 비교한다 — 출근 기준이 09:00 이면 09:00:59 까지는 정상 출근.
 * - 주말(토·일)과 등록된 휴일은 근무일이 아니므로 판정하지 않는다.
 * - 휴게시간: 출근~퇴근 구간이 휴게 구간(기본 12:00~13:00)과 겹치는 만큼만 근무시간에서 뺀다.
 */
@Component
public class WorkHourPolicy {

    private final LocalTime startTime;
    private final LocalTime endTime;
    private final LocalTime overtimeAfter;
    private final LocalTime breakStart;
    private final LocalTime breakEnd;

    public WorkHourPolicy(@Value("${app.work-hours.start-time:09:00}") String startTime,
                          @Value("${app.work-hours.end-time:18:00}") String endTime,
                          @Value("${app.work-hours.overtime-after:19:00}") String overtimeAfter,
                          @Value("${app.work-hours.break-start:12:00}") String breakStart,
                          @Value("${app.work-hours.break-end:13:00}") String breakEnd) {
        this.startTime = LocalTime.parse(startTime);
        this.endTime = LocalTime.parse(endTime);
        this.overtimeAfter = LocalTime.parse(overtimeAfter);
        this.breakStart = LocalTime.parse(breakStart);
        this.breakEnd = LocalTime.parse(breakEnd);
    }

    public boolean isWorkday(LocalDate date, Set<LocalDate> holidays) {
        DayOfWeek day = date.getDayOfWeek();
        return day != DayOfWeek.SATURDAY && day != DayOfWeek.SUNDAY && !holidays.contains(date);
    }

    /** 특이사항이 없거나 근무일이 아니면 null */
    public AttendanceFlag classify(AttendanceType type, LocalDateTime checkedAt, Set<LocalDate> holidays) {
        if (!isWorkday(checkedAt.toLocalDate(), holidays)) {
            return null;
        }
        LocalTime time = checkedAt.toLocalTime().truncatedTo(ChronoUnit.MINUTES);

        if (type == AttendanceType.CHECK_IN) {
            return time.isAfter(startTime) ? AttendanceFlag.LATE : null;
        }
        if (time.isBefore(endTime)) {
            return AttendanceFlag.EARLY_LEAVE;
        }
        return time.isBefore(overtimeAfter) ? null : AttendanceFlag.OVERTIME;
    }

    /** 출근~퇴근 구간과 출근일의 휴게 구간이 겹치는 분 */
    public long breakMinutes(LocalDateTime checkIn, LocalDateTime checkOut) {
        LocalDateTime windowStart = checkIn.toLocalDate().atTime(breakStart);
        LocalDateTime windowEnd = checkIn.toLocalDate().atTime(breakEnd);
        LocalDateTime from = checkIn.isAfter(windowStart) ? checkIn : windowStart;
        LocalDateTime to = checkOut.isBefore(windowEnd) ? checkOut : windowEnd;
        return to.isAfter(from) ? Duration.between(from, to).toMinutes() : 0;
    }
}
