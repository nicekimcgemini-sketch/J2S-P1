package com.j2s.attendance.service;

import com.j2s.attendance.entity.Holiday;
import com.j2s.attendance.repository.HolidayRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HolidayServiceTest {

    @Mock
    private HolidayRepository holidayRepository;

    private HolidayService holidayService;

    @BeforeEach
    void setUp() {
        holidayService = new HolidayService(holidayRepository);
    }

    @Test
    void getAll_연도를_주면_그해_1월1일부터_12월31일까지_조회한다() {
        when(holidayRepository.findByDateBetweenOrderByDateAsc(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31)))
                .thenReturn(List.of());

        holidayService.getAll(2026);

        verify(holidayRepository).findByDateBetweenOrderByDateAsc(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31));
    }

    @Test
    void getHolidayNames_날짜와_이름으로_묶는다() {
        when(holidayRepository.findByDateBetweenOrderByDateAsc(any(), any())).thenReturn(List.of(
                Holiday.builder().date(LocalDate.of(2026, 9, 24)).name("추석 연휴").build(),
                Holiday.builder().date(LocalDate.of(2026, 9, 25)).name("추석").build()));

        var names = holidayService.getHolidayNames(LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 30));

        assertThat(names).containsEntry(LocalDate.of(2026, 9, 25), "추석").hasSize(2);
    }

    @Test
    void add_같은_날짜가_있으면_409() {
        when(holidayRepository.existsByDate(LocalDate.of(2026, 9, 25))).thenReturn(true);

        assertThatThrownBy(() -> holidayService.add(LocalDate.of(2026, 9, 25), "추석"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("409");

        verify(holidayRepository, never()).save(any());
    }

    @Test
    void add_이름_앞뒤_공백을_지우고_저장한다() {
        when(holidayRepository.existsByDate(any())).thenReturn(false);
        when(holidayRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        holidayService.add(LocalDate.of(2026, 10, 9), "  한글날 ");

        ArgumentCaptor<Holiday> captor = ArgumentCaptor.forClass(Holiday.class);
        verify(holidayRepository).save(captor.capture());
        assertThat(captor.getValue().getName()).isEqualTo("한글날");
    }

    @Test
    void remove_존재하지_않으면_404() {
        when(holidayRepository.existsById(1L)).thenReturn(false);

        assertThatThrownBy(() -> holidayService.remove(1L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("404");

        verify(holidayRepository, never()).deleteById(any());
    }
}
