package com.j2s.attendance.config;

import com.j2s.attendance.filter.IpWhitelistFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
import org.springframework.security.web.context.DelegatingSecurityContextRepository;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.RequestAttributeSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.savedrequest.NullRequestCache;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;

/**
 * 관리자 인증은 서버 세션 기반이다.
 * POST /api/admin/login 으로 로그인하면 세션(Spring Session JDBC, 쿠키 J2S_ADMIN_SESSION)에 인증 정보가 저장되고,
 * server.servlet.session.timeout(기본 10분) 동안 관리자 API 요청이 없으면 세션이 만료돼 자동 로그아웃된다.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final IpWhitelistFilter ipWhitelistFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, SecurityContextRepository securityContextRepository) throws Exception {
        http
            // 세션 쿠키가 SameSite=Strict 라 다른 사이트에서 쿠키를 실어 보낼 수 없어 CSRF 토큰은 쓰지 않는다
            .csrf(csrf -> csrf.disable())
            .securityContext(sc -> sc.securityContextRepository(securityContextRepository))
            // 미인증 요청을 세션에 저장해 두지 않는다 (익명 요청마다 세션 행이 생기는 것 방지)
            .requestCache(rc -> rc.requestCache(new NullRequestCache()))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/error").permitAll()                   // 에러 응답 렌더링용 내부 forward (없으면 401로 가려짐)
                .requestMatchers("/api/devices/**").permitAll()          // 기기 등록/상태조회는 인증 불필요
                .requestMatchers("/api/attendance/**").permitAll()       // 출퇴근 체크는 기기ID로 검증
                .requestMatchers("/api/qr/**").permitAll()               // QR 생성은 IP 필터로 제어
                .requestMatchers(HttpMethod.POST, "/api/admin/login").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            // Basic 인증을 쓰지 않으므로 WWW-Authenticate 헤더 없이 401 만 돌려준다 (브라우저 기본 로그인 창 방지)
            .exceptionHandling(ex -> ex.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
            .logout(logout -> logout
                .logoutRequestMatcher(new AntPathRequestMatcher("/api/admin/logout", "POST"))
                .logoutSuccessHandler(new HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT))
            )
            .addFilterBefore(ipWhitelistFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public SecurityContextRepository securityContextRepository() {
        return new DelegatingSecurityContextRepository(
                new RequestAttributeSecurityContextRepository(),
                new HttpSessionSecurityContextRepository());
    }

    @Bean
    public AuthenticationManager authenticationManager(UserDetailsService userDetailsService, PasswordEncoder encoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(encoder);
        return new ProviderManager(provider);
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // TODO: 운영 환경에서는 DB 기반 UserDetailsService로 교체
    @Bean
    public UserDetailsService userDetailsService(PasswordEncoder encoder) {
        var admin = User.builder()
                .username("admin")
                .password(encoder.encode("admin1234"))
                .roles("ADMIN")
                .build();
        return new InMemoryUserDetailsManager(admin);
    }
}
