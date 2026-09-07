package com.j2s.attendance.repository;

import com.j2s.attendance.entity.AttendanceLog;
import com.j2s.attendance.entity.AttendanceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;

public interface AttendanceLogRepository extends JpaRepository<AttendanceLog, Long> {

    List<AttendanceLog> findByWorkerIdOrderByCheckedAtDesc(Long workerId);

    @Query("""
        SELECT a FROM AttendanceLog a
        JOIN FETCH a.worker w
        JOIN FETCH w.company c
        WHERE a.checkedAt BETWEEN :start AND :end
        ORDER BY a.checkedAt DESC
    """)
    List<AttendanceLog> findByDateRange(
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end
    );

    @Query("""
        SELECT a FROM AttendanceLog a
        JOIN FETCH a.worker w
        JOIN FETCH w.company c
        WHERE c.id = :companyId
          AND a.checkedAt BETWEEN :start AND :end
        ORDER BY a.checkedAt DESC
    """)
    List<AttendanceLog> findByCompanyAndDateRange(
        @Param("companyId") Long companyId,
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
}
