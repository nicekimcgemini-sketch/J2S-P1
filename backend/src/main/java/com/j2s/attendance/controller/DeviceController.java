package com.j2s.attendance.controller;

import com.j2s.attendance.dto.DeviceRegisterDto;
import com.j2s.attendance.dto.TodayAttendanceDto;
import com.j2s.attendance.entity.Device;
import com.j2s.attendance.service.AttendanceService;
import com.j2s.attendance.service.DeviceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

/**
 * 모바일(웹/앱) 기기 등록 API (인증 불필요 - 등록 후 관리자가 승인)
 */
@RestController
@RequestMapping("/api/devices")
@RequiredArgsConstructor
public class DeviceController {

    private final DeviceService deviceService;
    private final AttendanceService attendanceService;

    @PostMapping("/register")
    public ResponseEntity<Device> register(@Valid @RequestBody DeviceRegisterDto dto) {
        Device device = deviceService.registerDevice(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(device);
    }

    // 기기 상태 조회 (등록 여부/승인 여부/오늘 출퇴근 여부·시각 확인용, 인증 불필요)
    @GetMapping("/status")
    public ResponseEntity<DeviceStatusResponse> getStatus(@RequestParam String hardwareId) {
        return deviceService.findByHardwareId(hardwareId)
                .map(d -> {
                    TodayAttendanceDto today = attendanceService.getTodayAttendance(d.getWorker().getId());
                    return ResponseEntity.ok(new DeviceStatusResponse(
                            d.getStatus().name(),
                            d.getWorker().getName(),
                            today.checkedIn(),
                            today.checkInAt(),
                            today.checkOutAt()));
                })
                .orElseGet(() -> ResponseEntity.ok(new DeviceStatusResponse("NOT_REGISTERED", null, false, null, null)));
    }

    public record DeviceStatusResponse(
            String status,
            String workerName,
            boolean checkedInToday,
            LocalDateTime checkInAt,
            LocalDateTime checkOutAt) {}
}
