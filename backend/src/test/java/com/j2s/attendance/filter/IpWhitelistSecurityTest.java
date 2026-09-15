package com.j2s.attendance.filter;

import com.j2s.attendance.config.SecurityConfig;
import com.j2s.attendance.controller.QrController;
import com.j2s.attendance.service.IpWhitelistService;
import com.j2s.attendance.service.QrService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 허용되지 않은 IP 의 QR 요청이 보안 필터 체인에서 403 으로 막힐 때,
 * 다른 도메인의 QR 화면이 그 응답을 읽어 오류 화면을 보여줄 수 있어야 한다 (CORS 헤더 · UTF-8 JSON · 접속 IP).
 */
@WebMvcTest(controllers = QrController.class)
@Import(SecurityConfig.class)
@ActiveProfiles("test")
class IpWhitelistSecurityTest {

    private static final String FRONT_ORIGIN = "http://localhost:5173";   // application-test.yml 의 허용 origin

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private IpWhitelistService ipWhitelistService;
    @MockBean
    private QrService qrService;

    @Test
    void 허용되지_않은_IP의_QR_요청은_CORS_헤더와_함께_403_JSON으로_거부된다() throws Exception {
        when(ipWhitelistService.isAllowed(anyString())).thenReturn(false);

        mockMvc.perform(get("/api/qr/generate")
                        .header("Origin", FRONT_ORIGIN)
                        .with(req -> { req.setRemoteAddr("203.0.113.7"); return req; }))
                .andExpect(status().isForbidden())
                .andExpect(header().string("Access-Control-Allow-Origin", FRONT_ORIGIN))
                .andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(content().encoding("UTF-8"))
                .andExpect(jsonPath("$.code").value("IP_NOT_ALLOWED"))
                .andExpect(jsonPath("$.ip").value("203.0.113.7"))
                .andExpect(jsonPath("$.message").value("접근이 허용되지 않은 IP입니다."));
    }
}
