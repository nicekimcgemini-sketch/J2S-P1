package com.j2s.attendance;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * 스프링 컨텍스트가 정상적으로 뜨는지만 확인하는 최소 회귀 테스트.
 * 빈 배선(WebConfig의 app.cors.allowed-origins 등 필수 프로퍼티)이 깨지면 여기서 바로 드러난다.
 */
@SpringBootTest
@ActiveProfiles("test")
class AttendanceApplicationTests {

    @Test
    void contextLoads() {
    }
}
