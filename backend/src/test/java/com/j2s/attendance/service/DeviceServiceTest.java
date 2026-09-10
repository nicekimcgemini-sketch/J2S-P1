package com.j2s.attendance.service;

import com.j2s.attendance.dto.DeviceRegisterDto;
import com.j2s.attendance.entity.Device;
import com.j2s.attendance.entity.DeviceStatus;
import com.j2s.attendance.entity.Worker;
import com.j2s.attendance.repository.DeviceRepository;
import com.j2s.attendance.repository.WorkerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/**
 * 기기 등록/승인 흐름의 분기(신규 작업자 자가 생성, 재설치 시나리오, 중복 신청 차단)를 고정한다.
 */
@ExtendWith(MockitoExtension.class)
class DeviceServiceTest {

    @Mock
    private DeviceRepository deviceRepository;
    @Mock
    private WorkerRepository workerRepository;

    private DeviceService deviceService;

    @BeforeEach
    void setUp() {
        deviceService = new DeviceService(deviceRepository, workerRepository);
    }

    private DeviceRegisterDto dto(String hardwareId, String employeeNo) {
        DeviceRegisterDto d = new DeviceRegisterDto();
        d.setHardwareId(hardwareId);
        d.setEmployeeNo(employeeNo);
        d.setName("홍길동");
        d.setDeviceName("Galaxy");
        d.setOsType("ANDROID");
        return d;
    }

    @Test
    void registerDevice_신규_사번이면_작업자를_새로_생성한다() {
        DeviceRegisterDto request = dto("hw-1", "S00001");
        when(workerRepository.findByEmployeeNo("S00001")).thenReturn(Optional.empty());
        when(workerRepository.save(any(Worker.class))).thenAnswer(inv -> {
            Worker w = inv.getArgument(0);
            w.setId(1L);
            return w;
        });
        when(deviceRepository.findByHardwareId("hw-1")).thenReturn(Optional.empty());
        when(deviceRepository.findByWorkerIdAndStatus(eq(1L), any())).thenReturn(Collections.emptyList());
        when(deviceRepository.save(any(Device.class))).thenAnswer(inv -> inv.getArgument(0));

        Device result = deviceService.registerDevice(request);

        verify(workerRepository).save(any(Worker.class));
        assertThat(result.getStatus()).isEqualTo(DeviceStatus.PENDING);
        assertThat(result.getWorker().getEmployeeNo()).isEqualTo("S00001");
    }

    @Test
    void registerDevice_이미_등록된_hardwareId면_기존_기기를_그대로_반환한다() {
        Worker worker = Worker.builder().id(1L).employeeNo("S00001").name("홍길동").build();
        Device existing = Device.builder().id(5L).hardwareId("hw-1").status(DeviceStatus.APPROVED).worker(worker).build();

        when(workerRepository.findByEmployeeNo("S00001")).thenReturn(Optional.of(worker));
        when(deviceRepository.findByHardwareId("hw-1")).thenReturn(Optional.of(existing));

        Device result = deviceService.registerDevice(dto("hw-1", "S00001"));

        assertThat(result).isSameAs(existing);
        verify(deviceRepository, never()).save(any());
    }

    @Test
    void registerDevice_같은_사번에_승인대기_기기가_있으면_409() {
        Worker worker = Worker.builder().id(1L).employeeNo("S00001").name("홍길동").build();
        Device pending = Device.builder().id(2L).hardwareId("hw-old").status(DeviceStatus.PENDING).worker(worker).build();

        when(workerRepository.findByEmployeeNo("S00001")).thenReturn(Optional.of(worker));
        when(deviceRepository.findByHardwareId("hw-new")).thenReturn(Optional.empty());
        when(deviceRepository.findByWorkerIdAndStatus(1L, DeviceStatus.PENDING)).thenReturn(List.of(pending));

        assertThatThrownBy(() -> deviceService.registerDevice(dto("hw-new", "S00001")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("409");
    }

    @Test
    void registerDevice_같은_사번에_승인된_기기가_있으면_409() {
        Worker worker = Worker.builder().id(1L).employeeNo("S00001").name("홍길동").build();
        Device approved = Device.builder().id(2L).hardwareId("hw-old").status(DeviceStatus.APPROVED).worker(worker).build();

        when(workerRepository.findByEmployeeNo("S00001")).thenReturn(Optional.of(worker));
        when(deviceRepository.findByHardwareId("hw-new")).thenReturn(Optional.empty());
        when(deviceRepository.findByWorkerIdAndStatus(1L, DeviceStatus.PENDING)).thenReturn(Collections.emptyList());
        when(deviceRepository.findByWorkerIdAndStatus(1L, DeviceStatus.APPROVED)).thenReturn(List.of(approved));

        assertThatThrownBy(() -> deviceService.registerDevice(dto("hw-new", "S00001")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("409");
    }

    @Test
    void updateDeviceStatus_APPROVED로_바꾸면_승인시각이_기록된다() {
        Worker worker = Worker.builder().id(1L).employeeNo("S00001").name("홍길동").build();
        Device device = Device.builder().id(9L).hardwareId("hw-1").status(DeviceStatus.PENDING).worker(worker).build();
        when(deviceRepository.findByIdWithWorker(9L)).thenReturn(Optional.of(device));
        when(deviceRepository.save(any(Device.class))).thenAnswer(inv -> inv.getArgument(0));

        Device result = deviceService.updateDeviceStatus(9L, DeviceStatus.APPROVED);

        assertThat(result.getStatus()).isEqualTo(DeviceStatus.APPROVED);
        assertThat(result.getApprovedAt()).isNotNull();
    }

    @Test
    void deleteDevice_출퇴근_기록이_있으면_409로_변환된다() {
        when(deviceRepository.existsById(9L)).thenReturn(true);
        doThrow(new DataIntegrityViolationException("fk violation")).when(deviceRepository).deleteById(9L);

        assertThatThrownBy(() -> deviceService.deleteDevice(9L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("409");
    }

    @Test
    void deleteDevice_존재하지_않으면_404() {
        when(deviceRepository.existsById(99L)).thenReturn(false);

        assertThatThrownBy(() -> deviceService.deleteDevice(99L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("404");

        verify(deviceRepository, never()).deleteById(any());
    }
}
