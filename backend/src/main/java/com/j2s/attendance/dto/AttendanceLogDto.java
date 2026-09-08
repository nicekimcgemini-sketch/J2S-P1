package com.j2s.attendance.dto;

import com.j2s.attendance.entity.AttendanceLog;
import com.j2s.attendance.entity.AttendanceType;
import lombok.Getter;
import java.time.LocalDateTime;

@Getter
public class AttendanceLogDto {
    private Long id;
    private String workerName;
    private String employeeNo;
    private AttendanceType type;
    private LocalDateTime checkedAt;

    public static AttendanceLogDto from(AttendanceLog log) {
        AttendanceLogDto dto = new AttendanceLogDto();
        dto.id = log.getId();
        dto.workerName = log.getWorker().getName();
        dto.employeeNo = log.getWorker().getEmployeeNo();
        dto.type = log.getType();
        dto.checkedAt = log.getCheckedAt();
        return dto;
    }
}
