package com.j2s.attendance.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

/**
 * "오늘" 판단을 테스트에서 고정할 수 있도록 Clock 을 빈으로 둔다.
 * 운영은 JVM 기본 시간대(Dockerfile 의 Asia/Seoul)를 따른다.
 */
@Configuration
public class TimeConfig {

    @Bean
    public Clock clock() {
        return Clock.systemDefaultZone();
    }
}
