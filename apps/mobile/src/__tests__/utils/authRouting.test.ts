import { decideAuthRedirect } from '../../utils/authRouting';

describe('decideAuthRedirect', () => {
  it('keeps unauthenticated users on login and invite-code routes', () => {
    expect(
      decideAuthRedirect({
        isAuthenticated: false,
        pinConfigured: null,
        pinUnlocked: false,
        segments: ['(auth)', 'login'],
      }),
    ).toBeNull();

    expect(
      decideAuthRedirect({
        isAuthenticated: false,
        pinConfigured: null,
        pinUnlocked: false,
        segments: ['(auth)', 'accept-code'],
      }),
    ).toBeNull();
  });

  it('sends unauthenticated users away from protected routes', () => {
    expect(
      decideAuthRedirect({
        isAuthenticated: false,
        pinConfigured: null,
        pinUnlocked: false,
        segments: ['(tabs)', 'stock'],
      }),
    ).toBe('/(auth)/login');
  });

  it('waits while PIN configuration is still loading', () => {
    expect(
      decideAuthRedirect({
        isAuthenticated: true,
        pinConfigured: null,
        pinUnlocked: false,
        segments: ['(tabs)', 'index'],
      }),
    ).toBeNull();
  });

  it('requires PIN setup before protected routes when no PIN exists', () => {
    expect(
      decideAuthRedirect({
        isAuthenticated: true,
        pinConfigured: false,
        pinUnlocked: false,
        segments: ['(tabs)', 'index'],
      }),
    ).toBe('/(auth)/pin-setup');

    expect(
      decideAuthRedirect({
        isAuthenticated: true,
        pinConfigured: false,
        pinUnlocked: false,
        segments: ['(auth)', 'pin-setup'],
      }),
    ).toBeNull();
  });

  it('requires PIN unlock before protected routes when a PIN exists', () => {
    expect(
      decideAuthRedirect({
        isAuthenticated: true,
        pinConfigured: true,
        pinUnlocked: false,
        segments: ['(tabs)', 'index'],
      }),
    ).toBe('/(auth)/pin');

    expect(
      decideAuthRedirect({
        isAuthenticated: true,
        pinConfigured: true,
        pinUnlocked: false,
        segments: ['(auth)', 'pin'],
      }),
    ).toBeNull();
  });

  it('allows protected routes after local PIN unlock', () => {
    expect(
      decideAuthRedirect({
        isAuthenticated: true,
        pinConfigured: true,
        pinUnlocked: true,
        segments: ['(tabs)', 'stock'],
      }),
    ).toBeNull();
  });

  it('bounces stale auth routes after local PIN unlock', () => {
    expect(
      decideAuthRedirect({
        isAuthenticated: true,
        pinConfigured: true,
        pinUnlocked: true,
        segments: ['(auth)', 'pin'],
      }),
    ).toBe('/(tabs)');
  });

  it('allows PIN setup after unlock for settings-driven changes', () => {
    expect(
      decideAuthRedirect({
        isAuthenticated: true,
        pinConfigured: true,
        pinUnlocked: true,
        segments: ['(auth)', 'pin-setup'],
      }),
    ).toBeNull();
  });
});
