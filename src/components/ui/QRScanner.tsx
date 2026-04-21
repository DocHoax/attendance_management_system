import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';
import { Bluetooth, X, Camera, ScanLine, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BluetoothSessionConfig, BluetoothVerificationContext, ScanResult } from '@/types';
import { useBluetoothProximity } from '@/hooks/useBluetoothProximity';
import { recordBluetoothVerificationAttempt } from '@/services/universityService';

interface QRScannerProps {
  bluetoothSession?: BluetoothSessionConfig | null;
  studentId?: string;
  onScan: (
    data: string,
    context?: BluetoothVerificationContext
  ) => ScanResult | Promise<ScanResult>;
  onClose: () => void;
}

export function QRScanner({ bluetoothSession, studentId, onScan, onClose }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isBluetoothVerifying, setIsBluetoothVerifying] = useState(false);
  const [isBluetoothVerified, setIsBluetoothVerified] = useState(!bluetoothSession?.requiresBluetooth);
  const [bluetoothMessage, setBluetoothMessage] = useState<string | null>(null);
  const [bluetoothDeviceName, setBluetoothDeviceName] = useState<string | undefined>(undefined);
  const [bluetoothDeviceId, setBluetoothDeviceId] = useState<string | undefined>(undefined);
  const isProcessingRef = useRef(false);
  const { verifyBluetoothProximity } = useBluetoothProximity();

  const bluetoothRequired = !!bluetoothSession?.requiresBluetooth;

  const handleScan = useCallback(async (data: string) => {
    if (isProcessingRef.current) return;

    isProcessingRef.current = true;

    try {
      const result = await Promise.resolve(onScan(data, {
        bluetoothVerified: !bluetoothRequired || isBluetoothVerified,
        bluetoothDeviceName,
        bluetoothDeviceId,
      }));
      setScanResult(result);

      if (result.success && scannerRef.current) {
        await scannerRef.current.stop();
      }
    } finally {
      isProcessingRef.current = false;
    }
  }, [bluetoothRequired, bluetoothDeviceId, bluetoothDeviceName, isBluetoothVerified, onScan]);

  useEffect(() => {
    if (bluetoothRequired && !isBluetoothVerified) {
      return;
    }

    const initScanner = async () => {
      if (!containerRef.current) return;

      try {
        const scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          (decodedText) => {
            void handleScan(decodedText);
          },
          () => {
            // QR code not found in this frame - this is normal
          }
        );
      } catch {
        setCameraError('Could not access camera. Please ensure camera permissions are granted.');
      }
    };

    initScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [bluetoothRequired, handleScan, isBluetoothVerified]);

  const handleBluetoothVerify = async () => {
    if (!bluetoothSession) return;

    setIsBluetoothVerifying(true);
    setBluetoothMessage(null);

    const result = await verifyBluetoothProximity({
      deviceName: bluetoothSession.bluetoothDeviceName,
      serviceUuid: bluetoothSession.bluetoothServiceUuid,
    });

    if (result.success) {
      setIsBluetoothVerified(true);
      setBluetoothDeviceName(result.deviceName);
      setBluetoothDeviceId(result.deviceId);
      setBluetoothMessage(result.message);
    } else {
      setIsBluetoothVerified(false);
      setBluetoothMessage(result.message);
    }

    if (bluetoothSession.sessionId && studentId) {
      void recordBluetoothVerificationAttempt({
        sessionId: bluetoothSession.sessionId,
        studentId,
        success: result.success,
        deviceName: result.deviceName,
        deviceId: result.deviceId,
        reason: result.message,
      });
    }

    setIsBluetoothVerifying(false);
  };

  const handleClose = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
    }
    onClose();
  };

  const handleRetry = () => {
    setScanResult(null);
    setCameraError(null);
    
    // Restart scanner
    if (scannerRef.current) {
      scannerRef.current.resume();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 50 }}
        className="glass-card max-w-md w-full p-6 relative"
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors z-10"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <ScanLine className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-white">Scan Attendance Code</h2>
          {bluetoothRequired ? (
            <p className="text-sm text-muted-foreground mt-1">
              {bluetoothSession?.courseTitle ? `${bluetoothSession.courseTitle} requires Bluetooth verification first.` : 'Bluetooth verification is required before scanning.'}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">
              Position the QR code within the frame
            </p>
          )}
        </div>

        {/* Scanner */}
        <AnimatePresence mode="wait">
          {bluetoothRequired && !isBluetoothVerified && !scanResult && !cameraError && (
            <motion.div
              key="bluetooth"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <Bluetooth className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Bluetooth Verification</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Verify the nearby device before scanning attendance.
              </p>
              {bluetoothMessage && (
                <p className={`mb-4 text-sm ${isBluetoothVerified ? 'text-success' : 'text-warning'}`}>
                  {bluetoothMessage}
                </p>
              )}
              <Button
                onClick={handleBluetoothVerify}
                disabled={isBluetoothVerifying}
                className="btn-glow"
              >
                {isBluetoothVerifying ? 'Verifying Bluetooth...' : 'Verify Bluetooth'}
              </Button>
            </motion.div>
          )}

          {!bluetoothRequired && !scanResult && !cameraError && (
            <motion.div
              key="scanner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative"
            >
              {/* Scanner Frame */}
              <div className="relative w-64 h-64 mx-auto rounded-2xl overflow-hidden bg-slate-900">
                <div ref={containerRef} id="qr-reader" className="w-full h-full" />
                
                {/* Overlay Frame */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Corner brackets */}
                  <div className="absolute top-4 left-4 w-8 h-8 border-l-4 border-t-4 border-primary rounded-tl-lg" />
                  <div className="absolute top-4 right-4 w-8 h-8 border-r-4 border-t-4 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-4 left-4 w-8 h-8 border-l-4 border-b-4 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-4 right-4 w-8 h-8 border-r-4 border-b-4 border-primary rounded-br-lg" />
                  
                  {/* Laser line */}
                  <div className="scan-laser" />
                  
                  {/* Center reticle */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 border border-primary/30 rounded-lg" />
                  </div>
                </div>
              </div>

              {/* Scanning indicator */}
              <div className="flex items-center justify-center gap-2 mt-4">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm text-muted-foreground">Scanning...</span>
              </div>
            </motion.div>
          )}

          {bluetoothRequired && isBluetoothVerified && !scanResult && !cameraError && (
            <motion.div
              key="scanner-bluetooth"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative"
            >
              <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-left text-sm text-primary">
                Bluetooth verified{bluetoothDeviceName ? `: ${bluetoothDeviceName}` : ''}
              </div>

              <div className="relative w-64 h-64 mx-auto rounded-2xl overflow-hidden bg-slate-900">
                <div ref={containerRef} id="qr-reader" className="w-full h-full" />
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-4 left-4 w-8 h-8 border-l-4 border-t-4 border-primary rounded-tl-lg" />
                  <div className="absolute top-4 right-4 w-8 h-8 border-r-4 border-t-4 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-4 left-4 w-8 h-8 border-l-4 border-b-4 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-4 right-4 w-8 h-8 border-r-4 border-b-4 border-primary rounded-br-lg" />
                  <div className="scan-laser" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 border border-primary/30 rounded-lg" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 mt-4">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm text-muted-foreground">Scanning...</span>
              </div>
            </motion.div>
          )}

          {/* Success State */}
          {scanResult?.success && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-success" />
              </div>
              <h3 className="text-xl font-bold text-success mb-2">Success!</h3>
              <p className="text-white mb-1">{scanResult.message}</p>
              {scanResult.timestamp && (
                <p className="text-sm text-muted-foreground">
                  Time: {scanResult.timestamp}
                </p>
              )}
              <Button
                onClick={handleClose}
                className="mt-6"
                size="lg"
              >
                Done
              </Button>
            </motion.div>
          )}

          {/* Error State */}
          {scanResult && !scanResult.success && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-10 h-10 text-destructive" />
              </div>
              <h3 className="text-xl font-bold text-destructive mb-2">Scan Failed</h3>
              <p className="text-white mb-4">{scanResult.message}</p>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={handleRetry}
                  variant="outline"
                >
                  Try Again
                </Button>
                <Button
                  onClick={handleClose}
                  variant="destructive"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          )}

          {/* Camera Error */}
          {cameraError && (
            <motion.div
              key="camera-error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="w-20 h-20 rounded-full bg-warning/20 flex items-center justify-center mx-auto mb-4">
                <Camera className="w-10 h-10 text-warning" />
              </div>
              <h3 className="text-xl font-bold text-warning mb-2">Camera Error</h3>
              <p className="text-white mb-4">{cameraError}</p>
              <Button
                onClick={handleClose}
                variant="destructive"
              >
                Close
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
