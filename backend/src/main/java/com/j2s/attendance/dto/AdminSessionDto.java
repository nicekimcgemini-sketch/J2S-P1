package com.j2s.attendance.dto;

/**
 * 로그인된 관리자 세션 정보.
 * sessionTimeoutSeconds 는 마지막 관리자 API 요청 이후 세션이 유지되는 시간(초) — 프론트 자동 로그아웃 카운트다운에 쓴다.
 */
public record AdminSessionDto(String username, int sessionTimeoutSeconds) {
}
