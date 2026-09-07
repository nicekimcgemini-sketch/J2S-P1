package com.j2s.attendance.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "devices")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Device {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 기기 고유 하드웨어 ID (Android ID / UDID / KeyStore 기반 UUID)
     * 앱 재설치 후에도 동일한 값 유지
     */
    @Column(name = "hardware_id", nullable = false, unique = true)
    private String hardwareId;

    @Column(name = "device_name")
    private String deviceName;

    @Column(name = "os_type")
    private String osType;   // ANDROID, IOS

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DeviceStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "worker_id", nullable = false)
    private Worker worker;

    @Column(name = "registered_at", nullable = false, updatable = false)
    private LocalDateTime registeredAt;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    @PrePersist
    protected void onCreate() {
        registeredAt = LocalDateTime.now();
        if (status == null) status = DeviceStatus.PENDING;
    }
}
