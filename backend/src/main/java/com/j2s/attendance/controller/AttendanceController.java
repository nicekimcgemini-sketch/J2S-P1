package com.j2s.attendance.controller;

import com.j2s.attendance.dto.AttendanceRequestDto;
import com.j2s.attendance.service.AttendanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 모바일 앱에서 QR 스캔 후 출퇴근 체크 API
 */
@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;

    @PostMapping("/check-in")
    public ResponseEntity<Void> checkIn(@Valid @RequestBody AttendanceRequestDto dto) {
        attendanceService.checkIn(dto);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/check-out")
    public ResponseEntity<Void> checkOut(@Valid @RequestBody AttendanceRequestDto dto) {
        attendanceService.checkOut(dto);
        return ResponseEntity.ok().build();
    }
}
