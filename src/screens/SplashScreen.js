import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

export default function SplashScreen(props) {
  var opacity = new Animated.Value(0);
  var scale = new Animated.Value(0.8);

  useEffect(function() {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();
    var t = setTimeout(function() { if (props.onFinish) props.onFinish(); }, 2200);
    return function() { clearTimeout(t); };
  }, []);

  return (
    <View style={s.c}>
      <Animated.View style={{ opacity: opacity, transform: [{ scale: scale }], alignItems: 'center' }}>
        <Text style={s.logo}>🏠</Text>
        <Text style={s.t}>MyHostKit</Text>
        <Text style={s.sub}>Conciergerie IA</Text>
      </Animated.View>
    </View>
  );
}

var s = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 60, marginBottom: 16 },
  t: { fontSize: 32, fontWeight: '700', color: '#C8965A', marginBottom: 6 },
  sub: { fontSize: 14, color: 'rgba(255,255,255,0.5)', letterSpacing: 1 },
});
