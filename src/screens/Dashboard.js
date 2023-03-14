import React, {useEffect, useState, useRef} from 'react';
import {LogBox, View, StyleSheet, Dimensions} from 'react-native';
import {
  encodeFromUint8Array,
  decodeToUint8Array,
  changeDisplayMode,
  isUpdateRequired,
  getWeather,
  updateStats,
} from '../utils';
import {
  SERVICE_UUID,
  TEMPERATURE_UUID,
  BATTERY_UUID,
  HEIGHT_UUID,
  DISPLAY_MODE_UUID,
  DISPLAY_MODES,
  BATTERY_TRANSACTION_ID,
  VOLUME_TRANSACTION_ID,
  TEMPERATURE_TRANSACTION_ID,
} from '../constants';
import {BASE_URL} from '@env';
import Background from '../components/Background';
import Header from '../components/Header';
import Paragraph from '../components/Paragraph';
import Button from '../components/Button';
import {theme} from '../core/theme';
import {Snackbar} from '../components/Snackbar';
import {BleManager} from 'react-native-ble-plx';
import {LineChart} from "react-native-chart-kit";

LogBox.ignoreLogs(['new NativeEventEmitter']); // Ignore log notification by message
LogBox.ignoreAllLogs(); //Ignore all log notifications

const bleManager = new BleManager();
const screenWidth = Dimensions.get("window").width;

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
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }
    // else {
    //   updateStats(email, volume, temperature, battery);
    // }
  }, [email, temperature, volume, battery]);

  const data = {
    labels: ["03-08", "03-09", "03-10", "03-11", "03-12", "03-13", "03-14", "03-15"],
    datasets: [
      {
        data: [874, 0, 748, 804, 651, 1358, 932, 595],
        color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`, // optional
        strokeWidth: 2, // optional
      }
    ],
    legend: ["ml"], // optional
  };
  const emptyData = {
    labels: ["03-08", "03-09", "03-10", "03-11", "03-12", "03-13", "03-14", "03-15"],
    datasets: [
      {
        data: [874, 0, 748, 804, 651, 1358, 932, 595],
        color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`, // optional
        strokeWidth: 2, // optional
      }
    ],
    legend: ["ml"], // optional
  };

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

    // readInitialValues(device);
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

        if (isUpdateRequired(battery, batteryUpdate)) {
          setBattery(batteryUpdate);
        }
      },
      BATTERY_TRANSACTION_ID,
    );

    device.monitorCharacteristicForService(
      SERVICE_UUID,
      TEMPERATURE_UUID,
      (error, characteristic) => {
        if (characteristic?.value == null) {
          console.log('Temperature value is null');
          return;
        }

        const tempUpdate = decodeToUint8Array(characteristic?.value)[0];
        console.log('Temperature update received: ', tempUpdate);
        if (isUpdateRequired(temperature, tempUpdate)) {
          setTemperature(tempUpdate);
        }
      },
      TEMPERATURE_TRANSACTION_ID,
    );

    device.monitorCharacteristicForService(
      SERVICE_UUID,
      HEIGHT_UUID,
      (error, characteristic) => {
        if (characteristic?.value == null) {
          console.log('Volume value is null');
          return;
        }

        const volumeUpdate = decodeToUint8Array(characteristic?.value)[0];
        console.log('Volume update received: ', volumeUpdate);
        if (isUpdateRequired(volume, volumeUpdate)) {
          setVolume(volumeUpdate);
        }
      },
      VOLUME_TRANSACTION_ID,
    );
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

    // temperature
    device
      .readCharacteristicForService(SERVICE_UUID, BATTERY_UUID)
      .then(characteristic => {
        const tempVal = decodeToUint8Array(characteristic?.value)[0];
        console.log(`initial temp value: ${tempVal}`);
        setTemperature(tempVal);
      });

    // volume
    device
      .readCharacteristicForService(SERVICE_UUID, BATTERY_UUID)
      .then(characteristic => {
        const volumeVal = decodeToUint8Array(characteristic?.value)[0];
        console.log(`initial volume value: ${volumeVal}`);
        setVolume(volumeVal);
      });
  };

  const sendValueOverBT = async (characteristicUUID, value) => {
    console.log(isConnected);
    if (isConnected) {
      bleManager
        .writeCharacteristicWithResponseForDevice(
          connectedDevice?.id,
          SERVICE_UUID,
          characteristicUUID,
          encodeFromUint8Array(new Uint8Array([value])),
        )
        .then(characteristic => {
          console.log(
            'Sent value :',
            decodeToUint8Array(characteristic.value),
          );
        });
    } else {
      console.log('Not connected to device');
      showSnackbar('Not connected to device');
    }
  };

  const onDisplayModeSelect = displayMode => {
    if (!isConnected) {
      console.log('Not connected to device');
      showSnackbar('Not connected to device');
      return;
    }

    if (displayMode === 4) {
      getWeather(sendValueOverBT);
    } else {
      sendValueOverBT(DISPLAY_MODE_UUID, displayMode);
    }

    // changeDisplayMode(email, displayMode);
    setSelectedDisplayMode(displayMode);
  };

  const showSnackbar = msg => {
    setSnackbarVisible(true);
    setSnackbarMsg(msg);
  };

  return (
    <Background>
      <View style={{marginBottom: 10}}>
        <View style={{marginLeft: 10}}>
          <Header>Let’s Hydrate!</Header>
        </View>
        {isConnected ? (
          <Button
            mode="contained"
            style={{backgroundColor: '#6a83d4', width: 300}}
            onPress={() => {
              disconnectDevice();
            }}>
            Disconnect
          </Button>
        ) : (
          <Button
            mode="contained"
            style={{backgroundColor: '#6a83d4', width: 300}}
            onPress={() => {
              scanDevices();
            }}>
            Connect
          </Button>
        )}
      </View>

      <View>
        <LineChart
          data={isConnected ? data : data}
          width={screenWidth}
          height={220}
          chartConfig={{
            backgroundGradientFromOpacity: 0,
            backgroundGradientToOpacity: 0,
            color: (opacity = 1) => `rgba(80,101,168, ${opacity})`,
            strokeWidth: 2, // optional, default 3
            yAxisLabel: "milliliters",
            xAxisLabel: "date",
            useShadowColorFromDataset: false // optional
          }}
        />
      </View>

      <View>
        <Header>Bottle Stats</Header>
      </View>

      <View style={styles.row}>
        <Paragraph>💧 Water Full: {volume}%</Paragraph>
      </View>
      <View style={styles.row}>
        <Paragraph>🔋 Battery: {battery}%</Paragraph>
      </View>
      <View style={styles.row}>
        <Paragraph>🌡 Temperature: {temperature}°C</Paragraph>
      </View>

      <View>
        <Header>Display Modes</Header>
      </View>
      {DISPLAY_MODES.map((mode, index) => (
        <Button
          key={index}
          mode="contained"
          style={{backgroundColor: '#6a83d4'}}
          onPress={() => onDisplayModeSelect(mode.enum)}>
          {mode.text}
        </Button>
      ))}

      <Button
        mode="outlined"
        style={{textColor: '#6a83d4'}}
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
  image: {
    width: 50,
    height: 70,
    marginBottom: 8,
    marginLeft: -20,
    flexDirection: 'row',
  },
});
