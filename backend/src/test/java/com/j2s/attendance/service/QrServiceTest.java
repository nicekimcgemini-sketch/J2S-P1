package com.j2s.attendance.service;

import com.j2s.attendance.dto.QrResponseDto;
import com.j2s.attendance.entity.QrToken;
import com.j2s.attendance.repository.QrTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * QR 1회용 검증(validateAndInvalidate)은 재사용 공격을 막는 핵심 로직이므로
 * 정상/만료/재사용/미존재 네 가지 경로를 모두 고정한다.
 */
@ExtendWith(MockitoExtension.class)
class QrServiceTest {

    @Mock
    private QrTokenRepository qrTokenRepository;

    private QrService qrService;

    @BeforeEach
    void setUp() {
        qrService = new QrService(qrTokenRepository);
        ReflectionTestUtils.setField(qrService, "expirySeconds", 60);
    }

    @Test
    void generateQrToken_유효기간이_설정값만큼_부여된다() {
        QrResponseDto dto = qrService.generateQrToken();

        assertThat(dto.getToken()).isNotBlank();
        assertThat(dto.getExpiresInSeconds()).isEqualTo(60);
        assertThat(dto.getExpiresAt()).isAfter(LocalDateTime.now());

        ArgumentCaptor<QrToken> captor = ArgumentCaptor.forClass(QrToken.class);
        verify(qrTokenRepository).save(captor.capture());
        assertThat(captor.getValue().getToken()).isEqualTo(dto.getToken());
    }

    @Test
    void validateAndInvalidate_유효한_미사용_토큰은_통과하고_즉시_폐기된다() {
        QrToken token = QrToken.builder()
                .token("valid-token")
                .expiresAt(LocalDateTime.now().plusSeconds(30))
                .build();
        when(qrTokenRepository.findByToken("valid-token")).thenReturn(Optional.of(token));

        boolean result = qrService.validateAndInvalidate("valid-token");

        assertThat(result).isTrue();
        assertThat(token.getUsedAt()).isNotNull();
        verify(qrTokenRepository).save(token);
    }

    @Test
    void validateAndInvalidate_만료된_토큰은_거부된다() {
        QrToken token = QrToken.builder()
                .token("expired-token")
                .expiresAt(LocalDateTime.now().minusSeconds(1))
                .build();
        when(qrTokenRepository.findByToken("expired-token")).thenReturn(Optional.of(token));

        boolean result = qrService.validateAndInvalidate("expired-token");

        assertThat(result).isFalse();
        assertThat(token.getUsedAt()).isNull();
        verify(qrTokenRepository, never()).save(any());
    }

    @Test
    void validateAndInvalidate_이미_사용된_토큰_재사용은_거부된다() {
        QrToken token = QrToken.builder()
                .token("used-token")
                .expiresAt(LocalDateTime.now().plusSeconds(30))
                .usedAt(LocalDateTime.now().minusSeconds(5))
                .build();
        when(qrTokenRepository.findByToken("used-token")).thenReturn(Optional.of(token));

        boolean result = qrService.validateAndInvalidate("used-token");

        assertThat(result).isFalse();
        verify(qrTokenRepository, never()).save(any());
    }

    @Test
    void validateAndInvalidate_존재하지_않는_토큰은_거부된다() {
        when(qrTokenRepository.findByToken("unknown")).thenReturn(Optional.empty());

        boolean result = qrService.validateAndInvalidate("unknown");

        assertThat(result).isFalse();
        verify(qrTokenRepository, never()).save(any());
    }
}
