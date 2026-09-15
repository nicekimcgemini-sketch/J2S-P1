package com.j2s.attendance.filter;

import com.j2s.attendance.service.IpWhitelistService;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * /api/qr/** 만 IP 화이트리스트로 막고, 그 외 경로는 필터를 그냥 통과시키는지 확인한다.
 * 실제 서블릿 컨테이너/스프링 컨텍스트 없이 필터 객체를 직접 호출하는 순수 단위 테스트.
 */
@ExtendWith(MockitoExtension.class)
class IpWhitelistFilterTest {

    @Mock
    private IpWhitelistService ipWhitelistService;
    @Mock
    private FilterChain filterChain;

    private IpWhitelistFilter filter;

    @BeforeEach
    void setUp() {
        filter = new IpWhitelistFilter(ipWhitelistService);
    }

    @Test
    void qr경로가_아니면_IP검사_없이_통과한다() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/attendance/check-in");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        verify(ipWhitelistService, never()).isAllowed(anyString());
    }

    @Test
    void 허용된_IP는_qr경로를_통과한다() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/qr/generate");
        request.setRemoteAddr("192.168.0.10");
        MockHttpServletResponse response = new MockHttpServletResponse();
        when(ipWhitelistService.isAllowed("192.168.0.10")).thenReturn(true);

        filter.doFilter(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
    }

    @Test
    void 허용되지_않은_IP는_403이고_체인이_호출되지_않는다() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/qr/generate");
        request.setRemoteAddr("1.2.3.4");
        MockHttpServletResponse response = new MockHttpServletResponse();
        when(ipWhitelistService.isAllowed("1.2.3.4")).thenReturn(false);

        filter.doFilter(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getContentType()).startsWith("application/json");
        assertThat(response.getContentAsString()).contains("\"code\":\"IP_NOT_ALLOWED\"").contains("\"ip\":\"1.2.3.4\"");
        verify(filterChain, never()).doFilter(request, response);
    }

    @Test
    void X_Forwarded_For_는_Cloud_Run이_맨_뒤에_붙인_실제_접속_IP로_검사한다() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/qr/generate");
        request.setRemoteAddr("169.254.169.126"); // Cloud Run 내부 주소 (실제 클라이언트 아님)
        request.addHeader("X-Forwarded-For", "198.51.100.23, 203.0.113.5");
        MockHttpServletResponse response = new MockHttpServletResponse();
        when(ipWhitelistService.isAllowed("203.0.113.5")).thenReturn(true);

        filter.doFilter(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        verify(ipWhitelistService, never()).isAllowed("198.51.100.23");
    }

    @Test
    void X_Forwarded_For_앞에_허용_IP를_끼워_넣어도_우회할_수_없다() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/qr/generate");
        request.setRemoteAddr("169.254.169.126");
        request.addHeader("X-Forwarded-For", "192.168.0.10,1.2.3.4");   // 192.168.0.10 = 허용 IP 사칭
        MockHttpServletResponse response = new MockHttpServletResponse();
        when(ipWhitelistService.isAllowed("1.2.3.4")).thenReturn(false);

        filter.doFilter(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getContentAsString()).contains("\"ip\":\"1.2.3.4\"");
        verify(ipWhitelistService, never()).isAllowed("192.168.0.10");
        verify(filterChain, never()).doFilter(request, response);
    }

    @Test
    void X_Real_IP_헤더는_조작_가능하므로_무시한다() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/qr/generate");
        request.setRemoteAddr("1.2.3.4");
        request.addHeader("X-Real-IP", "192.168.0.10");
        MockHttpServletResponse response = new MockHttpServletResponse();
        when(ipWhitelistService.isAllowed("1.2.3.4")).thenReturn(false);

        filter.doFilter(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(403);
        verify(ipWhitelistService, never()).isAllowed("192.168.0.10");
    }
}
