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
    @Pattern(regexp = "^S\\d{5}$", message = "사번 형식이 올바르지 않습니다. 대문자 S와 숫자 5자리, 총 6자리로 입력해주세요. (예: S06098)")
    private String employeeNo;   // 작업자 사번 (형식: S + 숫자 5자리, 예: S06098)

    private String deviceName;

    @NotBlank
    private String osType;   // ANDROID, IOS
}
