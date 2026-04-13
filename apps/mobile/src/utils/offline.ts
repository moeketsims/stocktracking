import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

export async function checkOnlineBeforeMutation(actionName: string): Promise<boolean> {
  const state = await NetInfo.fetch();
  if (!state.isConnected) {
    Alert.alert('You\'re offline', `Cannot ${actionName} while offline. Please check your connection and try again.`);
    return false;
  }
  return true;
}
