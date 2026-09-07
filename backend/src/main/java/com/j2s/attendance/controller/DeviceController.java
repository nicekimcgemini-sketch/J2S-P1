package com.j2s.attendance.controller;

import com.j2s.attendance.dto.DeviceRegisterDto;
import com.j2s.attendance.entity.Device;
import com.j2s.attendance.service.DeviceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 모바일 앱 기기 등록 API (인증 불필요 - 등록 후 관리자가 승인)
 */
@RestController
@RequestMapping("/api/devices")
@RequiredArgsConstructor
public class DeviceController {

    private final DeviceService deviceService;

    @PostMapping("/register")
    public ResponseEntity<Device> register(@Valid @RequestBody DeviceRegisterDto dto) {
        Device device = deviceService.registerDevice(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(device);
    }
}
