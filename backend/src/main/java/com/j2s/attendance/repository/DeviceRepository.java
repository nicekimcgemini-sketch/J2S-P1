package com.j2s.attendance.repository;

import com.j2s.attendance.entity.Device;
import com.j2s.attendance.entity.DeviceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface DeviceRepository extends JpaRepository<Device, Long> {
    Optional<Device> findByHardwareId(String hardwareId);
    List<Device> findByStatus(DeviceStatus status);
    List<Device> findByWorkerIdAndStatus(Long workerId, DeviceStatus status);
}
