package com.j2s.attendance.service;

import com.j2s.attendance.dto.AttendanceFlag;
import com.j2s.attendance.entity.AttendanceType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;

/**
 * 지각/조퇴/야근 판정 기준 (app.work-hours.*).
 * 분 단위로 비교한다 — 출근 기준이 09:00 이면 09:00:59 까지는 정상 출근.
 * 주말(토·일) 기록은 특근으로 보고 판정하지 않는다. 공휴일은 구분하지 않는다.
 */
@Component
public class WorkHourPolicy {

    private final LocalTime startTime;
    private final LocalTime endTime;
    private final LocalTime overtimeAfter;

    public WorkHourPolicy(@Value("${app.work-hours.start-time:09:00}") String startTime,
                          @Value("${app.work-hours.end-time:18:00}") String endTime,
                          @Value("${app.work-hours.overtime-after:19:00}") String overtimeAfter) {
        this.startTime = LocalTime.parse(startTime);
        this.endTime = LocalTime.parse(endTime);
        this.overtimeAfter = LocalTime.parse(overtimeAfter);
    }

    /** 특이사항이 없으면 null */
    public AttendanceFlag classify(AttendanceType type, LocalDateTime checkedAt) {
        DayOfWeek day = checkedAt.getDayOfWeek();
        if (day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY) {
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
}
