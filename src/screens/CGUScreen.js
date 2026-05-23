import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../config/supabase';
import T from '../theme';


var CGU_VERSION = '3.2';
var CGU_TEXT = 'CONDITIONS GENERALES D\'UTILISATION — Keyla\nVersion ' + CGU_VERSION + ' — Avril 2026\n\n' +
'1. OBJET\nLes presentes Conditions Generales d\'Utilisation (ci-apres « CGU ») regissent l\'acces et l\'utilisation de l\'application mobile Keyla (ci-apres « l\'Application »), editee par Rayane MAZOUNI, entrepreneur individuel sous le regime de la micro-entreprise (auto-entrepreneur), 60 rue Francois 1er, 75008 Paris, SIRET 10032406000019, code APE 6201Z, TVA non applicable art. 293 B du CGI (ci-apres « l\'Editeur »).\n\n' +
'2. ACCEPTATION\nL\'utilisation de l\'Application implique l\'acceptation pleine et entiere des presentes CGU. L\'Utilisateur reconnait avoir pris connaissance des presentes CGU et les accepter expressement avant toute utilisation de l\'Application.\n\n' +
'3. INSCRIPTION ET COMPTES\nL\'inscription est ouverte exclusivement aux personnes physiques majeures de 18 ans revolus minimum et aux personnes morales valablement constituees. L\'Utilisateur garantit l\'exactitude des informations fournies et s\'engage a les maintenir a jour. Trois types de comptes sont disponibles : Hote (proprietaire de logement), Cleaner (prestataire de menage), et Voyageur (utilisateur final).\n\n' +
'4. SERVICES PROPOSES\nL\'Application propose : la mise en relation entre hotes et prestataires de menage, un assistant IA pour la gestion des logements, un systeme de gestion des stocks de fournitures, un systeme de paiement securise via Stripe Connect, une analyse IA des photos de rapport menage, la synchronisation iCal Airbnb/Booking, la generation automatique de factures, et un programme de parrainage.\n\n' +
'5. DONNEES PERSONNELLES ET RGPD\nConformement au Reglement General sur la Protection des Donnees (UE 2016/679) et a la loi Informatique et Libertes du 6 janvier 1978 modifiee :\n- Responsable de traitement : Rayane MAZOUNI (auto-entrepreneur)\n- Donnees collectees : nom, prenom, email, telephone, adresse, donnees de paiement (via Stripe), photos de prestations\n- Finalite : execution du service, facturation, communication\n- Duree de conservation : 3 ans apres derniere activite, puis archivage 7 ans pour obligations comptables\n- Droits : acces, rectification, suppression, portabilite, opposition (contact : myhostkit.contact@gmail.com)\n- Reclamation possible aupres de la CNIL (www.cnil.fr).\n\n' +
'6. COOKIES ET TRACEURS\nL\'Application utilise des cookies techniques necessaires au fonctionnement (session, authentification). Des cookies analytiques anonymises peuvent etre utilises pour ameliorer le service. Aucun cookie publicitaire n\'est utilise.\n\n' +
'7. RESPONSABILITES\nL\'Editeur s\'efforce d\'assurer la disponibilite de l\'Application 24h/24, 7j/7, sans garantie de continuite. L\'Editeur ne saurait etre tenu responsable des dommages directs ou indirects resultant de l\'utilisation de l\'Application, sauf en cas de faute grave ou intentionnelle. L\'Utilisateur est seul responsable de l\'utilisation qu\'il fait de l\'Application et des contenus qu\'il y publie.\n\n' +
'8. PROPRIETE INTELLECTUELLE\nL\'ensemble des elements de l\'Application (textes, images, logos, code source, marques) sont la propriete exclusive de Rayane MAZOUNI (auto-entrepreneur) et proteges par le Code de la propriete intellectuelle. Toute reproduction non autorisee est interdite.\n\n' +
'9. MISE EN RELATION MENAGE\nL\'Application facilite la mise en relation entre hotes et prestataires de menage. Keyla n\'est pas employeur des prestataires et n\'est pas responsable de la qualite des prestations realisees. Les prestataires exercent en tant qu\'independants et sont seuls responsables de leur activite, de leurs obligations sociales et fiscales.\n\n' +
'10. MESSAGERIE\nLes messages echanges via l\'Application sont conserves pour assurer la tracabilite et la resolution des litiges. Les Utilisateurs s\'engagent a ne pas utiliser la messagerie a des fins illicites, frauduleuses ou portant atteinte aux droits d\'autrui.\n\n' +
'11. RESILIATION\nL\'Utilisateur peut supprimer son compte a tout moment via l\'Application ou par email a myhostkit.contact@gmail.com. L\'Editeur peut suspendre ou supprimer un compte en cas de violation des CGU, apres mise en demeure prealable sauf urgence.\n\n' +
'12. TARIFICATION ET PLANS D\'ABONNEMENT\nL\'Application propose differents plans d\'abonnement avec facturation mensuelle :\n\nPlans Hote :\n- Gratuit : 1 logement, commission 15% sur les prestations de menage\n- Starter : 3 logements, commission 10%\n- Pro : logements illimites, commission 5%, IA Concierge, IA Vision, Revenue Intel, sync iCal\n\nPlans Cleaner :\n- Gratuit : 3 logements clients, commission 15% sur les encaissements\n- Pro (19 EUR/mois) : visibilite boostee, commission 10%\n- Business (39 EUR/mois) : badge verifie, gestion d\'equipe, commission 5%\n\n' +
'13. PERIODE D\'ESSAI GRATUITE\nTout nouvel Utilisateur Hote beneficie d\'une periode d\'essai gratuite de 30 jours donnant acces aux fonctionnalites Pro. Aucun moyen de paiement n\'est requis. A l\'issue de la periode, le compte revient en plan Gratuit sauf souscription a un plan payant.\n\n' +
'14. GEL DES LOGEMENTS\nLorsqu\'un Utilisateur depasse la limite de logements de son plan, les logements excedentaires sont geles : ils restent enregistres mais inaccessibles. Les codes d\'acces voyageurs sont desactives. Le degel est immediat des souscription a un plan superieur.\n\n' +
'15. PAIEMENT DES PRESTATIONS\nLe paiement des prestations de menage s\'effectue via Stripe Connect, partenaire bancaire de l\'Application. Les fonds sont places en sequestre (escrow) jusqu\'a validation du rapport par l\'hote ou auto-validation apres 48h. En cas de litige, les fonds sont retenus jusqu\'a resolution.\n\nEn utilisant les services de paiement, l\'Utilisateur accepte egalement les conditions de Stripe : Stripe Connected Account Agreement (https://stripe.com/legal/connect-account) et Stripe Services Agreement (https://stripe.com/legal/ssa).\n\n' +
'16. FACTURATION\nUne facture conforme aux obligations legales francaises (art. 289 CGI) est generee automatiquement apres chaque prestation validee. Mentions obligatoires : identite des parties, description, montant HT, commission Keyla, mentions TVA. Les factures sont conservees 10 ans conformement a la loi.\n\n' +
'17. MÉDIATION DE LA CONSOMMATION\nConformément à l\'article L.612-1 du Code de la consommation, en cas de litige non résolu à l\'amiable avec le service client de Keyla, le consommateur a le droit de recourir gratuitement au médiateur de la consommation suivant :\n\nCM2C - Centre de la Médiation de la Consommation de Conciliateurs de Justice\n49 rue de Ponthieu, 75008 Paris\nTéléphone : 01 89 47 00 14\nSite web : www.cm2c.net\nEmail : cm2c@cm2c.net\n\nLe médiateur peut également être saisi en ligne via la plateforme européenne de règlement en ligne des litiges (RLL) : https://ec.europa.eu/consumers/odr/.\n\nLa saisine du médiateur n\'est possible que si : (i) le consommateur a préalablement contacté le service client par écrit ; (ii) la demande n\'a pas été traitée dans un délai de deux mois ; (iii) le litige n\'a pas été et n\'est pas en cours d\'examen par un tribunal ou un autre médiateur.\n\n' +
'18. LOI APPLICABLE ET JURIDICTION\nDroit applicable : droit francais. Juridiction : tribunaux de Paris, sous reserve des regles imperatives de protection des consommateurs.\n\n' +
'19. MODIFICATION DES CGU\nL\'Editeur peut modifier les CGU a tout moment. Les Utilisateurs seront informes par notification dans l\'Application au moins 15 jours avant l\'entree en vigueur des modifications. La poursuite de l\'utilisation vaut acceptation.\n\n' +
'20. CONTACT\nRayane MAZOUNI — Entrepreneur individuel (auto-entrepreneur)\n60 rue Francois 1er, 75008 Paris\nEmail : myhostkit.contact@gmail.com — Tel : 06 99 34 89 51\nSIRET : 10032406000019 — Code APE : 6201Z';

export default function CGUScreen(props) {
  var _accepted = useState(false); var accepted = _accepted[0]; var setAccepted = _accepted[1];
  var _scrolledToBottom = useState(false); var scrolledToBottom = _scrolledToBottom[0]; var setScrolledToBottom = _scrolledToBottom[1];
  var _loading = useState(false); var loading = _loading[0]; var setLoading = _loading[1];

  function handleScroll(event) {
    var y = event.nativeEvent.contentOffset.y;
    var h = event.nativeEvent.contentSize.height;
    var vh = event.nativeEvent.layoutMeasurement.height;
    if (y + vh >= h - 50) setScrolledToBottom(true);
  }

  function accept() {
    if (!accepted) { Alert.alert('Erreur', 'Vous devez cocher la case pour accepter les CGU.'); return; }
    setLoading(true);
    // Stocker la preuve d'acceptation dans Supabase
    supabase.from('cgu_acceptances').insert({
      user_id: props.session.user.id,
      user_email: props.session.user.email || '',
      user_role: props.role || 'unknown',
      cgu_version: CGU_VERSION,
      device_info: Platform.OS + ' ' + Platform.Version,
      consent_text: 'J\'ai lu et j\'accepte les Conditions Générales d\'Utilisation de Keyla (version ' + CGU_VERSION + ').',
    }).then(function(r) {
      setLoading(false);
      if (r.error) { Alert.alert('Erreur', r.error.message); return; }
      if (props.onAccept) props.onAccept();
    });
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.hdr}><Text style={s.hdrT}>Conditions d'utilisation</Text></View>
      <View style={s.notice}><Text style={{ fontSize: 14 }}>📜</Text><Text style={s.noticeT}>Veuillez lire et accepter les CGU pour continuer</Text></View>

      <ScrollView style={s.cguScroll} onScroll={handleScroll} scrollEventThrottle={100}>
        <Text style={s.cguText}>{CGU_TEXT}</Text>
        <View style={{ height: 30 }} />
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity onPress={function(){ Linking.openURL('https://www.myhostkit.com/cgu.html'); }} style={{paddingVertical:10,alignItems:'center'}}><Text style={{color:'#C8965A',fontSize:13,fontWeight:'600',textDecorationLine:'underline'}}>Voir les CGV completes sur myhostkit.com</Text></TouchableOpacity>
        {!scrolledToBottom && <Text style={s.scrollHint}>↓ Scrollez pour lire la suite</Text>}
        <TouchableOpacity style={s.checkRow} onPress={function() { setAccepted(!accepted); }} activeOpacity={0.7}>
          <View style={[s.checkbox, accepted && s.checkboxChecked]}>{accepted && <Text style={s.checkmark}>✓</Text>}</View>
          <Text style={s.checkText}>J'ai lu et j'accepte les Conditions Générales d'Utilisation de Keyla</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.acceptBtn, (!accepted || !scrolledToBottom) && { opacity: 0.4 }]} onPress={accept} disabled={!accepted || !scrolledToBottom || loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.acceptBtnT}>Accepter et continuer</Text>}
        </TouchableOpacity>
        <Text style={s.legal}>Votre acceptation sera horodatée et conservée conformément à l'article 1366 du Code civil.</Text>
      </View>
    </SafeAreaView>
  );
}

var s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  hdr: { paddingHorizontal: 18, paddingVertical: 14, backgroundColor: T.dark }, hdrT: { fontSize: 18, fontWeight: '600', color: '#fff' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: T.accentLight || '#FDF6EE', borderBottomWidth: 1, borderBottomColor: T.border },
  noticeT: { fontSize: 13, color: T.sub, fontWeight: '500' },
  cguScroll: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  cguText: { fontSize: 13, lineHeight: 22, color: T.text, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  scrollHint: { fontSize: 12, color: T.accent, textAlign: 'center', marginBottom: 8, fontWeight: '600' },
  footer: { paddingHorizontal: 16, paddingVertical: 14, backgroundColor: T.card, borderTopWidth: 1, borderTopColor: T.border },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: T.border, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkboxChecked: { backgroundColor: '#1C5F8A', borderColor: '#1C5F8A' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  checkText: { fontSize: 13, color: T.text, flex: 1, lineHeight: 20 },
  acceptBtn: { backgroundColor: '#1C5F8A', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  acceptBtnT: { color: '#fff', fontSize: 16, fontWeight: '700' },
  legal: { fontSize: 10, color: T.muted, textAlign: 'center', marginTop: 10, lineHeight: 16 },
});
