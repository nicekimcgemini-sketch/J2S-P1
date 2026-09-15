package com.j2s.attendance.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.j2s.attendance.service.IpWhitelistService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * /api/qr/** 경로는 화이트리스트 IP에서만 접근 허용
 * 현장 지정 PC에서만 QR 화면에 접근하도록 제한
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class IpWhitelistFilter extends OncePerRequestFilter {

    /** 프론트 QR 화면이 오류 종류를 구분하는 코드 */
    public static final String IP_NOT_ALLOWED = "IP_NOT_ALLOWED";

    private static final ObjectMapper JSON = new ObjectMapper();

    private final IpWhitelistService ipWhitelistService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if (request.getRequestURI().startsWith("/api/qr")) {
            String clientIp = extractClientIp(request);
            if (!ipWhitelistService.isAllowed(clientIp)) {
                log.warn("허용되지 않은 IP에서 QR 접근 시도: {}", clientIp);
                // QR 화면이 오류 화면에 이 PC 의 IP 를 보여줘 관리자가 허용 IP 로 등록할 수 있게 한다
                Map<String, String> body = new LinkedHashMap<>();
                body.put("code", IP_NOT_ALLOWED);
                body.put("message", "접근이 허용되지 않은 IP입니다.");
                body.put("ip", clientIp);
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.setCharacterEncoding(StandardCharsets.UTF_8.name());
                response.getWriter().write(JSON.writeValueAsString(body));
                return;
            }
        }
        filterChain.doFilter(request, response);
    }

    /**
     * 접속한 PC 의 실제 공인 IP.
     * Cloud Run 은 클라이언트가 보낸 X-Forwarded-For 뒤에 실제 접속 IP 하나만 덧붙인다
     * (2026-09-15 운영 확인: 헤더 없음 → "223.x.x.x", 가짜 헤더 → "198.51.100.23,223.x.x.x", remoteAddr 는 169.254.x 내부 주소).
     * 앞쪽 값은 누구나 임의로 넣을 수 있어 허용 IP 를 사칭해 우회할 수 있으므로 반드시 맨 뒤 값을 쓴다.
     * X-Real-IP 도 클라이언트가 조작할 수 있어 쓰지 않는다. 앞단에 로드밸런서를 추가하면
     * "<클라이언트 IP>,<로드밸런서 IP>" 가 붙어 맨 뒤가 로드밸런서 IP 가 되므로 이 로직을 다시 맞춰야 한다.
     */
    static String extractClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            String[] hops = xForwardedFor.split(",");
            for (int i = hops.length - 1; i >= 0; i--) {
                String hop = hops[i].trim();
                if (!hop.isEmpty()) {
                    return hop;
                }
            }
        }
        return request.getRemoteAddr();   // 프록시 없이 직접 접속(로컬 개발)
    }
}
