import React from 'react';
import Background from '../components/Background';
import Logo from '../components/Logo';
import Header from '../components/Header';
import {Button} from 'react-native-paper';
import Paragraph from '../components/Paragraph';
import {View, Text} from 'react-native';

export default function StartScreen({navigation}) {
  return (
    <Background>
      <View style={{marginTop: 70}}>
        <Logo />
      </View>
      <View style={{marginLeft: -150, marginTop: 70}}>
        <Header>Welcome</Header>
      </View>
      <View style={{marginLeft: -200}}>
        <Paragraph>Stay Hydrated.</Paragraph>
      </View>
      <View style={{marginTop: 15, width: '110%'}}>
        <Button
          mode="contained"
          style={{backgroundColor: '#5065A8'}}
          onPress={() => navigation.navigate('LoginScreen')}>
          Login
        </Button>
      </View>
      <View style={{marginTop: 5, width: '110%'}}>
        <Button
          mode="contained"
          style={{backgroundColor: '#5065A8'}}
          onPress={() => navigation.navigate('RegisterScreen')}>
          Sign Up
        </Button>
      </View>
    </Background>
  );
}
