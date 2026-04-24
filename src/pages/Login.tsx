import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  QrCode, 
  UserCircle, 
  GraduationCap, 
  Shield, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuthHooks';
import { useToast } from '@/hooks/useToast';
import type { UserRole } from '@/types';

const roles = [
  { id: 'student' as UserRole, label: 'Student', icon: GraduationCap, color: 'from-blue-500 to-cyan-500' },
  { id: 'lecturer' as UserRole, label: 'Lecturer', icon: UserCircle, color: 'from-violet-500 to-purple-500' },
  { id: 'admin' as UserRole, label: 'Admin', icon: Shield, color: 'from-emerald-500 to-teal-500' }
];

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, authError } = useAuth();
  const { success, error } = useToast();
  
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const floatingTiles = [
    { className: 'left-[6%] top-[8%]' },
    { className: 'left-[22%] top-[16%]' },
    { className: 'right-[10%] top-[10%]' },
    { className: 'right-[16%] top-[48%]' },
    { className: 'left-[12%] bottom-[14%]' },
    { className: 'right-[6%] bottom-[10%]' },
  ];

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = await login(email, password, selectedRole);
    
    if (result) {
      success('Signed in successfully.');
      const fromPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(fromPath || '/dashboard', { replace: true });
    } else {
      error(authError ?? 'Invalid credentials. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Visual */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-900 items-center justify-center px-12 xl:px-16">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/20 to-slate-900" />
          
          {/* Floating Elements */}
          {floatingTiles.map((tile, i) => (
            <motion.div
              key={i}
              className={`absolute ${tile.className}`}
              animate={{
                y: [0, -20, 0],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 4 + i,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${
                i % 3 === 0 ? 'from-primary/30 to-primary/10' :
                i % 3 === 1 ? 'from-secondary/30 to-secondary/10' :
                'from-success/30 to-success/10'
              } backdrop-blur-sm border border-white/10 flex items-center justify-center`}>
                <QrCode className="w-7 h-7 text-white/50" />
              </div>
            </motion.div>
          ))}
          
          {/* Grid Pattern */}
          <div className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '50px 50px'
            }}
          />
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex w-full max-w-xl flex-col justify-center gap-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0 shadow-lg shadow-primary/25">
                <QrCode className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">AttendX Pro</h1>
                <p className="text-muted-foreground">Smart Attendance System</p>
              </div>
            </div>
            
            <h2 className="max-w-lg text-5xl font-bold text-white leading-[1.05] tracking-tight">
              Revolutionizing<br />
              <span className="text-gradient">Attendance Tracking</span>
            </h2>
            
            <p className="max-w-lg text-lg leading-8 text-muted-foreground">
              Streamline your classroom attendance with our cutting-edge barcode scanning technology. 
              Fast, secure, and effortless.
            </p>
            
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="text-sm text-white">Real-time Tracking</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-secondary" />
                <span className="text-sm text-white">Secure & Reliable</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-950">
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <QrCode className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">AttendX Pro</h1>
              <p className="text-xs text-muted-foreground">Smart Attendance</p>
            </div>
          </div>

          <div className="glass-card p-8">
            <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-muted-foreground mb-6">Sign in to your account</p>

            {/* Role Selector */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {roles.map((role) => {
                const Icon = role.icon;
                const isSelected = selectedRole === role.id;
                
                return (
                  <button
                    key={role.id}
                    onClick={() => handleRoleChange(role.id)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-300 ${
                      isSelected 
                        ? `bg-gradient-to-br ${role.color} text-white shadow-lg` 
                        : 'bg-slate-800 text-muted-foreground hover:bg-slate-700'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{role.label}</span>
                  </button>
                );
              })}
            </div>

            <p className="mb-4 text-xs text-muted-foreground">
              Your portal role is detected automatically after sign-in.
            </p>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-muted-foreground"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-10 pr-10 bg-slate-800 border-slate-700 text-white placeholder:text-muted-foreground"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-slate-700 bg-slate-800 text-primary" />
                  <span className="text-sm text-muted-foreground">Remember me</span>
                </label>
                <button type="button" className="text-sm text-primary hover:underline">
                  Forgot password?
                </button>
              </div>

              <Button
                type="submit"
                className="w-full btn-glow"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            {/* Demo Info */}
            <div className="mt-6 p-4 rounded-xl bg-slate-800/50 border border-slate-700">
              <p className="text-xs text-muted-foreground mb-2">Supabase Auth:</p>
              <code className="text-xs text-muted-foreground block">Enter the email and password created in Supabase.</code>
            </div>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
