import type { AttendanceRecord } from '@/types';
import type { BluetoothVerificationLog } from '@/services/universityService';

export type AttendanceHistoryMode = 'qr' | 'bluetooth-qr' | 'bluetooth-proximity';

export type AttendanceHistoryEntry = {
  id: string;
  timestamp: string;
  mode: AttendanceHistoryMode;
  kind: 'attendance' | 'verification';
  success: boolean;
  title: string;
  subtitle: string;
  studentLabel: string;
  sessionLabel: string;
  deviceLabel?: string;
  reason?: string;
};

function formatMode(mode: AttendanceHistoryMode): string {
  if (mode === 'qr') return 'QR';
  if (mode === 'bluetooth-qr') return 'QR + Bluetooth';
  return 'Bluetooth';
}

export function buildAttendanceHistoryEntries(
  attendanceRecords: AttendanceRecord[],
  bluetoothLogs: BluetoothVerificationLog[],
): AttendanceHistoryEntry[] {
  const attendanceEntries = attendanceRecords.map((record) => ({
    id: `attendance-${record.id}`,
    timestamp: `${record.date}T${record.time}:00`,
    mode: (record.verificationMode ?? 'qr') as AttendanceHistoryMode,
    kind: 'attendance' as const,
    success: record.status !== 'absent',
    title: `Attendance ${record.status === 'present' ? 'marked' : 'updated'}`,
    subtitle: `${record.courseCode} • ${record.courseTitle}`,
    studentLabel: `${record.studentName} • ${record.studentMatric}`,
    sessionLabel: `Session ${record.sessionId}`,
    deviceLabel: record.bluetoothDeviceName ? `${record.bluetoothDeviceName}${record.bluetoothDeviceId ? ` • ${record.bluetoothDeviceId}` : ''}` : undefined,
    reason: record.status === 'absent' ? 'Marked absent for this session.' : undefined,
  }));

  const bluetoothEntries = bluetoothLogs.map((log) => ({
    id: `bluetooth-${log.id}`,
    timestamp: log.verifiedAt,
    mode: 'bluetooth-proximity' as const,
    kind: 'verification' as const,
    success: log.success,
    title: log.success ? 'Bluetooth verification passed' : 'Bluetooth verification failed',
    subtitle: `${log.sessionCourseCode || 'Unknown course'}${log.sessionCourseTitle ? ` • ${log.sessionCourseTitle}` : ''}`,
    studentLabel: `${log.studentName || 'Unknown student'}${log.studentMatric ? ` • ${log.studentMatric}` : ''}`,
    sessionLabel: `Session ${log.sessionId}`,
    deviceLabel: log.deviceName ? `${log.deviceName}${log.deviceId ? ` • ${log.deviceId}` : ''}` : undefined,
    reason: log.reason,
  }));

  return [...attendanceEntries, ...bluetoothEntries]
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
    .map((entry) => ({
      ...entry,
      title: `${entry.title} (${formatMode(entry.mode)})`,
    }));
}