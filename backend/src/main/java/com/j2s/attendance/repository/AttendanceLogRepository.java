package com.j2s.attendance.repository;

import com.j2s.attendance.entity.AttendanceLog;
import com.j2s.attendance.entity.AttendanceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface AttendanceLogRepository extends JpaRepository<AttendanceLog, Long> {

    List<AttendanceLog> findByWorkerIdOrderByCheckedAtDesc(Long workerId);

    @Query("""
        SELECT a FROM AttendanceLog a
        JOIN FETCH a.worker w
        WHERE a.checkedAt BETWEEN :start AND :end
        ORDER BY a.checkedAt DESC
    """)
    List<AttendanceLog> findByDateRange(
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end
    );

    // 오늘 출근 여부 확인 (중복 체크 방지)
    boolean existsByWorkerIdAndTypeAndCheckedAtBetween(
        Long workerId,
        AttendanceType type,
        LocalDateTime start,
        LocalDateTime end
    );

    // 당일 출근/퇴근 시각 표시용 — 퇴근은 여러 번 정정될 수 있으므로 가장 최근 기록을 사용
    Optional<AttendanceLog> findFirstByWorkerIdAndTypeAndCheckedAtBetweenOrderByCheckedAtDesc(
        Long workerId,
        AttendanceType type,
        LocalDateTime start,
        LocalDateTime end
    );
}
