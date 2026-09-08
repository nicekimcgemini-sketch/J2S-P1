package com.j2s.attendance.controller;

import com.j2s.attendance.dto.AttendanceLogDto;
import com.j2s.attendance.entity.Device;
import com.j2s.attendance.entity.DeviceStatus;
import com.j2s.attendance.entity.IpWhitelist;
import com.j2s.attendance.service.AttendanceService;
import com.j2s.attendance.service.DeviceService;
import com.j2s.attendance.service.IpWhitelistService;
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
    private final IpWhitelistService ipWhitelistService;

    // 로그인 확인용 (프론트에서 계정/비번 검증 목적으로 호출)
    @GetMapping("/me")
    public ResponseEntity<Void> me() {
        return ResponseEntity.ok().build();
    }

    // 허용 IP 목록 조회
    @GetMapping("/ip-whitelist")
    public ResponseEntity<List<IpWhitelist>> getIpWhitelist() {
        return ResponseEntity.ok(ipWhitelistService.getAll());
    }

    // 허용 IP 추가
    @PostMapping("/ip-whitelist")
    public ResponseEntity<IpWhitelist> addIpWhitelist(@RequestBody IpWhitelistRequest request) {
        return ResponseEntity.ok(ipWhitelistService.add(request.ipAddress(), request.description()));
    }

    // 허용 IP 삭제
    @DeleteMapping("/ip-whitelist/{id}")
    public ResponseEntity<Void> removeIpWhitelist(@PathVariable Long id) {
        ipWhitelistService.remove(id);
        return ResponseEntity.noContent().build();
    }

    public record IpWhitelistRequest(String ipAddress, String description) {}

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

    // 기기 삭제
    @DeleteMapping("/devices/{id}")
    public ResponseEntity<Void> deleteDevice(@PathVariable Long id) {
        deviceService.deleteDevice(id);
        return ResponseEntity.noContent().build();
    }

    // 날짜별 출퇴근 로그 조회
    @GetMapping("/attendance/logs")
    public ResponseEntity<List<AttendanceLogDto>> getLogs(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(attendanceService.getLogs(date));
    }
}
