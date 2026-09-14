package com.j2s.attendance.controller;

import com.j2s.attendance.dto.AdminLoginRequestDto;
import com.j2s.attendance.dto.AdminSessionDto;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;

/**
 * 관리자 로그인/세션 확인 API. 로그아웃(POST /api/admin/logout)은 SecurityConfig 의 LogoutFilter 가 처리한다.
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminAuthController {

    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;

    @Value("${server.servlet.session.timeout}")
    private Duration sessionTimeout;

    @PostMapping("/login")
    public ResponseEntity<AdminSessionDto> login(@Valid @RequestBody AdminLoginRequestDto dto,
                                                 HttpServletRequest request,
                                                 HttpServletResponse response) {
        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(dto.getUsername(), dto.getPassword()));
        } catch (AuthenticationException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호가 올바르지 않습니다.");
        }

        // 세션 고정 공격 방지: 로그인 전부터 있던 세션이면 ID 를 새로 발급한다
        if (request.getSession(false) != null) {
            request.changeSessionId();
        }
        HttpSession session = request.getSession(true);
        session.setMaxInactiveInterval((int) sessionTimeout.toSeconds());

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, request, response);

        return ResponseEntity.ok(toDto(authentication, session));
    }

    // 현재 세션이 살아 있는지 확인 (만료됐으면 SecurityConfig 에서 401)
    @GetMapping("/me")
    public ResponseEntity<AdminSessionDto> me(Authentication authentication, HttpServletRequest request) {
        return ResponseEntity.ok(toDto(authentication, request.getSession()));
    }

    private AdminSessionDto toDto(Authentication authentication, HttpSession session) {
        return new AdminSessionDto(authentication.getName(), session.getMaxInactiveInterval());
    }
}
