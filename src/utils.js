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
