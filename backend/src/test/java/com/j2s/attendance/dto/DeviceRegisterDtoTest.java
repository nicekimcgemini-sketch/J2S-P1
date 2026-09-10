package com.j2s.attendance.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 사번 형식(대문자 S + 숫자 5자리)이 커밋 884d4d0 / f21b607 에서 두 차례 고쳐진 이력이 있어
 * 회귀를 막기 위해 형식 검증만 별도로 고정한다.
 */
class DeviceRegisterDtoTest {

    private static ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void setUp() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void tearDown() {
        factory.close();
    }

    private DeviceRegisterDto dtoWithEmployeeNo(String employeeNo) {
        DeviceRegisterDto dto = new DeviceRegisterDto();
        dto.setHardwareId("hw-1");
        dto.setEmployeeNo(employeeNo);
        dto.setName("홍길동");
        dto.setDeviceName("Galaxy");
        dto.setOsType("ANDROID");
        return dto;
    }

    @ParameterizedTest
    @ValueSource(strings = {"S00001", "S12345", "S99999"})
    void 대문자_S와_숫자_5자리는_통과한다(String employeeNo) {
        Set<ConstraintViolation<DeviceRegisterDto>> violations = validator.validate(dtoWithEmployeeNo(employeeNo));
        assertThat(violations).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"s00001", "S0001", "S000011", "A00001", "S0000A", "S 00001", ""})
    void 형식에_맞지_않으면_거부된다(String employeeNo) {
        Set<ConstraintViolation<DeviceRegisterDto>> violations = validator.validate(dtoWithEmployeeNo(employeeNo));
        assertThat(violations).isNotEmpty();
    }
}
