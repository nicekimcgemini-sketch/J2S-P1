package com.j2s.attendance.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class QrResponseDto {
    private String token;
    private LocalDateTime expiresAt;
    private long expiresInSeconds;
}
