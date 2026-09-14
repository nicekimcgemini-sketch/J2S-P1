package com.j2s.attendance.repository;

import com.j2s.attendance.entity.Holiday;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface HolidayRepository extends JpaRepository<Holiday, Long> {

    boolean existsByDate(LocalDate date);

    List<Holiday> findByDateBetweenOrderByDateAsc(LocalDate start, LocalDate end);

    List<Holiday> findAllByOrderByDateAsc();
}
