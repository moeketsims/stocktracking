import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

export class OfflineMutationError extends Error {
  constructor(actionName: string) {
    super(`Cannot ${actionName} while offline`);
    this.name = 'OfflineMutationError';
  }
}

export function isOfflineMutationError(error: unknown): boolean {
  return error instanceof OfflineMutationError;
}

export async function checkOnlineBeforeMutation(actionName: string): Promise<boolean> {
  const state = await NetInfo.fetch();
  if (!state.isConnected) {
    Alert.alert('You\'re offline', `Cannot ${actionName} while offline. Please check your connection and try again.`);
    return false;
  }
  return true;
}

export async function assertOnlineBeforeMutation(actionName: string): Promise<void> {
  const online = await checkOnlineBeforeMutation(actionName);
  if (!online) {
    throw new OfflineMutationError(actionName);
  }
}
