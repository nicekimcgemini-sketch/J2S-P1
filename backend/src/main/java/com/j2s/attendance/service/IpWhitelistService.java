package com.j2s.attendance.service;

import com.j2s.attendance.repository.IpWhitelistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class IpWhitelistService {

    private final IpWhitelistRepository ipWhitelistRepository;

    @Transactional(readOnly = true)
    public boolean isAllowed(String ipAddress) {
        return ipWhitelistRepository.existsByIpAddress(ipAddress);
    }
}
