import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, PressableProps } from 'react-native';

interface PressableHapticsProps extends PressableProps {
  hapticStyle?: 
    | Haptics.ImpactFeedbackStyle.Light
    | Haptics.ImpactFeedbackStyle.Medium
    | Haptics.ImpactFeedbackStyle.Heavy;
  disableHaptics?: boolean;
}

export const PressableHaptics: React.FC<PressableHapticsProps> = ({
  onPressIn,
  hapticStyle = Haptics.ImpactFeedbackStyle.Light,
  disableHaptics = false,
  ...restProps
}) => {
  const handlePressIn = (event: any) => {
    if (!disableHaptics) {
      Haptics.impactAsync(hapticStyle);
    }
    
    if (onPressIn) {
      onPressIn(event);
    }
  };

  return <Pressable onPressIn={handlePressIn} {...restProps} />;
};