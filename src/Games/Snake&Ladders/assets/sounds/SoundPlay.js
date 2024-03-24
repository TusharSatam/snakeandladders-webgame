// SoundPlayer.js

import Sound from 'react-native-sound';

// Load the sound files
const soundFiles = {
  diceRolling: new Sound(
    require('./diceRolling.mp3'),
    Sound.MAIN_BUNDLE,
    error => {
      if (error) {
        console.log('failed to load the sound', error);
        return;
      }
    },
  ),
  ladderClimbing: new Sound(
    require('./ladderClimbing.mp3'),
    Sound.MAIN_BUNDLE,
    error => {
      if (error) {
        console.log('failed to load the sound', error);
        return;
      }
    },
  ),
};

const playSound =  soundName => {
  const soundFile =  soundFiles[soundName];
  if (!soundFile) {
    console.error(`Sound file '${soundName}' not found`);
    return;
  }

  soundFile.play(success => {
    if (success) {
      console.log('successfully finished playing');
    } else {
      console.log('playback failed due to audio decoding errors');
    }
  });
};

export {playSound};
