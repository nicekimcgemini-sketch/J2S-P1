package com.j2s.attendance.service;

import com.j2s.attendance.dto.QrResponseDto;
import com.j2s.attendance.entity.QrToken;
import com.j2s.attendance.repository.QrTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class QrService {

    private final QrTokenRepository qrTokenRepository;

    @Value("${app.qr.expiry-seconds:60}")
    private int expirySeconds;

    @Transactional
    public QrResponseDto generateQrToken() {
        String token = UUID.randomUUID().toString();
        LocalDateTime expiresAt = LocalDateTime.now().plusSeconds(expirySeconds);

        QrToken qrToken = QrToken.builder()
                .token(token)
                .expiresAt(expiresAt)
                .build();

        qrTokenRepository.save(qrToken);

        return new QrResponseDto(token, expiresAt, expirySeconds);
    }

    /**
     * QR 토큰 검증 및 즉시 폐기 (원자적 처리)
     * 사진 공유 등 재사용 공격 원천 차단
     */
    @Transactional
    public boolean validateAndInvalidate(String token) {
        return qrTokenRepository.findByToken(token).map(qr -> {
            if (qr.isExpired()) {
                log.warn("QR 토큰 만료: {}", token);
                return false;
            }
            if (qr.isUsed()) {
                log.warn("QR 토큰 재사용 시도: {}", token);
                return false;
            }
            qr.setUsedAt(LocalDateTime.now());
            qrTokenRepository.save(qr);
            return true;
        }).orElseGet(() -> {
            log.warn("QR 토큰 존재하지 않음: {}", token);
            return false;
        });
    }

    // 만료된 토큰 주기적 정리 (10분마다)
    @Scheduled(fixedDelay = 600_000)
    @Transactional
    public void cleanupExpiredTokens() {
        int deleted = qrTokenRepository.deleteExpiredTokens(
                LocalDateTime.now().minus(5, ChronoUnit.MINUTES)
        );
        if (deleted > 0) {
            log.debug("만료 QR 토큰 {} 건 삭제", deleted);
        }
    }
}
