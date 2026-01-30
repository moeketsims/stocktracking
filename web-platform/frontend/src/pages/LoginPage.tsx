import { useState } from 'react';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { Button, Input, Card } from '../components/ui';
import { useLogin } from '../hooks/useAuth';

interface LoginPageProps {
  onForgotPassword?: () => void;
}

function BackgroundPattern() {
  const iconColor = "#6366f1"; // indigo-500
  const bgColor = "#1e1b4b"; // indigo-950

  const Potato = ({ scale = 1, opacity = 0.04 }: { scale?: number; opacity?: number }) => (
    <g opacity={opacity} fill={iconColor} transform={`scale(${scale})`}>
      <ellipse cx="20" cy="15" rx="18" ry="14" />
      <circle cx="12" cy="10" r="2" fill={bgColor} />
      <circle cx="25" cy="8" r="1.5" fill={bgColor} />
      <circle cx="18" cy="18" r="1.5" fill={bgColor} />
    </g>
  );

  const Truck = ({ scale = 1, opacity = 0.04 }: { scale?: number; opacity?: number }) => (
    <g opacity={opacity} fill={iconColor} transform={`scale(${scale})`}>
      <rect x="0" y="10" width="35" height="20" rx="2" />
      <rect x="35" y="15" width="15" height="15" rx="2" />
      <circle cx="10" cy="32" r="5" />
      <circle cx="42" cy="32" r="5" />
    </g>
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg className="w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        {/* Far corners - largest icons */}
        <g transform="translate(30, 30) rotate(-15)">
          <Potato scale={2.5} opacity={0.09} />
        </g>
        <g transform="translate(130, 120) rotate(30)">
          <Truck scale={1.8} opacity={0.07} />
        </g>
        <g transform="translate(920, 40) rotate(20)">
          <Truck scale={2.2} opacity={0.08} />
        </g>
        <g transform="translate(820, 130) rotate(-30)">
          <Potato scale={1.7} opacity={0.07} />
        </g>
        <g transform="translate(50, 900) rotate(10)">
          <Truck scale={2.3} opacity={0.08} />
        </g>
        <g transform="translate(140, 780) rotate(-25)">
          <Potato scale={1.8} opacity={0.07} />
        </g>
        <g transform="translate(900, 880) rotate(-25)">
          <Potato scale={2.4} opacity={0.09} />
        </g>
        <g transform="translate(800, 770) rotate(18)">
          <Truck scale={1.7} opacity={0.07} />
        </g>

        {/* Mid-distance from center - medium icons */}
        <g transform="translate(180, 200) rotate(25)">
          <Potato scale={1.5} opacity={0.07} />
        </g>
        <g transform="translate(800, 180) rotate(-10)">
          <Potato scale={1.4} opacity={0.07} />
        </g>
        <g transform="translate(150, 700) rotate(-20)">
          <Truck scale={1.5} opacity={0.06} />
        </g>
        <g transform="translate(820, 750) rotate(15)">
          <Truck scale={1.4} opacity={0.06} />
        </g>

        {/* Closer to center - smaller icons */}
        <g transform="translate(300, 350) rotate(-5)">
          <Potato scale={0.9} opacity={0.05} />
        </g>
        <g transform="translate(680, 380) rotate(12)">
          <Truck scale={0.8} opacity={0.04} />
        </g>
        <g transform="translate(320, 620) rotate(8)">
          <Truck scale={0.85} opacity={0.04} />
        </g>
        <g transform="translate(700, 650) rotate(-8)">
          <Potato scale={0.9} opacity={0.05} />
        </g>
      </svg>
    </div>
  );
}

export default function LoginPage({ onForgotPassword }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const loginMutation = useLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      await loginMutation.mutateAsync({ email, password });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen bg-indigo-950 flex items-center justify-center p-4 relative">
      <BackgroundPattern />
      <Card className="w-full max-w-md relative z-10" padding="lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🥔</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Potato Stock</h1>
          <p className="text-gray-500 mt-1">Track your inventory with confidence</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <Input
            type="email"
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail className="w-5 h-5" />}
            autoComplete="email"
          />

          <Input
            type={showPassword ? 'text' : 'password'}
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock className="w-5 h-5" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            }
            autoComplete="current-password"
          />

          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={loginMutation.isPending}
          >
            Sign In
          </Button>

          {onForgotPassword && (
            <div className="text-center">
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                Forgot your password?
              </button>
            </div>
          )}
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by Supabase
        </p>
      </Card>
    </div>
  );
}
