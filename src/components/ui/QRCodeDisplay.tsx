import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Bluetooth, Clock, Users, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ActiveSession } from '@/types';

interface QRCodeDisplayProps {
  session: ActiveSession;
  onClose: () => void;
  scannedCount: number;
}

export function QRCodeDisplay({ session, onClose, scannedCount }: QRCodeDisplayProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [progress, setProgress] = useState<number>(100);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiresAt = new Date(session.expiresAt).getTime();
      const createdAt = new Date(session.createdAt).getTime();
      const total = expiresAt - createdAt;
      const remaining = Math.max(0, expiresAt - now);
      
      setTimeLeft(Math.ceil(remaining / 1000));
      setProgress((remaining / total) * 100);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [session]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressColor = () => {
    if (progress > 60) return '#3b82f6'; // Blue
    if (progress > 30) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 50 }}
        className="glass-card max-w-lg w-full p-8 relative"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Attendance Session</h2>
          <p className="text-muted-foreground">{session.courseCode}: {session.courseTitle}</p>
          <p className="text-sm text-muted-foreground mt-1">Room: {session.room}</p>
          {session.requiresBluetooth && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
              <Bluetooth className="h-3.5 w-3.5" />
              Bluetooth required{session.bluetoothDeviceName ? `: ${session.bluetoothDeviceName}` : ''}
            </div>
          )}
        </div>

        {/* QR Code with Progress Ring */}
        <div className="relative w-72 h-72 mx-auto mb-8">
          {/* Progress Ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="144"
              cy="144"
              r="120"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="8"
            />
            <motion.circle
              cx="144"
              cy="144"
              r="120"
              fill="none"
              stroke={getProgressColor()}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
            />
          </svg>

          {/* QR Code */}
          <div className="absolute inset-8 bg-white rounded-2xl p-4 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <QRCodeSVG
                value={session.barcodeData}
                size={180}
                level="H"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#0f172a"
              />
            </motion.div>
          </div>

          {/* Pulse Effect when time is running low */}
          {progress < 20 && (
            <div className="absolute inset-0 rounded-full border-4 border-destructive/50 animate-ping" />
          )}
        </div>

        {/* Timer */}
        <div className="text-center mb-6">
          <div className={`text-5xl font-bold font-mono ${
            progress > 60 ? 'text-primary' : progress > 30 ? 'text-warning' : 'text-destructive countdown-pulse'
          }`}>
            {formatTime(timeLeft)}
          </div>
          <p className="text-sm text-muted-foreground mt-2">Time Remaining</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="glass-card p-4 text-center">
            <Users className="w-5 h-5 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold text-white">{scannedCount}</p>
            <p className="text-xs text-muted-foreground">Students Scanned</p>
          </div>
          <div className="glass-card p-4 text-center">
            <Clock className="w-5 h-5 mx-auto mb-2 text-secondary" />
            <p className="text-2xl font-bold text-white">{session.totalStudents}</p>
            <p className="text-xs text-muted-foreground">Total Students</p>
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="glass-card p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Attendance Rate</span>
            <span className="text-sm font-medium text-white">
              {Math.round((scannedCount / session.totalStudents) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-secondary"
              initial={{ width: 0 }}
              animate={{ width: `${(scannedCount / session.totalStudents) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Warning */}
        {progress < 20 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 mb-6"
          >
            <AlertCircle className="w-5 h-5 text-destructive" />
            <p className="text-sm text-destructive">Session expiring soon!</p>
          </motion.div>
        )}

        {/* End Session Button */}
        <Button
          onClick={onClose}
          variant="destructive"
          className="w-full"
          size="lg"
        >
          End Session
        </Button>
      </motion.div>
    </motion.div>
  );
}
