package com.j2s.attendance.controller;

import com.j2s.attendance.config.SecurityConfig;
import com.j2s.attendance.service.AttendanceService;
import com.j2s.attendance.service.DeviceService;
import com.j2s.attendance.service.IpWhitelistService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 관리자 세션 로그인/로그아웃과 /api/admin/** 접근 제어를 확인하는 보안 슬라이스 테스트.
 */
@WebMvcTest(controllers = {AdminAuthController.class, AdminController.class})
@Import(SecurityConfig.class)
@ActiveProfiles("test")
class AdminAuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private IpWhitelistService ipWhitelistService;
    @MockBean
    private DeviceService deviceService;
    @MockBean
    private AttendanceService attendanceService;

    private MockHttpSession login() throws Exception {
        return (MockHttpSession) mockMvc.perform(post("/api/admin/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"admin1234\"}"))
                .andExpect(status().isOk())
                .andReturn().getRequest().getSession(false);
    }

    @Test
    void 로그인하지_않으면_관리자_API는_401이고_Basic_로그인창을_띄우지_않는다() throws Exception {
        mockMvc.perform(get("/api/admin/devices"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().doesNotExist("WWW-Authenticate"));
    }

    @Test
    void 비밀번호가_틀리면_401이고_세션이_만들어지지_않는다() throws Exception {
        var result = mockMvc.perform(post("/api/admin/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized())
                .andReturn();

        assertThat(result.getRequest().getSession(false)).isNull();
    }

    @Test
    void Basic_인증_헤더로는_더이상_관리자_API에_접근할_수_없다() throws Exception {
        mockMvc.perform(get("/api/admin/devices").header("Authorization", "Basic YWRtaW46YWRtaW4xMjM0"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void 로그인하면_세션_유휴시간이_10분으로_설정되고_세션으로_관리자_API에_접근한다() throws Exception {
        MockHttpSession session = login();
        assertThat(session.getMaxInactiveInterval()).isEqualTo(600);
        when(deviceService.getAllDevices()).thenReturn(List.of());

        mockMvc.perform(get("/api/admin/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("admin"))
                .andExpect(jsonPath("$.sessionTimeoutSeconds").value(600));
        mockMvc.perform(get("/api/admin/devices").session(session))
                .andExpect(status().isOk());
    }

    @Test
    void 로그인_전_세션이_있었으면_세션_ID를_새로_발급한다() throws Exception {
        MockHttpSession before = new MockHttpSession();
        String oldId = before.getId();

        var result = mockMvc.perform(post("/api/admin/login").session(before)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"admin1234\"}"))
                .andExpect(status().isOk())
                .andReturn();

        assertThat(result.getRequest().getSession(false).getId()).isNotEqualTo(oldId);
    }

    @Test
    void 로그아웃하면_세션이_무효화되어_이후_요청은_401() throws Exception {
        MockHttpSession session = login();

        mockMvc.perform(post("/api/admin/logout").session(session))
                .andExpect(status().isNoContent());

        assertThat(session.isInvalid()).isTrue();
        mockMvc.perform(get("/api/admin/me").session(session))
                .andExpect(status().isUnauthorized());
    }
}
