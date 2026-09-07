package com.j2s.attendance.controller;

import com.j2s.attendance.dto.QrResponseDto;
import com.j2s.attendance.service.QrService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 현장 PC용 QR 코드 생성 API
 * IpWhitelistFilter 에 의해 화이트리스트 IP에서만 접근 가능
 */
@RestController
@RequestMapping("/api/qr")
@RequiredArgsConstructor
public class QrController {

    private final QrService qrService;

    // QR 코드 토큰 발급 (1분 유효, 1회용)
    @GetMapping("/generate")
    public ResponseEntity<QrResponseDto> generate() {
        return ResponseEntity.ok(qrService.generateQrToken());
    }
}
