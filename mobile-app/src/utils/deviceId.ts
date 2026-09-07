import * as Keychain from 'react-native-keychain';
import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const KEYCHAIN_SERVICE = 'com.j2s.attendance.deviceId';
const KEYCHAIN_KEY = 'hardware_id';

/**
 * 기기 고유 ID 조회 또는 생성
 *
 * - Android: getAndroidId() 기반, 앱 삭제 후 재설치해도 유지 안 될 수 있으므로
 *   Keychain(KeyStore 저장소)에 UUID를 저장하여 영속성 보장
 * - iOS: UDID는 앱 불가능 → KeyChain에 UUID 저장 (앱 삭제 후에도 유지)
 *
 * 결론: 플랫폼 무관하게 KeyStore/Keychain 기반 UUID를 primary ID로 사용
 */
export async function getOrCreateHardwareId(): Promise<string> {
  // 1. Keychain에서 기존 ID 조회
  const stored = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
  if (stored && stored.username === KEYCHAIN_KEY) {
    return stored.password;
  }

  // 2. 없으면 새 UUID 생성 후 Keychain에 저장
  let newId: string;
  if (Platform.OS === 'android') {
    // Android: AndroidId를 seed로 사용 (단, Keychain에도 저장)
    const androidId = await DeviceInfo.getAndroidId();
    newId = androidId || uuidv4();
  } else {
    newId = uuidv4();
  }

  await Keychain.setGenericPassword(KEYCHAIN_KEY, newId, { service: KEYCHAIN_SERVICE });
  return newId;
}
