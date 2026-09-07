package com.j2s.attendance.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class AttendanceRequestDto {

    @NotBlank
    private String qrToken;

    @NotBlank
    private String hardwareId;   // 기기 하드웨어 ID (승인 여부 서버에서 확인)
}
