import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

var { width } = Dimensions.get('window');

var SLIDES_HOST = [
  { icon: '🏠', title: 'Bienvenue sur MyHostKit', subtitle: 'La plateforme tout-en-un pour les hôtes Airbnb & Booking', desc: 'Gérez vos logements, votre ménage, vos stocks et vos voyageurs depuis une seule application.', color: '#1C5F8A', bg: '#E8F4FB' },
  { icon: '🧹', title: 'Trouvez votre ménagère', subtitle: 'En 2 clics, réservez une prestation', desc: 'Recherchez par date et ville, consultez les profils vérifiés avec badge ✓, réservez et suivez en temps réel.', color: '#C8965A', bg: '#FFF4E6' },
  { icon: '📸', title: 'Rapports photo & factures', subtitle: 'Transparence totale', desc: 'Rapport photo pièce par pièce après chaque ménage. Facture légale générée automatiquement avec votre commission affichée.', color: '#34C759', bg: '#E8FBE8' },
  { icon: '📦', title: 'Stock & inventaire', subtitle: 'Plus jamais en rupture', desc: 'Gérez vos produits par logement, recevez des alertes quand un article est en rupture, commandez en un clic.', color: '#1C5F8A', bg: '#E8F4FB' },
  { icon: '💳', title: 'Paiement sécurisé Stripe', subtitle: 'Fonds protégés en séquestre', desc: 'Payez après validation du rapport. Les fonds sont libérés sous 48h. En cas de litige, tout est conservé.', color: '#9B59B6', bg: '#F3E8FB' },
  { icon: '🎁', title: '30 jours gratuits', subtitle: 'Testez tout, sans engagement', desc: 'Accès complet pendant 30 jours. Aucune carte bancaire. Aucun prélèvement automatique.', color: '#C8965A', bg: '#FFF4E6' },
];

var SLIDES_CLEANER = [
  { icon: '🧹', title: 'Bienvenue sur MyHostKit', subtitle: 'La plateforme qui booste votre activité de ménage', desc: 'Trouvez des clients hôtes, gérez vos missions, envoyez des rapports photo et recevez vos paiements automatiquement.', color: '#1C5F8A', bg: '#E8F4FB' },
  { icon: '📅', title: 'Planning intelligent', subtitle: 'Vos disponibilités, vos règles', desc: 'Indiquez vos jours et créneaux disponibles. Les hôtes vous trouvent et réservent. Vous validez chaque mission.', color: '#C8965A', bg: '#FFF4E6' },
  { icon: '⭐', title: 'Boostez votre visibilité', subtitle: 'Badge vérifié ✓ · Priorité dans les recherches', desc: 'Avec le plan Business, apparaissez en premier, affichez le badge vérifié et gérez votre équipe.', color: '#9B59B6', bg: '#F3E8FB' },
  { icon: '📸', title: 'Rapports photo pro', subtitle: 'Prouvez votre travail', desc: 'Prenez des photos pièce par pièce, ajoutez des notes. Le rapport est envoyé automatiquement à l\'hôte avec facture.', color: '#34C759', bg: '#E8FBE8' },
  { icon: '💰', title: 'Paiement garanti', subtitle: 'Recevez votre argent via Stripe', desc: 'L\'hôte paie avant la prestation. Les fonds sont libérés automatiquement après votre rapport. Zéro impayé.', color: '#1C5F8A', bg: '#E8F4FB' },
  { icon: '🎁', title: '30 jours gratuits', subtitle: 'Plan Business offert', desc: 'Accès complet pendant 30 jours : badge vérifié, priorité max, gestion d\'équipe. Sans carte bancaire.', color: '#C8965A', bg: '#FFF4E6' },
];

var SLIDES_GUEST = [
  { icon: '✈️', title: 'Bienvenue voyageur', subtitle: 'Tout pour votre séjour', desc: 'Accédez aux informations de votre logement avec le code fourni par votre hôte.', color: '#1C5F8A', bg: '#E8F4FB' },
  { icon: '🗺️', title: 'GPS intégré', subtitle: 'Trouvez votre logement facilement', desc: 'Lancez Waze, Google Maps ou Apple Maps directement depuis l\'app pour rejoindre le logement.', color: '#34C759', bg: '#E8FBE8' },
  { icon: '📶', title: 'Infos pratiques', subtitle: 'WiFi, code d\'accès, règles', desc: 'Retrouvez le mot de passe WiFi, le code d\'entrée, les horaires de check-in/out et les règles du logement.', color: '#C8965A', bg: '#FFF4E6' },
  { icon: '💬', title: 'Contactez votre hôte', subtitle: 'Chat intégré', desc: 'Un problème ? Contactez votre hôte directement via la messagerie ou signalez un incident.', color: '#9B59B6', bg: '#F3E8FB' },
];

export default function OnboardingScreen(props) {
  var role = props.role || 'host';
  var SLIDES = role === 'cleaner' ? SLIDES_CLEANER : role === 'guest' ? SLIDES_GUEST : SLIDES_HOST;

  var _current = useState(0); var current = _current[0]; var setCurrent = _current[1];
  var fadeAnim = useRef(new Animated.Value(1)).current;

  function goToSlide(index) {
    if (index >= SLIDES.length) {
      // Dernière slide → proposer le parrainage puis continuer
      showReferral();
      return;
    }
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(function() {
      setCurrent(index);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    });
  }

  function showReferral() {
    Alert.alert(
      '🎁 Parrainez, gagnez 7 jours gratuits !',
      'Partagez MyHostKit avec un ami. Quand il s\'inscrit, vous recevez tous les deux 7 jours gratuits sur votre plan.',
      [
        { text: 'Plus tard', onPress: function() { props.onDone(); } },
        { text: '📤 Partager', onPress: function() {
          props.onDone(); // Fermer le tuto AVANT d'ouvrir le partage
          setTimeout(function() {
            Share.share({
              message: '🏠 Rejoins MyHostKit — la plateforme tout-en-un pour les hôtes Airbnb & Booking !\n\n🎁 30 jours GRATUITS :\nhttps://myhostkit.com/download\n\nCode parrain : ' + (props.referralCode || 'MYHOSTKIT'),
              title: 'MyHostKit — 30 jours gratuits',
            }).catch(function() {});
          }, 300);
        }}
      ]
    );
  }

  var slide = SLIDES[current];
  var isLast = current === SLIDES.length - 1;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: slide.bg }]} edges={['top', 'bottom']}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={function() { props.onDone(); }}>
          <Text style={[s.skipT, { color: slide.color }]}>Passer</Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={[s.slideWrap, { opacity: fadeAnim }]}>
        <View style={[s.iconCircle, { backgroundColor: slide.color + '15' }]}>
          <Text style={s.icon}>{slide.icon}</Text>
        </View>
        <Text style={[s.title, { color: slide.color }]}>{slide.title}</Text>
        <Text style={s.subtitle}>{slide.subtitle}</Text>
        <View style={s.descBox}>
          <Text style={s.desc}>{slide.desc}</Text>
        </View>
      </Animated.View>

      <View style={s.dotsRow}>
        {SLIDES.map(function(_, i) {
          var active = i === current;
          return (
            <TouchableOpacity key={i} onPress={function() { goToSlide(i); }}>
              <View style={[s.dot, active && { backgroundColor: slide.color, width: 28 }]} />
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={s.bottomBar}>
        {isLast ? (
          <TouchableOpacity style={[s.btn, { backgroundColor: slide.color }]} onPress={function() { showReferral(); }}>
            <Text style={s.btnT}>Commencer gratuitement →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[s.btn, { backgroundColor: slide.color }]} onPress={function() { goToSlide(current + 1); }}>
            <Text style={s.btnT}>Suivant →</Text>
          </TouchableOpacity>
        )}
        {isLast && <Text style={s.legal}>30 jours gratuits · Aucune carte requise</Text>}
      </View>
    </SafeAreaView>
  );
}

var s = StyleSheet.create({
  safe: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 10 },
  skipT: { fontSize: 15, fontWeight: '600' },
  slideWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  iconCircle: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
  icon: { fontSize: 56 },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 10, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, fontWeight: '600', color: '#333', textAlign: 'center', marginBottom: 16, lineHeight: 22 },
  descBox: { backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 16, padding: 20, maxWidth: 340 },
  desc: { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 22 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 30 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D0D0D0' },
  bottomBar: { paddingHorizontal: 30, paddingBottom: 20 },
  btn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  btnT: { color: '#fff', fontSize: 17, fontWeight: '700' },
  legal: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 10 },
});
