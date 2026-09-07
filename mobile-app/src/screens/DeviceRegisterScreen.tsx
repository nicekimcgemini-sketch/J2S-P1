import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Platform,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { getOrCreateHardwareId } from '../utils/deviceId';
import { deviceApi } from '../services/api';

interface Props {
  onApproved: (hardwareId: string) => void;
}

export default function DeviceRegisterScreen({ onApproved }: Props) {
  const [employeeNo, setEmployeeNo] = useState('');
  const [hardwareId, setHardwareId] = useState('');
  const [status, setStatus] = useState<'idle' | 'pending' | 'approved' | 'revoked'>('idle');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getOrCreateHardwareId().then(setHardwareId);
  }, []);

  const handleRegister = async () => {
    if (!employeeNo.trim()) {
      Alert.alert('오류', '사번을 입력하세요.');
      return;
    }
    setLoading(true);
    try {
      const result = await deviceApi.register({
        hardwareId,
        employeeNo: employeeNo.trim(),
        deviceName: await DeviceInfo.getDeviceName(),
        osType: Platform.OS.toUpperCase(),
      });

      if (result.status === 'APPROVED') {
        setStatus('approved');
        onApproved(hardwareId);
      } else if (result.status === 'REVOKED') {
        setStatus('revoked');
      } else {
        setStatus('pending');
      }
    } catch (e: any) {
      Alert.alert('등록 실패', e?.response?.data?.message ?? '서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'pending') {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>등록 대기 중</Text>
        <Text style={styles.desc}>관리자 승인 후 앱을 다시 시작하세요.</Text>
      </View>
    );
  }

  if (status === 'revoked') {
    return (
      <View style={styles.center}>
        <Text style={[styles.title, { color: '#ff4d4f' }]}>기기 권한 회수됨</Text>
        <Text style={styles.desc}>관리자에게 문의하세요.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>기기 등록</Text>
      <Text style={styles.desc}>처음 사용하는 기기입니다. 사번을 입력하여 등록하세요.</Text>

      <TextInput
        style={styles.input}
        placeholder="사번 입력"
        value={employeeNo}
        onChangeText={setEmployeeNo}
        autoCapitalize="none"
      />

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>등록 요청</Text>}
      </TouchableOpacity>

      <Text style={styles.hint}>기기 ID: {hardwareId.slice(0, 12)}...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 12 },
  desc: { fontSize: 14, color: '#666', marginBottom: 24 },
  input: {
    borderWidth: 1, borderColor: '#d9d9d9', borderRadius: 8,
    padding: 12, fontSize: 16, marginBottom: 16,
  },
  button: {
    backgroundColor: '#1677ff', borderRadius: 8, padding: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  hint: { marginTop: 20, fontSize: 11, color: '#bbb', textAlign: 'center' },
});
