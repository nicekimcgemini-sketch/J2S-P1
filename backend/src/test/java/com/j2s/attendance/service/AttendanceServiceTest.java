package com.j2s.attendance.service;

import com.j2s.attendance.dto.AttendanceRequestDto;
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
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * 출퇴근 처리의 방어 로직(미등록/미승인 기기 차단, QR 재검증, 중복 출근 방지)을 고정한다.
 */
@ExtendWith(MockitoExtension.class)
class AttendanceServiceTest {

    @Mock
    private AttendanceLogRepository attendanceLogRepository;
    @Mock
    private DeviceRepository deviceRepository;
    @Mock
    private QrService qrService;

    private AttendanceService attendanceService;

    private Worker worker;
    private Device approvedDevice;
    private AttendanceRequestDto dto;

    @BeforeEach
    void setUp() {
        attendanceService = new AttendanceService(attendanceLogRepository, deviceRepository, qrService);

        worker = Worker.builder().id(1L).employeeNo("S00001").name("홍길동").build();
        approvedDevice = Device.builder()
                .id(10L)
                .hardwareId("hw-1")
                .status(DeviceStatus.APPROVED)
                .worker(worker)
                .build();

        dto = new AttendanceRequestDto();
        dto.setHardwareId("hw-1");
        dto.setQrToken("qr-token");
    }

    @Test
    void checkIn_등록되지_않은_기기는_401() {
        when(deviceRepository.findByHardwareId("hw-1")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> attendanceService.checkIn(dto))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("401");

        verifyNoInteractions(qrService);
    }

    @Test
    void checkIn_승인되지_않은_기기는_403() {
        Device pending = Device.builder().hardwareId("hw-1").status(DeviceStatus.PENDING).worker(worker).build();
        when(deviceRepository.findByHardwareId("hw-1")).thenReturn(Optional.of(pending));

        assertThatThrownBy(() -> attendanceService.checkIn(dto))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("403");

        verifyNoInteractions(qrService);
    }

    @Test
    void checkIn_회수된_기기는_403() {
        Device revoked = Device.builder().hardwareId("hw-1").status(DeviceStatus.REVOKED).worker(worker).build();
        when(deviceRepository.findByHardwareId("hw-1")).thenReturn(Optional.of(revoked));

        assertThatThrownBy(() -> attendanceService.checkIn(dto))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("403");
    }

    @Test
    void checkIn_유효하지_않은_QR은_400이고_출근이_기록되지_않는다() {
        when(deviceRepository.findByHardwareId("hw-1")).thenReturn(Optional.of(approvedDevice));
        when(qrService.validateAndInvalidate("qr-token")).thenReturn(false);

        assertThatThrownBy(() -> attendanceService.checkIn(dto))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("400");

        verify(attendanceLogRepository, never()).save(any());
    }

    @Test
    void checkIn_오늘_이미_출근했으면_409() {
        when(deviceRepository.findByHardwareId("hw-1")).thenReturn(Optional.of(approvedDevice));
        when(qrService.validateAndInvalidate("qr-token")).thenReturn(true);
        when(attendanceLogRepository.existsByWorkerIdAndTypeAndCheckedAtBetween(
                eq(1L), eq(AttendanceType.CHECK_IN), any(), any())).thenReturn(true);

        assertThatThrownBy(() -> attendanceService.checkIn(dto))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("409");

        verify(attendanceLogRepository, never()).save(any());
    }

    @Test
    void checkIn_정상_흐름에서는_CHECK_IN_로그가_저장된다() {
        when(deviceRepository.findByHardwareId("hw-1")).thenReturn(Optional.of(approvedDevice));
        when(qrService.validateAndInvalidate("qr-token")).thenReturn(true);
        when(attendanceLogRepository.existsByWorkerIdAndTypeAndCheckedAtBetween(
                eq(1L), eq(AttendanceType.CHECK_IN), any(), any())).thenReturn(false);
        when(attendanceLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        attendanceService.checkIn(dto);

        ArgumentCaptor<AttendanceLog> captor = ArgumentCaptor.forClass(AttendanceLog.class);
        verify(attendanceLogRepository).save(captor.capture());
        assertThat(captor.getValue().getType()).isEqualTo(AttendanceType.CHECK_IN);
        assertThat(captor.getValue().getWorker()).isEqualTo(worker);
        assertThat(captor.getValue().getDevice()).isEqualTo(approvedDevice);
    }

    @Test
    void checkOut_같은_날_여러_번_허용된다() {
        when(deviceRepository.findByHardwareId("hw-1")).thenReturn(Optional.of(approvedDevice));
        when(qrService.validateAndInvalidate("qr-token")).thenReturn(true);
        when(attendanceLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        attendanceService.checkOut(dto);

        // 퇴근은 hasCheckedInToday 같은 중복 방지 조회를 거치지 않아야 한다
        verify(attendanceLogRepository, never()).existsByWorkerIdAndTypeAndCheckedAtBetween(
                anyLong(), any(), any(), any());
        ArgumentCaptor<AttendanceLog> captor = ArgumentCaptor.forClass(AttendanceLog.class);
        verify(attendanceLogRepository).save(captor.capture());
        assertThat(captor.getValue().getType()).isEqualTo(AttendanceType.CHECK_OUT);
    }

    @Test
    void getTodayAttendance_기록이_없으면_모두_null이고_checkedIn은_false() {
        when(attendanceLogRepository.findFirstByWorkerIdAndTypeAndCheckedAtBetweenOrderByCheckedAtDesc(
                eq(1L), any(), any(), any())).thenReturn(Optional.empty());

        var result = attendanceService.getTodayAttendance(1L);

        assertThat(result.checkedIn()).isFalse();
        assertThat(result.checkInAt()).isNull();
        assertThat(result.checkOutAt()).isNull();
    }

    @Test
    void getTodayAttendance_출근만_했으면_checkInAt만_채워진다() {
        LocalDateTime checkInTime = LocalDateTime.now().minusHours(2);
        AttendanceLog checkInLog = AttendanceLog.builder().type(AttendanceType.CHECK_IN).checkedAt(checkInTime).build();

        when(attendanceLogRepository.findFirstByWorkerIdAndTypeAndCheckedAtBetweenOrderByCheckedAtDesc(
                eq(1L), eq(AttendanceType.CHECK_IN), any(), any())).thenReturn(Optional.of(checkInLog));
        when(attendanceLogRepository.findFirstByWorkerIdAndTypeAndCheckedAtBetweenOrderByCheckedAtDesc(
                eq(1L), eq(AttendanceType.CHECK_OUT), any(), any())).thenReturn(Optional.empty());

        var result = attendanceService.getTodayAttendance(1L);

        assertThat(result.checkedIn()).isTrue();
        assertThat(result.checkInAt()).isEqualTo(checkInTime);
        assertThat(result.checkOutAt()).isNull();
    }

    @Test
    void getTodayAttendance_출근_퇴근_모두_했으면_가장_최근_퇴근시각을_반환한다() {
        LocalDateTime checkInTime = LocalDateTime.now().minusHours(8);
        LocalDateTime latestCheckOut = LocalDateTime.now().minusMinutes(5);
        AttendanceLog checkInLog = AttendanceLog.builder().type(AttendanceType.CHECK_IN).checkedAt(checkInTime).build();
        AttendanceLog checkOutLog = AttendanceLog.builder().type(AttendanceType.CHECK_OUT).checkedAt(latestCheckOut).build();

        when(attendanceLogRepository.findFirstByWorkerIdAndTypeAndCheckedAtBetweenOrderByCheckedAtDesc(
                eq(1L), eq(AttendanceType.CHECK_IN), any(), any())).thenReturn(Optional.of(checkInLog));
        when(attendanceLogRepository.findFirstByWorkerIdAndTypeAndCheckedAtBetweenOrderByCheckedAtDesc(
                eq(1L), eq(AttendanceType.CHECK_OUT), any(), any())).thenReturn(Optional.of(checkOutLog));

        var result = attendanceService.getTodayAttendance(1L);

        assertThat(result.checkedIn()).isTrue();
        assertThat(result.checkInAt()).isEqualTo(checkInTime);
        assertThat(result.checkOutAt()).isEqualTo(latestCheckOut);
    }
}
