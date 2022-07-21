import React, {useEffect, useState, useRef} from 'react';
import {LogBox, View, StyleSheet} from 'react-native';
import {Menu} from 'react-native-paper';
import {
  encodeFromUint8Array,
  decodeToUint8Array,
  changeDisplayMode,
  isUpdateRequired,
  updateStats,
} from '../utils';
import {
  SERVICE_UUID,
  TEMPERATURE_UUID,
  BATTERY_UUID,
  VOLUME_UUID,
  DISPLAY_MODE_UUID,
  DISPLAY_MODES,
  BATTERY_TRANSACTION_ID,
  VOLUME_TRANSACTION_ID,
  TEMPERATURE_TRANSACTION_ID,
} from '../constants';
import {BASE_URL} from '@env';
import Background from '../components/Background';
import Logo from '../components/Logo';
import Header from '../components/Header';
import Paragraph from '../components/Paragraph';
import Button from '../components/Button';
import {theme} from '../core/theme';
import {Snackbar} from '../components/Snackbar';
import {BleManager} from 'react-native-ble-plx';

LogBox.ignoreLogs(['new NativeEventEmitter']); // Ignore log notification by message
LogBox.ignoreAllLogs(); //Ignore all log notifications

const bleManager = new BleManager();

export default function Dashboard({route, navigation}) {
  const {name, email, settings} = route.params;
  const [isConnected, setIsConnected] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState();
  const [snackbarVisible, setSnackbarVisible] = useState(true);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [selectedDisplayMode, setSelectedDisplayMode] = useState(
    settings.displayMode,
  );
  const [temperature, setTemperature] = useState(0);
  const [battery, setBattery] = useState(0);
  const [volume, setVolume] = useState(0);
  const [displayModeMenuVisible, setDisplayModeMenuVisible] = useState(false);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      updateStats(email, volume, temperature, battery);
    }
  }, [email, temperature, volume, battery]);

  const scanDevices = () => {
    console.log('scanning');
    bleManager.startDeviceScan(null, null, (error, scannedDevice) => {
      if (error) {
        console.warn(JSON.stringify(error));
      }

      if (scannedDevice && scannedDevice.name === 'BOOTLE') {
        bleManager.stopDeviceScan();
        connectDevice(scannedDevice);
      }
    });

    // stop scanning devices after 5 seconds
    setTimeout(() => {
      bleManager.stopDeviceScan();
    }, 5000);
  };

  const disconnectDevice = async () => {
    if (connectedDevice != null) {
      console.log('Disconnecting start');

      const isDeviceConnected = await connectedDevice.isConnected();
      if (isDeviceConnected) {
        // cancel any pending transactions
        bleManager.cancelTransaction(BATTERY_TRANSACTION_ID);
        bleManager.cancelTransaction(TEMPERATURE_TRANSACTION_ID);
        bleManager.cancelTransaction(VOLUME_TRANSACTION_ID);
        bleManager.cancelTransaction('nightmodetransaction');

        bleManager
          .cancelDeviceConnection(connectedDevice.id)
          .then(() => console.log('DC completed'));
      }

      const connectionStatus = await connectedDevice.isConnected();
      if (!connectionStatus) {
        setIsConnected(false);
      }
    }
  };

  const connectDevice = async device => {
    console.log('connecting to Device:', device.name);
    console.log('BASE_URL: ', BASE_URL);

    device = await device.connect();
    setConnectedDevice(device);
    setIsConnected(true);

    device = await device.discoverAllServicesAndCharacteristics();
    bleManager.onDeviceDisconnected(device.id, (error, device) => {
      console.log('Device DC');
      setIsConnected(false);
    });

    // TODO: send display_mode to arduino as soon as app starts

    readInitialValues(device);
    moniterChacteristics(device);

    console.log('Connection established');
  };

  const moniterChacteristics = device => {
    device.monitorCharacteristicForService(
      SERVICE_UUID,
      BATTERY_UUID,
      (error, characteristic) => {
        if (characteristic?.value == null) {
          console.log('Battery value is null');
          return;
        }

        const batteryUpdate = decodeToUint8Array(characteristic?.value)[0];
        console.log('Battery update received: ', batteryUpdate);
        setBattery(batteryUpdate);

        // if (isUpdateRequired(battery, batteryUpdate)) {
        //   setBattery(batteryUpdate);
        // }
      },
      BATTERY_TRANSACTION_ID,
    );

    // device.monitorCharacteristicForService(
    //   SERVICE_UUID,
    //   TEMPERATURE_UUID,
    //   (error, characteristic) => {
    //     if (characteristic?.value == null) {
    //       console.log('Temperature value is null');
    //       return;
    //     }

    //     const tempUpdate = decodeToUint8Array(characteristic?.value)[0];
    //     console.log('Temperature update received: ', tempUpdate);
    //     if (isUpdateRequired(temperature, tempUpdate)) {
    //       setTemperature(tempUpdate);
    //     }
    //   },
    //   TEMPERATURE_TRANSACTION_ID,
    // );

    // device.monitorCharacteristicForService(
    //   SERVICE_UUID,
    //   VOLUME_UUID,
    //   (error, characteristic) => {
    //     if (characteristic?.value == null) {
    //       console.log('Volume value is null');
    //       return;
    //     }

    //     const volumeUpdate = decodeToUint8Array(characteristic?.value)[0];
    //     console.log('Volume update received: ', volumeUpdate);
    //     if (isUpdateRequired(volume, volumeUpdate)) {
    //       setVolume(volumeUpdate);
    //     }
    //   },
    //   VOLUME_TRANSACTION_ID,
    // );
  };

  const readInitialValues = device => {
    // battery
    device
      .readCharacteristicForService(SERVICE_UUID, BATTERY_UUID)
      .then(characteristic => {
        const batteryVal = decodeToUint8Array(characteristic?.value)[0];
        console.log(`initial battery value: ${batteryVal}`);
        setBattery(batteryVal);
      });

    // // temperature
    // device
    //   .readCharacteristicForService(SERVICE_UUID, BATTERY_UUID)
    //   .then(characteristic => {
    //     const tempVal = decodeToUint8Array(characteristic?.value)[0];
    //     console.log(`initial temp value: ${tempVal}`);
    //     setTemperature(tempVal);
    //   });

    // // volume
    // device
    //   .readCharacteristicForService(SERVICE_UUID, BATTERY_UUID)
    //   .then(characteristic => {
    //     const volumeVal = decodeToUint8Array(characteristic?.value)[0];
    //     console.log(`initial volume value: ${volumeVal}`);
    //     setVolume(volumeVal);
    //   });
  };

  const sendValueOverBT = async value => {
    console.log(isConnected);
    if (isConnected) {
      bleManager
        .writeCharacteristicWithResponseForDevice(
          connectedDevice?.id,
          SERVICE_UUID,
          DISPLAY_MODE_UUID,
          encodeFromUint8Array(new Uint8Array([value])),
        )
        .then(characteristic => {
          console.log(
            'Box value changed to :',
            decodeToUint8Array(characteristic.value),
          );
        });
    } else {
      console.log('Not connected to device');
      showSnackbar('Not connected to device');
    }
  };

  const onDisplayModeSelect = displayMode => {
    // if (!isConnected) {
    //   console.log('Not connected to device');
    //   showSnackbar('Not connected to device');
    //   return;
    // }
    setDisplayModeMenuVisible(false);
    // sendValueOverBT(displayMode);
    changeDisplayMode(email, displayMode);
    setSelectedDisplayMode(displayMode);
  };

  const showSnackbar = msg => {
    setSnackbarVisible(true);
    setSnackbarMsg(msg);
  };

  return (
    <Background>
      <Logo />
      <Header>Let’s hydrate</Header>
      <Paragraph>One stop shop for all your hydration needs.</Paragraph>
      {isConnected ? (
        <Button
          mode="contained"
          onPress={() => {
            disconnectDevice();
          }}>
          Disconnect
        </Button>
      ) : (
        <Button
          mode="contained"
          onPress={() => {
            scanDevices();
          }}>
          Connect
        </Button>
      )}

      <View style={styles.row}>
        <Paragraph>volume: {volume}</Paragraph>
      </View>
      <View style={styles.row}>
        <Paragraph>battery: {battery}</Paragraph>
      </View>
      <View style={styles.row}>
        <Paragraph>temperature: {temperature}</Paragraph>
      </View>

      <View style={styles.row}>
        <Menu
          visible={displayModeMenuVisible}
          onDismiss={() => setDisplayModeMenuVisible(false)}
          anchor={
            <Button
              mode="contained"
              onPress={() => setDisplayModeMenuVisible(true)}>
              Bootle display modes
            </Button>
          }>
          {DISPLAY_MODES.map(mode => {
            return (
              <Menu.Item
                key={mode.enum}
                onPress={() => onDisplayModeSelect(mode.enum)}
                title={`Show ${mode.text}`}
                disabled={selectedDisplayMode === mode.enum}
              />
            );
          })}
        </Menu>
      </View>

      <Button
        mode="outlined"
        onPress={() => {
          // TODO go to logout link
          disconnectDevice();
          navigation.reset({
            index: 0,
            routes: [{name: 'StartScreen'}],
          });
        }}>
        Logout
      </Button>
      <Snackbar
        message={snackbarMsg}
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
      />
    </Background>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginTop: 4,
  },
  link: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
});
