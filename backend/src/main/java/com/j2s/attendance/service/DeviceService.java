package com.j2s.attendance.service;

import com.j2s.attendance.dto.DeviceRegisterDto;
import com.j2s.attendance.entity.Device;
import com.j2s.attendance.entity.DeviceStatus;
import com.j2s.attendance.entity.Worker;
import com.j2s.attendance.repository.DeviceRepository;
import com.j2s.attendance.repository.WorkerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeviceService {

    private final DeviceRepository deviceRepository;
    private final WorkerRepository workerRepository;

    @Transactional
    public Device registerDevice(DeviceRegisterDto dto) {
        Worker worker = workerRepository.findByEmployeeNo(dto.getEmployeeNo())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "작업자를 찾을 수 없습니다."));

        // 이미 등록된 기기인 경우 상태 반환 (재설치 시나리오)
        return deviceRepository.findByHardwareId(dto.getHardwareId()).orElseGet(() -> {
            Device device = Device.builder()
                    .hardwareId(dto.getHardwareId())
                    .deviceName(dto.getDeviceName())
                    .osType(dto.getOsType())
                    .worker(worker)
                    .status(DeviceStatus.PENDING)
                    .build();
            log.info("신규 기기 등록 요청: hardwareId={}, worker={}", dto.getHardwareId(), worker.getEmployeeNo());
            return deviceRepository.save(device);
        });
    }

    @Transactional(readOnly = true)
    public boolean isApprovedDevice(String hardwareId) {
        return deviceRepository.findByHardwareId(hardwareId)
                .map(d -> d.getStatus() == DeviceStatus.APPROVED)
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public List<Device> getPendingDevices() {
        return deviceRepository.findByStatus(DeviceStatus.PENDING);
    }

    @Transactional(readOnly = true)
    public List<Device> getAllDevices() {
        return deviceRepository.findAll();
    }

    @Transactional
    public Device updateDeviceStatus(Long deviceId, DeviceStatus newStatus) {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "기기를 찾을 수 없습니다."));

        device.setStatus(newStatus);
        if (newStatus == DeviceStatus.APPROVED) device.setApprovedAt(LocalDateTime.now());
        if (newStatus == DeviceStatus.REVOKED) device.setRevokedAt(LocalDateTime.now());

        log.info("기기 상태 변경: id={}, status={}", deviceId, newStatus);
        return deviceRepository.save(device);
    }
}
