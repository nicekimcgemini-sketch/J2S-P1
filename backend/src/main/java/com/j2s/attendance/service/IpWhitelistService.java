package com.j2s.attendance.service;

import com.j2s.attendance.entity.IpWhitelist;
import com.j2s.attendance.repository.IpWhitelistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class IpWhitelistService {

    private final IpWhitelistRepository ipWhitelistRepository;

    @Transactional(readOnly = true)
    public boolean isAllowed(String ipAddress) {
        return ipWhitelistRepository.existsByIpAddress(ipAddress);
    }

    @Transactional(readOnly = true)
    public List<IpWhitelist> getAll() {
        return ipWhitelistRepository.findAll();
    }

    @Transactional
    public IpWhitelist add(String ipAddress, String description) {
        if (ipWhitelistRepository.existsByIpAddress(ipAddress)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 등록된 IP입니다.");
        }
        IpWhitelist entry = IpWhitelist.builder()
                .ipAddress(ipAddress)
                .description(description)
                .build();
        return ipWhitelistRepository.save(entry);
    }

    @Transactional
    public void remove(Long id) {
        if (!ipWhitelistRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "존재하지 않는 IP입니다.");
        }
        ipWhitelistRepository.deleteById(id);
    }
}
