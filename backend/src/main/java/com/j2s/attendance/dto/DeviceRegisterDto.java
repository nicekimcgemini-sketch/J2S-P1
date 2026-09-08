package com.j2s.attendance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class DeviceRegisterDto {

    @NotBlank
    private String hardwareId;

    @NotBlank
    @Pattern(regexp = "^S\\d+$", message = "사번은 대문자 S로 시작해야 합니다.")
    private String employeeNo;   // 작업자 사번 (예: S06098)

    private String deviceName;

    @NotBlank
    private String osType;   // ANDROID, IOS
}
