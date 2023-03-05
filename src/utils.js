import {btoa, atob} from 'abab';
import {BASE_URL} from '@env';
import {WEATHER_UUID, DISPLAY_MODE_UUID} from './constants';

export const encodeFromUint8Array = arr => {
  return btoa(String.fromCharCode(...Array.from(arr)));
};

export const decodeToUint8Array = str => {
  return Uint8Array.from(
    atob(str)
      .split('')
      .map(s => s.charCodeAt(0)),
  );
};

export const validateEmail = email => {
  const re = /\S+@\S+\.\S+/;
  if (!email) {
    return "Email can't be empty.";
  }
  if (!re.test(email)) {
    return 'Ooops! We need a valid email address.';
  }
  return '';
};

export const validateName = name => {
  if (!name) {
    return "Name can't be empty.";
  }
  return '';
};

export const validatePassword = password => {
  if (!password) {
    return "Password can't be empty.";
  }
  if (password.length < 5) {
    return 'Password must be at least 5 characters long.';
  }
  return '';
};

export const encodeJsonToForm = jsonBody => {
  var formBody = [];
  for (var key in jsonBody) {
    var encodedKey = encodeURIComponent(key);
    var encodedValue = encodeURIComponent(jsonBody[key]);
    formBody.push(encodedKey + '=' + encodedValue);
  }
  formBody = formBody.join('&');
  return formBody;
};

export const stringToBool = string => {
  if (string === '1') {
    return true;
  } else {
    return false;
  }
};

export const boolToString = bool => {
  if (bool === true) {
    return '1';
  } else {
    return '0';
  }
};

export const getWeather = callback => {
  fetch(
    'https://api.open-meteo.com/v1/forecast?latitude=43.464681&longitude=-80.527721&current_weather=true',
  )
    .then(res => res.json())
    .then(res => {
      console.log(res);
      callback(WEATHER_UUID, res.current_weather.temperature);
      callback(DISPLAY_MODE_UUID, 4);
    })
    .catch(err => {
      console.log('Failed to update display mode: ', err);
    });
};

export const changeDisplayMode = (email, mode) => {
  fetch(BASE_URL + '/settings/display', {
    method: 'POST',
    headers: {
      Accept: 'application/x-www-form-urlencoded',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: encodeJsonToForm({email: email, mode: mode}),
  })
    .then(res => {
      console.log(res);
      if (res.status === 200) {
        console.log('Sucessfully updated display mode.');
      } else {
        console.log('Failed to update display mode.');
      }
    })
    .catch(err => {
      console.log('Failed to update display mode: ', err);
    });
};

export const updateStats = (email, volume, temperature, battery) => {
  fetch(BASE_URL + '/stats', {
    method: 'POST',
    headers: {
      Accept: 'application/x-www-form-urlencoded',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: encodeJsonToForm({
      email: email,
      volume: volume,
      temperature: temperature,
      battery: battery,
    }),
  })
    .then(res => {
      if (res.status === 200) {
        console.log('Sucessfully updated stats.');
      } else {
        console.log('Failed to update stats.');
      }
    })
    .catch(err => {
      console.log('Failed to update stats: ', err);
    });
};

export const isUpdateRequired = (pastVal, currVal) => {
  if (pastVal == currVal) {
    return false;
  }

  if (pastVal == 0 || pastVal == null) {
    return true;
  }

  if (Math.abs(currVal - pastVal) / Math.abs(pastVal) >= 0.05) {
    return true;
  }
  return false;
};
