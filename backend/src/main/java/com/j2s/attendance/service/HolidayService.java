package com.j2s.attendance.service;

import com.j2s.attendance.entity.Holiday;
import com.j2s.attendance.repository.HolidayRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class HolidayService {

    private final HolidayRepository holidayRepository;

    /** year 가 null 이면 전체 */
    @Transactional(readOnly = true)
    public List<Holiday> getAll(Integer year) {
        if (year == null) {
            return holidayRepository.findAllByOrderByDateAsc();
        }
        return holidayRepository.findByDateBetweenOrderByDateAsc(LocalDate.of(year, 1, 1), LocalDate.of(year, 12, 31));
    }

    /** 기간 안의 휴일 날짜 → 이름 */
    @Transactional(readOnly = true)
    public Map<LocalDate, String> getHolidayNames(LocalDate start, LocalDate end) {
        Map<LocalDate, String> names = new LinkedHashMap<>();
        holidayRepository.findByDateBetweenOrderByDateAsc(start, end).forEach(h -> names.put(h.getDate(), h.getName()));
        return names;
    }

    @Transactional
    public Holiday add(LocalDate date, String name) {
        if (holidayRepository.existsByDate(date)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 등록된 날짜입니다.");
        }
        return holidayRepository.save(Holiday.builder().date(date).name(name.trim()).build());
    }

    @Transactional
    public void remove(Long id) {
        if (!holidayRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "존재하지 않는 휴일입니다.");
        }
        holidayRepository.deleteById(id);
    }
}
