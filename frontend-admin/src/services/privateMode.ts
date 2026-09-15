import { detectIncognito } from 'detectincognitojs';

/** 안내 문구를 고르기 위한 모바일 브라우저 구분 */
export type MobileBrowser = 'safari' | 'chrome' | 'samsung' | 'firefox' | 'inapp' | 'other';

export function detectMobileBrowser(ua: string = navigator.userAgent): MobileBrowser {
  if (/KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|Line\//i.test(ua)) return 'inapp';
  if (/SamsungBrowser/i.test(ua)) return 'samsung';
  if (/FxiOS|Firefox/i.test(ua)) return 'firefox';
  if (/CriOS|Chrome/i.test(ua)) return 'chrome';
  if (/Safari/i.test(ua) && /iPhone|iPad|iPod/i.test(ua)) return 'safari';
  return 'other';
}

/**
 * 시크릿(개인정보 보호) 모드인지 추정한다.
 * 브라우저가 공식적으로 알려주지 않아 detectincognitojs 가 브라우저별 저장소 동작 차이로 추정하므로
 * 오탐·미탐이 있을 수 있다(Chrome 계열은 IndexedDB 저장 속도 비율로 추정해 판별에 1초 남짓 걸림).
 * 판별에 실패하거나 제한 시간을 넘기면 일반 모드로 간주한다(등록을 막지 않음).
 */
export async function isPrivateBrowsing(timeoutMs = 4000): Promise<boolean> {
  try {
    const result = await Promise.race([
      detectIncognito(),
      new Promise<null>(resolve => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    return result?.isPrivate === true;
  } catch {
    return false;
  }
}
