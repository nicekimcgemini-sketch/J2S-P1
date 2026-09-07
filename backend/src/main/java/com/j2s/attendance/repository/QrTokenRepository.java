package com.j2s.attendance.repository;

import com.j2s.attendance.entity.QrToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import java.time.LocalDateTime;
import java.util.Optional;

public interface QrTokenRepository extends JpaRepository<QrToken, Long> {
    Optional<QrToken> findByToken(String token);

    // 만료된 미사용 토큰 정리 (스케줄러용)
    @Modifying
    @Query("DELETE FROM QrToken q WHERE q.expiresAt < :cutoff AND q.usedAt IS NULL")
    int deleteExpiredTokens(LocalDateTime cutoff);
}
