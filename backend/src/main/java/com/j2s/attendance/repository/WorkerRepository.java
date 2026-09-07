package com.j2s.attendance.repository;

import com.j2s.attendance.entity.Worker;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface WorkerRepository extends JpaRepository<Worker, Long> {
    Optional<Worker> findByEmployeeNo(String employeeNo);
}
