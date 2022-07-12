import {BleManager} from 'react-native-ble-plx';

export class BluetoothHelper {
  constructor() {
    this.manager = new BleManager();
  }
  static getManager() {
    return this.manager;
  }
  static destroyManager() {
    this.manager.destroy();
    this.manager = null;
  }
}

export const manager = new BleManager();
