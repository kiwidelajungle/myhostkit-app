import React, { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

export default function AnimCard({ style, delay, children }) {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 350, delay: delay || 0, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, friction: 8, delay: delay || 0, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={[style, { opacity: fade, transform: [{ translateY: slide }] }]}>{children}</Animated.View>;
}
