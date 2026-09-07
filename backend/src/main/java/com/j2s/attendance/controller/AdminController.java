package com.j2s.attendance.controller;

import com.j2s.attendance.dto.AttendanceLogDto;
import com.j2s.attendance.entity.Device;
import com.j2s.attendance.entity.DeviceStatus;
import com.j2s.attendance.service.AttendanceService;
import com.j2s.attendance.service.DeviceService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * 관리자 화면 전용 API (ROLE_ADMIN 필요)
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final DeviceService deviceService;
    private final AttendanceService attendanceService;

    // 전체 기기 목록 조회
    @GetMapping("/devices")
    public ResponseEntity<List<Device>> getAllDevices() {
        return ResponseEntity.ok(deviceService.getAllDevices());
    }

    // 승인 대기 기기 목록
    @GetMapping("/devices/pending")
    public ResponseEntity<List<Device>> getPendingDevices() {
        return ResponseEntity.ok(deviceService.getPendingDevices());
    }

    // 기기 상태 변경 (APPROVED / REVOKED)
    @PatchMapping("/devices/{id}/status")
    public ResponseEntity<Device> updateDeviceStatus(
            @PathVariable Long id,
            @RequestParam DeviceStatus status) {
        return ResponseEntity.ok(deviceService.updateDeviceStatus(id, status));
    }

    // 날짜별/협력사별 출퇴근 로그 조회
    @GetMapping("/attendance/logs")
    public ResponseEntity<List<AttendanceLogDto>> getLogs(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Long companyId) {
        return ResponseEntity.ok(attendanceService.getLogs(companyId, date));
    }
}
