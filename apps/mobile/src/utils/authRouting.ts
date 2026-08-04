export type AuthRedirect =
  | '/(auth)/login'
  | '/(auth)/pin'
  | '/(auth)/pin-setup'
  | '/(tabs)';

interface AuthRouteState {
  isAuthenticated: boolean;
  pinConfigured: boolean | null;
  pinUnlocked: boolean;
  segments: string[];
}

export function decideAuthRedirect({
  isAuthenticated,
  pinConfigured,
  pinUnlocked,
  segments,
}: AuthRouteState): AuthRedirect | null {
  const inAuthGroup = segments[0] === '(auth)';
  const currentRoute = segments[1];

  if (!isAuthenticated) {
    const allowedUnauth = currentRoute === 'login' || currentRoute === 'accept-code';
    return inAuthGroup && allowedUnauth ? null : '/(auth)/login';
  }

  if (pinConfigured === null) return null;

  if (!pinConfigured) {
    return currentRoute === 'pin-setup' ? null : '/(auth)/pin-setup';
  }

  if (!pinUnlocked) {
    return currentRoute === 'pin' ? null : '/(auth)/pin';
  }

  if (inAuthGroup && currentRoute !== 'pin-setup') {
    return '/(tabs)';
  }

  return null;
}
