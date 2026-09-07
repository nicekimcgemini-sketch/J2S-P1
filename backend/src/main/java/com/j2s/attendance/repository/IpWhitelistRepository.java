package com.j2s.attendance.repository;

import com.j2s.attendance.entity.IpWhitelist;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface IpWhitelistRepository extends JpaRepository<IpWhitelist, Long> {
    Optional<IpWhitelist> findByIpAddress(String ipAddress);
    boolean existsByIpAddress(String ipAddress);
}
