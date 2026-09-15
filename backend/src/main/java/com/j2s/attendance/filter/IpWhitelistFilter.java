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

    private String extractClientIp(HttpServletRequest request) {
        // 프록시/로드밸런서 뒤에 있을 경우 실제 IP 추출
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }
        return request.getRemoteAddr();
    }
}
