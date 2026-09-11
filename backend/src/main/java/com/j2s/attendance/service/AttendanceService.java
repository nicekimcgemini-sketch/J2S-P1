package com.j2s.attendance.service;

import com.j2s.attendance.dto.AttendanceLogDto;
import com.j2s.attendance.dto.AttendanceRequestDto;
import com.j2s.attendance.dto.TodayAttendanceDto;
import com.j2s.attendance.entity.*;
import com.j2s.attendance.repository.AttendanceLogRepository;
import com.j2s.attendance.repository.DeviceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AttendanceService {

    private final AttendanceLogRepository attendanceLogRepository;
    private final DeviceRepository deviceRepository;
    private final QrService qrService;

    @Transactional
    public AttendanceLog checkIn(AttendanceRequestDto dto) {
        Device device = validateDevice(dto.getHardwareId());

        // QR 검증 및 즉시 폐기 (재사용 차단)
        if (!qrService.validateAndInvalidate(dto.getQrToken())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 QR 코드입니다.");
        }

        Worker worker = device.getWorker();

        // 오늘 이미 출근한 경우 중복 방지
        if (hasCheckedInToday(worker.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 오늘 출근 처리가 완료되었습니다.");
        }

        AttendanceLog log = AttendanceLog.builder()
                .worker(worker)
                .device(device)
                .type(AttendanceType.CHECK_IN)
                .checkedAt(LocalDateTime.now())
                .qrToken(dto.getQrToken())
                .build();

        this.log.info("출근 처리: worker={}, device={}", worker.getEmployeeNo(), device.getHardwareId());
        return attendanceLogRepository.save(log);
    }

    @Transactional
    public AttendanceLog checkOut(AttendanceRequestDto dto) {
        Device device = validateDevice(dto.getHardwareId());

        if (!qrService.validateAndInvalidate(dto.getQrToken())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 QR 코드입니다.");
        }

        Worker worker = device.getWorker();

        // 출근과 동일하게 하루 1회로 제한 (중복 방지)
        if (hasCheckedOutToday(worker.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 오늘 퇴근 처리가 완료되었습니다.");
        }

        AttendanceLog log = AttendanceLog.builder()
                .worker(worker)
                .device(device)
                .type(AttendanceType.CHECK_OUT)
                .checkedAt(LocalDateTime.now())
                .qrToken(dto.getQrToken())
                .build();

        this.log.info("퇴근 처리: worker={}", worker.getEmployeeNo());
        return attendanceLogRepository.save(log);
    }

    @Transactional(readOnly = true)
    public List<AttendanceLogDto> getLogs(LocalDate startDate, LocalDate endDate, String employeeNo, String name) {
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.atTime(LocalTime.MAX);
        String normalizedEmployeeNo = (employeeNo == null || employeeNo.isBlank()) ? null : employeeNo.trim();
        String normalizedName = (name == null || name.isBlank()) ? null : name.trim();

        List<AttendanceLog> logs = attendanceLogRepository.search(start, end, normalizedEmployeeNo, normalizedName);
        return logs.stream().map(AttendanceLogDto::from).toList();
    }

    @Transactional
    public void deleteLog(Long id) {
        if (!attendanceLogRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "출퇴근 기록을 찾을 수 없습니다.");
        }
        attendanceLogRepository.deleteById(id);
        log.info("출퇴근 기록 삭제: id={}", id);
    }

    @Transactional(readOnly = true)
    public boolean hasCheckedInToday(Long workerId) {
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime todayEnd = LocalDate.now().atTime(LocalTime.MAX);
        return attendanceLogRepository.existsByWorkerIdAndTypeAndCheckedAtBetween(
                workerId, AttendanceType.CHECK_IN, todayStart, todayEnd);
    }

    @Transactional(readOnly = true)
    public boolean hasCheckedOutToday(Long workerId) {
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime todayEnd = LocalDate.now().atTime(LocalTime.MAX);
        return attendanceLogRepository.existsByWorkerIdAndTypeAndCheckedAtBetween(
                workerId, AttendanceType.CHECK_OUT, todayStart, todayEnd);
    }

    /** 모바일 체크인 화면에 당일 출근/퇴근 시각을 표시하기 위한 조회. */
    @Transactional(readOnly = true)
    public TodayAttendanceDto getTodayAttendance(Long workerId) {
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime todayEnd = LocalDate.now().atTime(LocalTime.MAX);

        LocalDateTime checkInAt = attendanceLogRepository
                .findFirstByWorkerIdAndTypeAndCheckedAtBetweenOrderByCheckedAtDesc(
                        workerId, AttendanceType.CHECK_IN, todayStart, todayEnd)
                .map(AttendanceLog::getCheckedAt)
                .orElse(null);
        LocalDateTime checkOutAt = attendanceLogRepository
                .findFirstByWorkerIdAndTypeAndCheckedAtBetweenOrderByCheckedAtDesc(
                        workerId, AttendanceType.CHECK_OUT, todayStart, todayEnd)
                .map(AttendanceLog::getCheckedAt)
                .orElse(null);

        return new TodayAttendanceDto(checkInAt != null, checkInAt, checkOutAt);
    }

    private Device validateDevice(String hardwareId) {
        Device device = deviceRepository.findByHardwareId(hardwareId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "등록되지 않은 기기입니다."));

        if (device.getStatus() != DeviceStatus.APPROVED) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "승인되지 않은 기기입니다. 상태: " + device.getStatus());
        }
        return device;
    }
}
