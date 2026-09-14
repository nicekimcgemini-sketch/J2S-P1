package com.j2s.attendance.service;

import com.j2s.attendance.dto.AttendanceFlag;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

import static com.j2s.attendance.entity.AttendanceType.CHECK_IN;
import static com.j2s.attendance.entity.AttendanceType.CHECK_OUT;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * 지각/조퇴/야근 판정 경계값과 휴일·휴게시간 규칙을 고정한다. 기준: 출근 09:00, 퇴근 18:00, 야근 19:00 이후, 휴게 12:00~13:00.
 * 2026-09-14 는 월요일, 2026-09-12 는 토요일.
 */
class WorkHourPolicyTest {

    private static final Set<LocalDate> NO_HOLIDAYS = Set.of();

    private final WorkHourPolicy policy = new WorkHourPolicy("09:00", "18:00", "19:00", "12:00", "13:00");

    private static LocalDateTime weekday(String time) {
        return LocalDateTime.parse("2026-09-14T" + time);
    }

    @Test
    void 출근은_기준_분까지_정상이고_그_다음_분부터_지각() {
        assertThat(policy.classify(CHECK_IN, weekday("08:59:59"), NO_HOLIDAYS)).isNull();
        assertThat(policy.classify(CHECK_IN, weekday("09:00:59"), NO_HOLIDAYS)).isNull();
        assertThat(policy.classify(CHECK_IN, weekday("09:01:00"), NO_HOLIDAYS)).isEqualTo(AttendanceFlag.LATE);
    }

    @Test
    void 퇴근_기준_이전이면_조퇴() {
        assertThat(policy.classify(CHECK_OUT, weekday("17:59:59"), NO_HOLIDAYS)).isEqualTo(AttendanceFlag.EARLY_LEAVE);
        assertThat(policy.classify(CHECK_OUT, weekday("13:00:00"), NO_HOLIDAYS)).isEqualTo(AttendanceFlag.EARLY_LEAVE);
    }

    @Test
    void 퇴근_기준부터_야근_기준_전까지는_정상_퇴근() {
        assertThat(policy.classify(CHECK_OUT, weekday("18:00:00"), NO_HOLIDAYS)).isNull();
        assertThat(policy.classify(CHECK_OUT, weekday("18:59:59"), NO_HOLIDAYS)).isNull();
    }

    @Test
    void 야근_기준_이후_퇴근은_야근() {
        assertThat(policy.classify(CHECK_OUT, weekday("19:00:00"), NO_HOLIDAYS)).isEqualTo(AttendanceFlag.OVERTIME);
        assertThat(policy.classify(CHECK_OUT, weekday("22:30:00"), NO_HOLIDAYS)).isEqualTo(AttendanceFlag.OVERTIME);
    }

    @Test
    void 출근_기록은_늦은_시각이어도_조퇴나_야근으로_판정하지_않는다() {
        assertThat(policy.classify(CHECK_IN, weekday("20:00:00"), NO_HOLIDAYS)).isEqualTo(AttendanceFlag.LATE);
    }

    @Test
    void 주말_기록은_판정하지_않는다() {
        assertThat(policy.classify(CHECK_IN, LocalDateTime.parse("2026-09-12T10:30:00"), NO_HOLIDAYS)).isNull();
        assertThat(policy.classify(CHECK_OUT, LocalDateTime.parse("2026-09-12T14:00:00"), NO_HOLIDAYS)).isNull();
        assertThat(policy.classify(CHECK_OUT, LocalDateTime.parse("2026-09-13T21:00:00"), NO_HOLIDAYS)).isNull();
    }

    @Test
    void 등록된_휴일은_평일이어도_판정하지_않는다() {
        Set<LocalDate> chuseok = Set.of(LocalDate.of(2026, 9, 14));
        assertThat(policy.isWorkday(LocalDate.of(2026, 9, 14), chuseok)).isFalse();
        assertThat(policy.classify(CHECK_IN, weekday("10:00:00"), chuseok)).isNull();
        assertThat(policy.classify(CHECK_OUT, weekday("15:00:00"), chuseok)).isNull();
    }

    @Test
    void 휴게시간은_출퇴근_구간과_겹치는_만큼만_뺀다() {
        assertThat(policy.breakMinutes(weekday("08:50:00"), weekday("18:10:00"))).isEqualTo(60);
        assertThat(policy.breakMinutes(weekday("12:30:00"), weekday("18:00:00"))).isEqualTo(30);
        assertThat(policy.breakMinutes(weekday("08:30:00"), weekday("12:20:00"))).isEqualTo(20);
        assertThat(policy.breakMinutes(weekday("08:30:00"), weekday("11:00:00"))).isZero();
        assertThat(policy.breakMinutes(weekday("13:30:00"), weekday("22:00:00"))).isZero();
    }
}
