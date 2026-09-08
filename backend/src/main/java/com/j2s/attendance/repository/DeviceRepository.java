package com.j2s.attendance.repository;

import com.j2s.attendance.entity.Device;
import com.j2s.attendance.entity.DeviceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface DeviceRepository extends JpaRepository<Device, Long> {
    Optional<Device> findByHardwareId(String hardwareId);
    List<Device> findByWorkerIdAndStatus(Long workerId, DeviceStatus status);

    // worker는 LAZY 연관관계라 JOIN FETCH 없이 반환하면 세션 종료 후
    // Jackson이 Hibernate 프록시를 직렬화하지 못해 500 에러가 남
    @Query("SELECT d FROM Device d JOIN FETCH d.worker WHERE d.status = :status ORDER BY d.registeredAt DESC")
    List<Device> findByStatus(DeviceStatus status);

    @Query("SELECT d FROM Device d JOIN FETCH d.worker ORDER BY d.registeredAt DESC")
    List<Device> findAllWithWorker();

    @Query("SELECT d FROM Device d JOIN FETCH d.worker WHERE d.id = :id")
    Optional<Device> findByIdWithWorker(Long id);
}
