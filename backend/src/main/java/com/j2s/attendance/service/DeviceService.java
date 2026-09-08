package com.j2s.attendance.service;

import com.j2s.attendance.dto.DeviceRegisterDto;
import com.j2s.attendance.entity.Device;
import com.j2s.attendance.entity.DeviceStatus;
import com.j2s.attendance.entity.Worker;
import com.j2s.attendance.repository.DeviceRepository;
import com.j2s.attendance.repository.WorkerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

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

        // 이미 등록된 기기(같은 hardwareId)인 경우 상태 그대로 반환 (재설치/재조회 시나리오)
        Optional<Device> existingByHardwareId = deviceRepository.findByHardwareId(dto.getHardwareId());
        if (existingByHardwareId.isPresent()) {
            return existingByHardwareId.get();
        }

        // 같은 사번으로 다른 기기가 이미 대기중이거나 승인된 경우 중복 신청 차단
        boolean hasPending = !deviceRepository.findByWorkerIdAndStatus(worker.getId(), DeviceStatus.PENDING).isEmpty();
        boolean hasApproved = !deviceRepository.findByWorkerIdAndStatus(worker.getId(), DeviceStatus.APPROVED).isEmpty();
        if (hasPending) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 승인 대기 중인 기기가 있습니다.");
        }
        if (hasApproved) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 승인된 기기가 있습니다.");
        }

        Device device = Device.builder()
                .hardwareId(dto.getHardwareId())
                .deviceName(dto.getDeviceName())
                .osType(dto.getOsType())
                .worker(worker)
                .status(DeviceStatus.PENDING)
                .build();
        log.info("신규 기기 등록 요청: hardwareId={}, worker={}", dto.getHardwareId(), worker.getEmployeeNo());
        return deviceRepository.save(device);
    }

    @Transactional(readOnly = true)
    public Optional<Device> findByHardwareId(String hardwareId) {
        return deviceRepository.findByHardwareId(hardwareId);
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
        return deviceRepository.findAllWithWorker();
    }

    @Transactional
    public Device updateDeviceStatus(Long deviceId, DeviceStatus newStatus) {
        Device device = deviceRepository.findByIdWithWorker(deviceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "기기를 찾을 수 없습니다."));

        device.setStatus(newStatus);
        if (newStatus == DeviceStatus.APPROVED) device.setApprovedAt(LocalDateTime.now());
        if (newStatus == DeviceStatus.REVOKED) device.setRevokedAt(LocalDateTime.now());

        log.info("기기 상태 변경: id={}, status={}", deviceId, newStatus);
        return deviceRepository.save(device);
    }

    @Transactional
    public void deleteDevice(Long deviceId) {
        if (!deviceRepository.existsById(deviceId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "기기를 찾을 수 없습니다.");
        }
        try {
            deviceRepository.deleteById(deviceId);
            deviceRepository.flush();
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "출퇴근 기록이 있는 기기는 삭제할 수 없습니다. 권한 회수를 이용해주세요.");
        }
        log.info("기기 삭제: id={}", deviceId);
    }
}
