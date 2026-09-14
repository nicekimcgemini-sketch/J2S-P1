package com.j2s.attendance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter @Setter
public class HolidayRequestDto {

    @NotNull(message = "날짜를 입력해주세요.")
    private LocalDate date;

    @NotBlank(message = "휴일 이름을 입력해주세요.")
    @Size(max = 50, message = "휴일 이름은 50자 이내로 입력해주세요.")
    private String name;
}
