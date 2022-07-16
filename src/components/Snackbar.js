import React from 'react';
import {StyleSheet} from 'react-native';
import {Snackbar as PaperSnackbar} from 'react-native-paper';

export const Snackbar = ({message, visible, onDismiss}) => {
    return (
      <PaperSnackbar
        style={styles.snackbar}
        visible={visible}
        onDismiss={onDismiss}>
        {message}
      </PaperSnackbar>
    )
  }

const styles = StyleSheet.create({
snackbar: {
    position: 'absolute',
    top: 1000,
},
});