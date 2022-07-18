import React, {useState} from 'react';
import {LogBox, View, StyleSheet} from 'react-native';
import {Menu} from 'react-native-paper';
import {encodeFromUint8Array, decodeToUint8Array} from '../utils';
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

const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const ANALOG_READ_UUID = '6d68efe5-04b6-4a85-abc4-c2670b7bf7fd';
const DISPLAY_MODE_UUID = 'f27b53ad-c63d-49a0-8c0f-9f297e6cc520';

const DISPLAY_MODES = {
  BATTERY: 0,
  VOLUME: 1,
  TEMPERATURE: 2,
  ALL: 3,
};

const DISPLAY_MODE_TITLES = {
  BATTERY: 'Show battery',
  VOLUME: 'Show volume',
  TEMPERATURE: 'Show temperature',
  ALL: 'Show all',
};

const bleManager = new BleManager();

export default function Dashboard({route, navigation}) {
  const {name, settings} = route.params;
  const [isConnected, setIsConnected] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState();
  const [snackbarVisible, setSnackbarVisible] = useState(true);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  const [message, setMessage] = useState('Nothing Yet');
  const [displayModeMenuVisible, setDisplayModeMenuVisible] = useState(false);

  const scanDevices = () => {
    console.log('scanning');
    // display the Activityindicator

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
        bleManager.cancelTransaction('messagetransaction');
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

  //Connect the device and start monitoring characteristics
  const connectDevice = async device => {
    console.log('connecting to Device:', device.name);

    device = await device.connect();
    setConnectedDevice(device);
    setIsConnected(true);

    device = await device.discoverAllServicesAndCharacteristics();
    bleManager.onDeviceDisconnected(device.id, (error, device) => {
      console.log('Device DC');
      setIsConnected(false);
    });

    console.log(device.id);

    //Message
    device
      .readCharacteristicForService(SERVICE_UUID, ANALOG_READ_UUID)
      .then(encodedVal => {
        console.log('initial message value');
        console.log(decodeToUint8Array(encodedVal?.value));
        setMessage(decodeToUint8Array(encodedVal?.value));
      });

    //Display mode
    device
      .readCharacteristicForService(SERVICE_UUID, DISPLAY_MODE_UUID)
      .then(encodedVal => {
        console.log('initial display mode value');
        console.log(decodeToUint8Array(encodedVal?.value)[0]);
      });

    //monitor values and tell what to do when receiving an update
    //Message
    device.monitorCharacteristicForService(
      SERVICE_UUID,
      ANALOG_READ_UUID,
      (error, characteristic) => {
        if (characteristic?.value != null) {
          console.log(
            'Message update received: ',
            decodeToUint8Array(characteristic?.value),
          );
          setMessage(decodeToUint8Array(characteristic?.value));
        }
      },
      'messagetransaction',
    );

    //Display mode
    device.monitorCharacteristicForService(
      SERVICE_UUID,
      DISPLAY_MODE_UUID,
      (error, characteristic) => {
        if (characteristic?.value != null) {
          console.log(
            'Box Value update received: ',
            decodeToUint8Array(characteristic?.value),
          );
        }
      },
      'boxtransaction',
    );

    console.log('Connection established');
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
    setDisplayModeMenuVisible(false);
    sendValueOverBT(displayMode);
  };

  const showSnackbar = msg => {
    setSnackbarVisible(true);
    setSnackbarMsg(msg);
  };

  return (
    <Background>
      <Snackbar
        message={snackbarMsg}
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
      />
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
        <Paragraph>message: {message}</Paragraph>
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
          <Menu.Item
            onPress={() => onDisplayModeSelect(DISPLAY_MODES.BATTERY)}
            title={DISPLAY_MODE_TITLES.BATTERY}
          />
          <Menu.Item
            onPress={() => onDisplayModeSelect(DISPLAY_MODES.VOLUME)}
            title={DISPLAY_MODE_TITLES.VOLUME}
          />
          <Menu.Item
            onPress={() => onDisplayModeSelect(DISPLAY_MODES.TEMPERATURE)}
            title={DISPLAY_MODE_TITLES.TEMPERATURE}
          />
          <Menu.Item
            onPress={() => onDisplayModeSelect(DISPLAY_MODES.ALL)}
            title={DISPLAY_MODE_TITLES.ALL}
          />
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
