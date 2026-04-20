import { useCallback } from 'react';

export interface BluetoothProximityRequest {
  deviceName?: string;
  serviceUuid?: string;
}

export interface BluetoothProximityResult {
  success: boolean;
  message: string;
  deviceName?: string;
  deviceId?: string;
}

interface BluetoothServerLike {
  getPrimaryService(serviceUuid: string): Promise<unknown>;
}

interface BluetoothGattLike {
  connect(): Promise<BluetoothServerLike>;
  disconnect(): void;
}

interface BluetoothDeviceLike {
  name?: string;
  id: string;
  gatt?: BluetoothGattLike;
}

interface BluetoothNavigatorLike {
  bluetooth?: {
    requestDevice(options: Record<string, unknown>): Promise<BluetoothDeviceLike>;
  };
}

const DEFAULT_BLUETOOTH_ERROR = 'Bluetooth attendance verification is unavailable on this browser or device.';

function buildRequestOptions(request: BluetoothProximityRequest): Record<string, unknown> {
  const { deviceName, serviceUuid } = request;

  if (deviceName && serviceUuid) {
    return {
      filters: [{ namePrefix: deviceName, services: [serviceUuid] }],
      optionalServices: [serviceUuid],
    };
  }

  if (serviceUuid) {
    return {
      filters: [{ services: [serviceUuid] }],
      optionalServices: [serviceUuid],
    };
  }

  if (deviceName) {
    return {
      filters: [{ namePrefix: deviceName }],
    };
  }

  return {
    acceptAllDevices: true,
  };
}

export function useBluetoothProximity() {
  const verifyBluetoothProximity = useCallback(async (request: BluetoothProximityRequest): Promise<BluetoothProximityResult> => {
    const bluetoothApi = typeof navigator === 'undefined'
      ? undefined
      : (navigator as Navigator & BluetoothNavigatorLike).bluetooth;

    if (!bluetoothApi || typeof bluetoothApi.requestDevice !== 'function') {
      return {
        success: false,
        message: DEFAULT_BLUETOOTH_ERROR,
      };
    }

    try {
      const device = await bluetoothApi.requestDevice(buildRequestOptions(request));

      if (!device?.gatt || typeof device.gatt.connect !== 'function') {
        return {
          success: false,
          message: 'Bluetooth device is not available for secure connection.',
        };
      }

      const server = await device.gatt.connect();

      if (request.serviceUuid && typeof server.getPrimaryService === 'function') {
        await server.getPrimaryService(request.serviceUuid);
      }

      if (typeof device.gatt.disconnect === 'function') {
        device.gatt.disconnect();
      }

      return {
        success: true,
        message: 'Bluetooth proximity confirmed.',
        deviceName: device.name || request.deviceName || 'Unknown Bluetooth device',
        deviceId: device.id,
      };
    } catch {
      return {
        success: false,
        message: 'Unable to confirm Bluetooth proximity. Make sure Bluetooth is enabled and the device is nearby.',
      };
    }
  }, []);

  return { verifyBluetoothProximity };
}