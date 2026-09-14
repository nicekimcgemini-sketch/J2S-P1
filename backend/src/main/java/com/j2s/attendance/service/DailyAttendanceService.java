package com.j2s.attendance.service;

import com.j2s.attendance.dto.AttendanceFlag;
import com.j2s.attendance.dto.DailyAttendanceDto;
import com.j2s.attendance.dto.DailyStatus;
import com.j2s.attendance.entity.AttendanceLog;
import com.j2s.attendance.entity.AttendanceType;
import com.j2s.attendance.entity.Device;
import com.j2s.attendance.entity.Worker;
import com.j2s.attendance.repository.AttendanceLogRepository;
import com.j2s.attendance.repository.DeviceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 출퇴근 기록을 작업자 × 날짜로 묶어 하루 근태 상태를 판정한다.
 *
 * 결근 판정 대상("그날 출근해야 했던 작업자")은 그날 승인 상태였던 기기를 가진 작업자다
 * (approvedAt 이 그날 이전·당일이고, 해제되지 않았거나 그날 이후 해제). 기록이 있는 작업자는 항상 포함한다.
 * 기기가 삭제된 작업자는 기록이 없는 날을 결근으로 잡을 수 없다.
 * 주말·등록된 휴일(HolidayService)은 근무일이 아니므로 기록이 있을 때만 행을 만들고 지각/조퇴/야근을 판정하지 않는다.
 */
@Service
@RequiredArgsConstructor
public class DailyAttendanceService {

    static final int MAX_RANGE_DAYS = 366;

    private final AttendanceLogRepository attendanceLogRepository;
    private final DeviceRepository deviceRepository;
    private final WorkHourPolicy workHourPolicy;
    private final HolidayService holidayService;
    private final Clock clock;

    @Transactional(readOnly = true)
    public List<DailyAttendanceDto> getDailySummary(LocalDate startDate, LocalDate endDate, String employeeNo, String name) {
        if (endDate.isBefore(startDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "종료일이 시작일보다 빠릅니다.");
        }
        if (ChronoUnit.DAYS.between(startDate, endDate) >= MAX_RANGE_DAYS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "조회 기간은 최대 1년입니다.");
        }

        LocalDate today = LocalDate.now(clock);
        LocalDate lastDay = endDate.isAfter(today) ? today : endDate;   // 미래 날짜는 판정하지 않는다
        if (lastDay.isBefore(startDate)) {
            return List.of();
        }

        String normalizedEmployeeNo = (employeeNo == null || employeeNo.isBlank()) ? null : employeeNo.trim();
        String normalizedName = (name == null || name.isBlank()) ? null : name.trim();

        List<AttendanceLog> logs = attendanceLogRepository.search(
                startDate.atStartOfDay(), lastDay.atTime(LocalTime.MAX), normalizedEmployeeNo, normalizedName);

        // 작업자 → 날짜 → 그날 첫 출근 / 마지막 퇴근
        Map<String, Worker> workers = new LinkedHashMap<>();
        Map<String, Map<LocalDate, DayLogs>> byWorker = new HashMap<>();
        for (AttendanceLog log : logs) {
            Worker worker = log.getWorker();
            workers.putIfAbsent(worker.getEmployeeNo(), worker);
            byWorker.computeIfAbsent(worker.getEmployeeNo(), k -> new HashMap<>())
                    .computeIfAbsent(log.getCheckedAt().toLocalDate(), k -> new DayLogs())
                    .add(log);
        }

        Map<LocalDate, String> holidays = holidayService.getHolidayNames(startDate, lastDay);

        List<Device> devices = deviceRepository.findAllWithWorker().stream()
                .filter(d -> d.getApprovedAt() != null)
                .filter(d -> matches(d.getWorker(), normalizedEmployeeNo, normalizedName))
                .toList();
        devices.forEach(d -> workers.putIfAbsent(d.getWorker().getEmployeeNo(), d.getWorker()));

        List<DailyAttendanceDto> rows = new ArrayList<>();
        for (LocalDate date = startDate; !date.isAfter(lastDay); date = date.plusDays(1)) {
            for (Worker worker : workers.values()) {
                DayLogs day = byWorker.getOrDefault(worker.getEmployeeNo(), Map.of()).get(date);
                if (day == null && !isExpectedToWork(worker, date, devices, holidays)) {
                    continue;
                }
                rows.add(summarize(worker, date, day, today, holidays));
            }
        }

        rows.sort(Comparator.comparing(DailyAttendanceDto::date).reversed()
                .thenComparing(DailyAttendanceDto::workerName));
        return rows;
    }

    private DailyAttendanceDto summarize(Worker worker, LocalDate date, DayLogs day, LocalDate today,
                                         Map<LocalDate, String> holidays) {
        LocalDateTime in = day == null ? null : day.checkIn;
        LocalDateTime out = day == null ? null : day.checkOut;
        boolean weekend = isWeekend(date);
        String holidayName = holidays.get(date);
        boolean isToday = date.equals(today);
        List<DailyStatus> statuses = new ArrayList<>();

        if (weekend) {
            statuses.add(DailyStatus.WEEKEND_WORK);   // 주말·휴일은 기록이 있을 때만 행이 만들어진다
        } else if (holidayName != null) {
            statuses.add(DailyStatus.HOLIDAY_WORK);
        } else if (in == null && out == null) {
            statuses.add(isToday ? DailyStatus.NOT_YET : DailyStatus.ABSENT);
        } else {
            if (in == null) {
                statuses.add(DailyStatus.MISSING_CHECK_IN);
            } else if (workHourPolicy.classify(AttendanceType.CHECK_IN, in, holidays.keySet()) == AttendanceFlag.LATE) {
                statuses.add(DailyStatus.LATE);
            }

            if (out == null) {
                statuses.add(isToday ? DailyStatus.WORKING : DailyStatus.MISSING_CHECK_OUT);
            } else {
                AttendanceFlag outFlag = workHourPolicy.classify(AttendanceType.CHECK_OUT, out, holidays.keySet());
                if (outFlag == AttendanceFlag.EARLY_LEAVE) statuses.add(DailyStatus.EARLY_LEAVE);
                if (outFlag == AttendanceFlag.OVERTIME) statuses.add(DailyStatus.OVERTIME);
            }

            if (statuses.isEmpty()) {
                statuses.add(DailyStatus.NORMAL);
            }
        }

        Long workMinutes = null;
        Long breakMinutes = null;
        if (in != null && out != null && out.isAfter(in)) {
            breakMinutes = workHourPolicy.breakMinutes(in, out);
            workMinutes = Duration.between(in, out).toMinutes() - breakMinutes;
        }
        return new DailyAttendanceDto(date, worker.getName(), worker.getEmployeeNo(), in, out,
                workMinutes, breakMinutes, holidayName, statuses);
    }

    /** 근무일(평일·비휴일)이고, 그날 승인 상태인 기기를 가진 작업자만 기록이 없을 때 결근/미출근 행을 만든다 */
    private boolean isExpectedToWork(Worker worker, LocalDate date, List<Device> devices, Map<LocalDate, String> holidays) {
        if (!workHourPolicy.isWorkday(date, holidays.keySet())) {
            return false;
        }
        return devices.stream()
                .filter(d -> d.getWorker().getEmployeeNo().equals(worker.getEmployeeNo()))
                .anyMatch(d -> !d.getApprovedAt().toLocalDate().isAfter(date)
                        && (d.getRevokedAt() == null || d.getRevokedAt().toLocalDate().isAfter(date)));
    }

    private static boolean matches(Worker worker, String employeeNo, String name) {
        if (employeeNo != null && !employeeNo.equals(worker.getEmployeeNo())) {
            return false;
        }
        return name == null || worker.getName().toLowerCase().contains(name.toLowerCase());
    }

    private static boolean isWeekend(LocalDate date) {
        return date.getDayOfWeek() == DayOfWeek.SATURDAY || date.getDayOfWeek() == DayOfWeek.SUNDAY;
    }

    /** 하루치 기록 중 가장 이른 출근과 가장 늦은 퇴근만 쓴다 */
    private static class DayLogs {
        LocalDateTime checkIn;
        LocalDateTime checkOut;

        void add(AttendanceLog log) {
            LocalDateTime at = log.getCheckedAt();
            if (log.getType() == AttendanceType.CHECK_IN) {
                if (checkIn == null || at.isBefore(checkIn)) checkIn = at;
            } else if (checkOut == null || at.isAfter(checkOut)) {
                checkOut = at;
            }
        }
    }
}
