package com.j2s.attendance.repository;

import com.j2s.attendance.entity.AttendanceLog;
import com.j2s.attendance.entity.AttendanceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface AttendanceLogRepository extends JpaRepository<AttendanceLog, Long> {

    List<AttendanceLog> findByWorkerIdOrderByCheckedAtDesc(Long workerId);

    // 관리자 조회 화면용. employeeNo/name 은 null 이면 조건을 걸지 않는다.
    @Query("""
        SELECT a FROM AttendanceLog a
        JOIN FETCH a.worker w
        WHERE a.checkedAt BETWEEN :start AND :end
          AND (:employeeNo IS NULL OR w.employeeNo = :employeeNo)
          AND (:name IS NULL OR LOWER(w.name) LIKE LOWER(CONCAT('%', CAST(:name AS string), '%')))
        ORDER BY a.checkedAt DESC
    """)
    List<AttendanceLog> search(
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end,
        @Param("employeeNo") String employeeNo,
        @Param("name") String name
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

    // 기기 삭제 시 출퇴근 이력은 보존하고 기기 참조만 끊는다
    @Modifying
    @Query("UPDATE AttendanceLog a SET a.device = null WHERE a.device.id = :deviceId")
    void detachDevice(@Param("deviceId") Long deviceId);
}
