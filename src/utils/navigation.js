// Helper pour ouvrir les apps de navigation GPS
import { Linking, Platform, Alert } from 'react-native';

export function openNavigation(address, latitude, longitude, appChoice) {
  var hasGps = latitude && longitude;
  var encAddr = encodeURIComponent(address || '');
  var latLng = hasGps ? (latitude + ',' + longitude) : '';

  var urls = {
    waze: {
      app: hasGps ? 'waze://?ll=' + latLng + '&navigate=yes' : 'waze://?q=' + encAddr + '&navigate=yes',
      web: hasGps ? 'https://www.waze.com/ul?ll=' + latLng + '&navigate=yes' : 'https://www.waze.com/ul?q=' + encAddr + '&navigate=yes',
    },
    google: {
      app: Platform.OS === 'ios' 
        ? (hasGps ? 'comgooglemaps://?daddr=' + latLng + '&directionsmode=driving' : 'comgooglemaps://?daddr=' + encAddr + '&directionsmode=driving')
        : (hasGps ? 'google.navigation:q=' + latLng : 'google.navigation:q=' + encAddr),
      web: hasGps ? 'https://www.google.com/maps/dir/?api=1&destination=' + latLng + '&travelmode=driving' : 'https://www.google.com/maps/dir/?api=1&destination=' + encAddr + '&travelmode=driving',
    },
    apple: {
      app: hasGps ? 'maps://?daddr=' + latLng + '&dirflg=d' : 'maps://?daddr=' + encAddr + '&dirflg=d',
      web: hasGps ? 'https://maps.apple.com/?daddr=' + latLng + '&dirflg=d' : 'https://maps.apple.com/?daddr=' + encAddr + '&dirflg=d',
    },
  };

  var choice = urls[appChoice];
  if (!choice) return;

  // Essayer d'ouvrir l'app natif, sinon fallback web
  Linking.canOpenURL(choice.app).then(function(supported) {
    if (supported) {
      Linking.openURL(choice.app).catch(function(){ Linking.openURL(choice.web); });
    } else {
      Linking.openURL(choice.web);
    }
  }).catch(function() {
    Linking.openURL(choice.web);
  });
}

export function showNavigationChoice(address, latitude, longitude) {
  var hasGps = latitude && longitude;
  var title = '🗺️ Itinéraire';
  var msg = (address || '') + (hasGps ? '\n📍 GPS: ' + latitude + ', ' + longitude : '');
  Alert.alert(title, msg, [
    { text: 'Annuler', style: 'cancel' },
    { text: '🚗 Waze', onPress: function(){ openNavigation(address, latitude, longitude, 'waze'); }},
    { text: '🅶 Google Maps', onPress: function(){ openNavigation(address, latitude, longitude, 'google'); }},
    { text: '🍎 Apple Maps', onPress: function(){ openNavigation(address, latitude, longitude, 'apple'); }},
  ]);
}
