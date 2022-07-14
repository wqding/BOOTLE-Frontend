import React, {useState} from 'react';
import {LogBox, View, StyleSheet} from 'react-native';
import {Text, Checkbox} from 'react-native-paper';
import {
  stringToBool,
  boolToString,
  encodeFromUint8Array,
  decodeToUint8Array,
} from '../utils';
import Background from '../components/Background';
import Logo from '../components/Logo';
import Header from '../components/Header';
import Paragraph from '../components/Paragraph';
import Button from '../components/Button';
import {theme} from '../core/theme';
import {BleManager} from 'react-native-ble-plx';

LogBox.ignoreLogs(['new NativeEventEmitter']); // Ignore log notification by message
LogBox.ignoreAllLogs(); //Ignore all log notifications

const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const ANALOG_READ_UUID = '6d68efe5-04b6-4a85-abc4-c2670b7bf7fd';
const DIGITAL_WRITE_UUID = 'f27b53ad-c63d-49a0-8c0f-9f297e6cc520';

const bleManager = new BleManager();

export default function Dashboard({navigation}) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState();

  const [message, setMessage] = useState('Nothing Yet');
  const [boxChecked, setBoxChecked] = useState(false);

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

  async function disconnectDevice() {
    console.log('Disconnecting start');

    if (connectedDevice != null) {
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
  }

  //Connect the device and start monitoring characteristics
  async function connectDevice(device) {
    console.log('connecting to Device:', device.name);

    device
      .connect()
      .then(device => {
        setConnectedDevice(device);
        setIsConnected(true);
        return device.discoverAllServicesAndCharacteristics();
      })
      .then(device => {
        //  Set what to do when DC is detected
        bleManager.onDeviceDisconnected(device.id, (error, device) => {
          console.log('Device DC');
          setIsConnected(false);
        });

        console.log(device.id);

        //Read inital values

        //Message
        device
          .readCharacteristicForService(SERVICE_UUID, ANALOG_READ_UUID)
          .then(encodedVal => {
            console.log('initial message value');
            console.log(decodeToUint8Array(encodedVal?.value));
            setMessage(decodeToUint8Array(encodedVal?.value));
          });

        //BoxValue
        device
          .readCharacteristicForService(SERVICE_UUID, DIGITAL_WRITE_UUID)
          .then(encodedVal => {
            console.log('initial box value');
            console.log(decodeToUint8Array(encodedVal?.value)[0]);
            setBoxChecked(decodeToUint8Array(encodedVal?.value)[0]);
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

        //BoxValue
        device.monitorCharacteristicForService(
          SERVICE_UUID,
          DIGITAL_WRITE_UUID,
          (error, characteristic) => {
            if (characteristic?.value != null) {
              setBoxChecked(decodeToUint8Array(characteristic?.value)[0]);
              console.log(
                'Box Value update received: ',
                decodeToUint8Array(characteristic?.value),
              );
            }
          },
          'boxtransaction',
        );

        console.log('Connection established');
      });
  }

  async function sendDigitalValue(value) {
    bleManager
      .writeCharacteristicWithResponseForDevice(
        connectedDevice?.id,
        SERVICE_UUID,
        DIGITAL_WRITE_UUID,
        encodeFromUint8Array(new Uint8Array([value])),
      )
      .then(characteristic => {
        console.log(
          'Box value changed to :',
          decodeToUint8Array(characteristic.value),
        );
      });
  }

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
        <Text>message: {message}</Text>
      </View>

      {/* Checkbox */}
      <View style={styles.row}>
        <Checkbox.Android
          status={boxChecked ? 'checked' : 'unchecked'}
          onPress={() => {
            sendDigitalValue(boxChecked);
            setBoxChecked(!boxChecked);
          }}
        />
      </View>

      <Button
        mode="outlined"
        onPress={() =>
          // TODO go to logout link
          navigation.reset({
            index: 0,
            routes: [{name: 'StartScreen'}],
          })
        }>
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
