package com.j2s.attendance.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class DeviceRegisterDto {

    @NotBlank
    private String hardwareId;

    @NotBlank
    private String employeeNo;   // 작업자 사번

    private String deviceName;

    @NotBlank
    private String osType;   // ANDROID, IOS
}
