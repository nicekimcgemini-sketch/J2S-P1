import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { getOrCreateHardwareId } from './utils/deviceId';
import { deviceApi } from './services/api';
import DeviceRegisterScreen from './screens/DeviceRegisterScreen';
import QrScanScreen from './screens/QrScanScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [hardwareId, setHardwareId] = useState<string | null>(null);
  const [deviceApproved, setDeviceApproved] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const id = await getOrCreateHardwareId();
      setHardwareId(id);

      // 이미 등록된 기기라면 상태 확인
      try {
        const result = await deviceApi.register({
          hardwareId: id,
          employeeNo: '',        // 이미 등록된 경우 서버가 기존 레코드 반환
          deviceName: '',
          osType: '',
        });
        setDeviceApproved(result.status === 'APPROVED');
      } catch {
        setDeviceApproved(false);
      }
    })();
  }, []);

  if (hardwareId === null || deviceApproved === null) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" /></View>;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {deviceApproved ? (
          <Stack.Screen name="QrScan">
            {() => <QrScanScreen hardwareId={hardwareId} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Register">
            {() => <DeviceRegisterScreen onApproved={id => { setHardwareId(id); setDeviceApproved(true); }} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
