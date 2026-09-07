package com.j2s.attendance.service;

import com.j2s.attendance.dto.AttendanceLogDto;
import com.j2s.attendance.dto.AttendanceRequestDto;
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
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime todayEnd = LocalDate.now().atTime(LocalTime.MAX);

        // 오늘 이미 출근한 경우 중복 방지
        if (attendanceLogRepository.existsByWorkerIdAndTypeAndCheckedAtBetween(
                worker.getId(), AttendanceType.CHECK_IN, todayStart, todayEnd)) {
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
    public List<AttendanceLogDto> getLogs(Long companyId, LocalDate date) {
        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.atTime(LocalTime.MAX);

        List<AttendanceLog> logs = (companyId != null)
                ? attendanceLogRepository.findByCompanyAndDateRange(companyId, start, end)
                : attendanceLogRepository.findByDateRange(start, end);

        return logs.stream().map(AttendanceLogDto::from).toList();
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
