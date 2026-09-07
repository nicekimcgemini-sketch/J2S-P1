import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { Camera, useCameraDevices, useCodeScanner } from 'react-native-vision-camera';
import { attendanceApi } from '../services/api';

interface Props {
  hardwareId: string;
}

type Mode = 'CHECK_IN' | 'CHECK_OUT';

export default function QrScanScreen({ hardwareId }: Props) {
  const [mode, setMode] = useState<Mode>('CHECK_IN');
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const devices = useCameraDevices();
  const device = devices.back;

  const handleScan = useCallback(async (qrToken: string) => {
    if (loading) return;
    setLoading(true);
    setScanning(false);
    try {
      if (mode === 'CHECK_IN') {
        await attendanceApi.checkIn(qrToken, hardwareId);
        Alert.alert('출근 완료', '출근이 정상 처리되었습니다.');
      } else {
        await attendanceApi.checkOut(qrToken, hardwareId);
        Alert.alert('퇴근 완료', '퇴근이 정상 처리되었습니다.');
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? '처리 실패. 다시 시도하세요.';
      Alert.alert('오류', msg);
    } finally {
      setLoading(false);
    }
  }, [mode, hardwareId, loading]);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: codes => {
      if (codes.length > 0 && codes[0].value && scanning) {
        handleScan(codes[0].value);
      }
    },
  });

  if (!device) return <View style={styles.center}><Text>카메라를 불러오는 중...</Text></View>;

  return (
    <View style={styles.container}>
      {/* 출근/퇴근 선택 */}
      <View style={styles.modeRow}>
        {(['CHECK_IN', 'CHECK_OUT'] as const).map(m => (
          <TouchableOpacity
            key={m}
            style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
            onPress={() => setMode(m)}
          >
            <Text style={[styles.modeBtnText, mode === m && { color: '#fff' }]}>
              {m === 'CHECK_IN' ? '출근' : '퇴근'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 카메라 뷰 */}
      <View style={styles.cameraWrapper}>
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={scanning}
          codeScanner={codeScanner}
        />
        {!scanning && (
          <View style={styles.overlay}>
            <Text style={styles.overlayText}>아래 버튼을 눌러 QR을 스캔하세요</Text>
          </View>
        )}
        {/* 스캔 가이드 사각형 */}
        {scanning && <View style={styles.scanBox} />}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1677ff" style={{ marginTop: 20 }} />
      ) : (
        <TouchableOpacity
          style={[styles.scanBtn, scanning && styles.scanBtnActive]}
          onPress={() => setScanning(prev => !prev)}
        >
          <Text style={styles.scanBtnText}>
            {scanning ? '스캔 취소' : `${mode === 'CHECK_IN' ? '출근' : '퇴근'} QR 스캔`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modeRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 12,
    paddingVertical: 16, backgroundColor: '#111',
  },
  modeBtn: {
    paddingHorizontal: 28, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1, borderColor: '#444',
  },
  modeBtnActive: { backgroundColor: '#1677ff', borderColor: '#1677ff' },
  modeBtnText: { color: '#aaa', fontWeight: '600', fontSize: 16 },
  cameraWrapper: { flex: 1, position: 'relative' },
  overlay: {
    ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  overlayText: { color: '#fff', fontSize: 16 },
  scanBox: {
    position: 'absolute', top: '50%', left: '50%',
    width: 220, height: 220, marginLeft: -110, marginTop: -110,
    borderWidth: 2, borderColor: '#1677ff', borderRadius: 12,
  },
  scanBtn: {
    margin: 24, padding: 16, backgroundColor: '#1677ff',
    borderRadius: 12, alignItems: 'center',
  },
  scanBtnActive: { backgroundColor: '#ff4d4f' },
  scanBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
