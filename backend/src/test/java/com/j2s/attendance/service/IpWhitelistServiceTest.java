package com.j2s.attendance.service;

import com.j2s.attendance.entity.IpWhitelist;
import com.j2s.attendance.repository.IpWhitelistRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class IpWhitelistServiceTest {

    @Mock
    private IpWhitelistRepository ipWhitelistRepository;

    private IpWhitelistService ipWhitelistService;

    @BeforeEach
    void setUp() {
        ipWhitelistService = new IpWhitelistService(ipWhitelistRepository);
    }

    @Test
    void isAllowed_등록된_IP만_true() {
        when(ipWhitelistRepository.existsByIpAddress("192.168.0.10")).thenReturn(true);
        when(ipWhitelistRepository.existsByIpAddress("1.2.3.4")).thenReturn(false);

        assertThat(ipWhitelistService.isAllowed("192.168.0.10")).isTrue();
        assertThat(ipWhitelistService.isAllowed("1.2.3.4")).isFalse();
    }

    @Test
    void add_중복_IP는_409() {
        when(ipWhitelistRepository.existsByIpAddress("192.168.0.10")).thenReturn(true);

        assertThatThrownBy(() -> ipWhitelistService.add("192.168.0.10", "현장 PC"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("409");

        verify(ipWhitelistRepository, never()).save(any());
    }

    @Test
    void remove_존재하지_않으면_404() {
        when(ipWhitelistRepository.existsById(1L)).thenReturn(false);

        assertThatThrownBy(() -> ipWhitelistService.remove(1L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("404");

        verify(ipWhitelistRepository, never()).deleteById(any());
    }

    @Test
    void remove_존재하면_삭제된다() {
        when(ipWhitelistRepository.existsById(1L)).thenReturn(true);

        ipWhitelistService.remove(1L);

        verify(ipWhitelistRepository).deleteById(1L);
    }
}
