package com.j2s.attendance.service;

import com.j2s.attendance.dto.DailyAttendanceDto;
import com.j2s.attendance.dto.DailyStatus;
import com.j2s.attendance.entity.AttendanceLog;
import com.j2s.attendance.entity.AttendanceType;
import com.j2s.attendance.entity.Device;
import com.j2s.attendance.entity.DeviceStatus;
import com.j2s.attendance.entity.Worker;
import com.j2s.attendance.repository.AttendanceLogRepository;
import com.j2s.attendance.repository.DeviceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * 일별 근태 판정(정상/지각/조퇴/야근/결근/누락/근무 중/미출근/주말 특근)과 결근 대상 선정 규칙을 고정한다.
 * 오늘은 2026-09-14(월)로 고정. 9/11 금, 9/12 토, 9/10 목.
 */
@ExtendWith(MockitoExtension.class)
class DailyAttendanceServiceTest {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    @Mock
    private AttendanceLogRepository attendanceLogRepository;
    @Mock
    private DeviceRepository deviceRepository;

    private DailyAttendanceService service;
    private Worker kim;
    private final List<AttendanceLog> logs = new ArrayList<>();
    private final List<Device> devices = new ArrayList<>();

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(LocalDateTime.parse("2026-09-14T15:00:00").atZone(SEOUL).toInstant(), SEOUL);
        service = new DailyAttendanceService(attendanceLogRepository, deviceRepository,
                new WorkHourPolicy("09:00", "18:00", "19:00"), clock);

        kim = worker("S00001", "김민준");
        devices.add(approvedDevice(kim, "2026-09-01T10:00:00", null));

        lenient().when(attendanceLogRepository.search(any(), any(), any(), any())).thenReturn(logs);
        lenient().when(deviceRepository.findAllWithWorker()).thenReturn(devices);
    }

    private static Worker worker(String employeeNo, String name) {
        return Worker.builder().employeeNo(employeeNo).name(name).build();
    }

    private static Device approvedDevice(Worker worker, String approvedAt, String revokedAt) {
        return Device.builder().worker(worker).status(revokedAt == null ? DeviceStatus.APPROVED : DeviceStatus.REVOKED)
                .approvedAt(LocalDateTime.parse(approvedAt))
                .revokedAt(revokedAt == null ? null : LocalDateTime.parse(revokedAt))
                .build();
    }

    private void log(Worker worker, AttendanceType type, String at) {
        logs.add(AttendanceLog.builder().worker(worker).type(type).checkedAt(LocalDateTime.parse(at)).build());
    }

    private DailyAttendanceDto only(LocalDate date) {
        List<DailyAttendanceDto> rows = service.getDailySummary(date, date, null, null);
        assertThat(rows).hasSize(1);
        return rows.get(0);
    }

    @Test
    void 기준_안에_출퇴근하면_정상이고_근무시간을_분으로_계산한다() {
        log(kim, AttendanceType.CHECK_IN, "2026-09-10T08:50:00");
        log(kim, AttendanceType.CHECK_OUT, "2026-09-10T18:20:00");

        DailyAttendanceDto row = only(LocalDate.of(2026, 9, 10));

        assertThat(row.statuses()).containsExactly(DailyStatus.NORMAL);
        assertThat(row.workMinutes()).isEqualTo(570L);
    }

    @Test
    void 지각과_조퇴가_함께_붙을_수_있다() {
        log(kim, AttendanceType.CHECK_IN, "2026-09-10T09:30:00");
        log(kim, AttendanceType.CHECK_OUT, "2026-09-10T15:00:00");

        assertThat(only(LocalDate.of(2026, 9, 10)).statuses())
                .containsExactly(DailyStatus.LATE, DailyStatus.EARLY_LEAVE);
    }

    @Test
    void 야근_퇴근() {
        log(kim, AttendanceType.CHECK_IN, "2026-09-10T08:40:00");
        log(kim, AttendanceType.CHECK_OUT, "2026-09-10T21:00:00");

        assertThat(only(LocalDate.of(2026, 9, 10)).statuses()).containsExactly(DailyStatus.OVERTIME);
    }

    @Test
    void 지난_평일에_기록이_없으면_결근() {
        DailyAttendanceDto row = only(LocalDate.of(2026, 9, 10));

        assertThat(row.statuses()).containsExactly(DailyStatus.ABSENT);
        assertThat(row.workMinutes()).isNull();
    }

    @Test
    void 지난_날_출근만_있으면_퇴근_누락_퇴근만_있으면_출근_누락() {
        log(kim, AttendanceType.CHECK_IN, "2026-09-10T09:10:00");
        log(kim, AttendanceType.CHECK_OUT, "2026-09-11T18:10:00");

        assertThat(only(LocalDate.of(2026, 9, 10)).statuses())
                .containsExactly(DailyStatus.LATE, DailyStatus.MISSING_CHECK_OUT);
        assertThat(only(LocalDate.of(2026, 9, 11)).statuses())
                .containsExactly(DailyStatus.MISSING_CHECK_IN);
    }

    @Test
    void 오늘은_결근이나_퇴근_누락_대신_미출근_근무_중으로_본다() {
        Worker lee = worker("S00002", "이서연");
        devices.add(approvedDevice(lee, "2026-09-01T10:00:00", null));
        log(kim, AttendanceType.CHECK_IN, "2026-09-14T08:30:00");

        List<DailyAttendanceDto> rows = service.getDailySummary(LocalDate.of(2026, 9, 14), LocalDate.of(2026, 9, 14), null, null);

        assertThat(rows).extracting(DailyAttendanceDto::workerName, DailyAttendanceDto::statuses)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("김민준", List.of(DailyStatus.WORKING)),
                        org.assertj.core.groups.Tuple.tuple("이서연", List.of(DailyStatus.NOT_YET)));
    }

    @Test
    void 주말은_기록이_있을_때만_특근으로_나오고_지각_판정을_하지_않는다() {
        log(kim, AttendanceType.CHECK_IN, "2026-09-12T10:30:00");
        log(kim, AttendanceType.CHECK_OUT, "2026-09-12T14:00:00");

        List<DailyAttendanceDto> rows = service.getDailySummary(LocalDate.of(2026, 9, 12), LocalDate.of(2026, 9, 13), null, null);

        assertThat(rows).hasSize(1);
        assertThat(rows.get(0).statuses()).containsExactly(DailyStatus.WEEKEND_WORK);
    }

    @Test
    void 기기_승인_전이나_해제된_날부터는_결근으로_잡지_않는다() {
        Worker choi = worker("S00003", "최지우");
        devices.clear();
        devices.add(approvedDevice(choi, "2026-09-08T10:00:00", "2026-09-10T12:00:00"));

        List<DailyAttendanceDto> rows = service.getDailySummary(LocalDate.of(2026, 9, 7), LocalDate.of(2026, 9, 11), null, null);

        // 9/8(승인 당일), 9/9 만 결근 대상. 9/7 은 승인 전, 9/10 은 해제 당일, 9/11 은 해제 후
        assertThat(rows).extracting(DailyAttendanceDto::date)
                .containsExactly(LocalDate.of(2026, 9, 9), LocalDate.of(2026, 9, 8));
    }

    @Test
    void 기기가_없어도_기록이_있는_날은_포함한다() {
        devices.clear();
        log(kim, AttendanceType.CHECK_IN, "2026-09-10T08:50:00");

        List<DailyAttendanceDto> rows = service.getDailySummary(LocalDate.of(2026, 9, 9), LocalDate.of(2026, 9, 10), null, null);

        assertThat(rows).extracting(DailyAttendanceDto::date).containsExactly(LocalDate.of(2026, 9, 10));
    }

    @Test
    void 미래_날짜는_만들지_않는다() {
        List<DailyAttendanceDto> rows = service.getDailySummary(LocalDate.of(2026, 9, 14), LocalDate.of(2026, 9, 30), null, null);

        assertThat(rows).extracting(DailyAttendanceDto::date).containsOnly(LocalDate.of(2026, 9, 14));
    }

    @Test
    void 이름_필터는_결근_대상_작업자에도_적용된다() {
        devices.add(approvedDevice(worker("S00002", "이서연"), "2026-09-01T10:00:00", null));
        when(attendanceLogRepository.search(any(), any(), isNull(), any())).thenReturn(logs);

        List<DailyAttendanceDto> rows = service.getDailySummary(LocalDate.of(2026, 9, 10), LocalDate.of(2026, 9, 10), null, "서연");

        assertThat(rows).extracting(DailyAttendanceDto::workerName).containsExactly("이서연");
    }

    @Test
    void 종료일이_시작일보다_빠르면_400() {
        assertThatThrownBy(() -> service.getDailySummary(LocalDate.of(2026, 9, 10), LocalDate.of(2026, 9, 1), null, null))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("400");
    }
}
