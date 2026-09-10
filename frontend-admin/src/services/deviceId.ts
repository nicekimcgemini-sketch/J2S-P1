const STORAGE_KEY = 'attendance_device_id';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 5; // 5년

/**
 * QR을 카메라 앱으로 찍어 열 때, 일부 카메라/스캐너 앱은 링크를 "임시 보기" 같은
 * 인앱 브라우저로 열어서 매번 저장공간이 초기화되는 경우가 있다. localStorage만 쓰면
 * 이럴 때마다 새 기기로 인식돼 매번 등록 화면부터 다시 시작하게 된다.
 * localStorage와 쿠키 두 곳에 같은 값을 저장해두고, 한쪽이 비어 있으면 다른 쪽에서
 * 복구해 서로 동기화한다. (둘 다 지워지는 완전한 프라이빗 모드는 이 방식으로도 못 막는다.)
 */
function readCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${STORAGE_KEY}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(id: string): void {
  document.cookie = `${STORAGE_KEY}=${encodeURIComponent(id)}; max-age=${COOKIE_MAX_AGE_SECONDS}; path=/; SameSite=Lax`;
}

export function getOrCreateDeviceId(): string {
  let id: string | null = null;
  try {
    id = localStorage.getItem(STORAGE_KEY);
  } catch {
    // 프라이빗 모드 등에서 localStorage 접근 자체가 막힐 수 있음
  }

  if (!id) id = readCookie();

  if (!id) {
    id = crypto.randomUUID();
  }

  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // 무시하고 쿠키만으로 유지
  }
  writeCookie(id);

  return id;
}
