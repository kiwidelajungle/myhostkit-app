/* Bandeau cookies + pixels publicitaires (Meta, TikTok, LinkedIn).
 *
 * Règles CNIL respectées :
 *  - aucun traceur publicitaire n'est chargé avant le clic sur « Accepter » ;
 *  - « Refuser » est aussi visible et aussi simple que « Accepter » ;
 *  - le choix est gardé 6 mois, puis redemandé ;
 *  - un lien « Cookies » en bas de page permet de changer d'avis à tout moment.
 *
 * Tant qu'aucun identifiant n'est renseigné ci-dessous, le script ne fait rien
 * (pas de bandeau, pas de lien) : il n'y a alors aucun traceur à consentir.
 */
(function () {
  var CFG = {
    metaPixel: '2604923466641921',        // ex. '123456789012345'  (Gestionnaire d'événements Meta)
    tiktokPixel: '',        // ex. 'CABCDEF1234567890' (TikTok Ads Manager > Événements)
    linkedinPartner: '9813610',    // ex. '1234567'          (LinkedIn Campaign Manager > Insight Tag)
    linkedinConversion: ''  // ex. '12345678'         (conversion « essai démarré »)
  };
  var KEY = 'mhk_consent_v1';
  var SIX_MOIS = 182 * 24 * 3600 * 1000;

  if (!CFG.metaPixel && !CFG.tiktokPixel && !CFG.linkedinPartner) return;

  // Les voyageurs qui règlent un séjour ou une caution passent par
  // activation-reussie.html : on ne les suit jamais.
  var q = new URLSearchParams(location.search);
  if (q.get('caution') || q.get('sejour')) return;

  function lire() {
    try {
      var c = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (c && Date.now() - c.t < SIX_MOIS) return c.ok;
    } catch (e) {}
    return null;
  }
  function ecrire(ok) {
    try { localStorage.setItem(KEY, JSON.stringify({ ok: ok, t: Date.now() })); } catch (e) {}
  }

  // Conversion : abonnement activé (1er mois offert) sur activation-reussie.html,
  // hors retours d'annulation.
  var estConversion = /activation-reussie/.test(location.pathname) && !q.get('statut');

  var charge = false;
  function chargerPixels() {
    if (charge) return; charge = true;
    if (CFG.metaPixel) {
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', CFG.metaPixel);
      fbq('track', 'PageView');
      if (estConversion) fbq('track', 'StartTrial', { value: 0, currency: 'EUR' });
    }
    if (CFG.tiktokPixel) {
      !function (w, d, t) {
        w.TiktokAnalyticsObject = t; var ttq = w[t] = w[t] || [];
        ttq.methods = ['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie','disableCookie'];
        ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))) } };
        for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
        ttq.instance = function (t) { for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]); return e };
        ttq.load = function (e, n) { var i = 'https://analytics.tiktok.com/i18n/pixel/events.js'; ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = i; ttq._t = ttq._t || {}; ttq._t[e] = +new Date; ttq._o = ttq._o || {}; ttq._o[e] = n || {}; var o = d.createElement('script'); o.type = 'text/javascript'; o.async = !0; o.src = i + '?sdkid=' + e + '&lib=' + t; var a = d.getElementsByTagName('script')[0]; a.parentNode.insertBefore(o, a) };
        ttq.load(CFG.tiktokPixel); ttq.page();
        if (estConversion) ttq.track('CompleteRegistration');
      }(window, document, 'ttq');
    }
    if (CFG.linkedinPartner) {
      window._linkedin_partner_id = CFG.linkedinPartner;
      window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
      window._linkedin_data_partner_ids.push(CFG.linkedinPartner);
      (function (l) {
        if (!l) { window.lintrk = function (a, b) { window.lintrk.q.push([a, b]) }; window.lintrk.q = []; }
        var s = document.getElementsByTagName('script')[0], b = document.createElement('script');
        b.type = 'text/javascript'; b.async = true; b.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
        s.parentNode.insertBefore(b, s);
      })(window.lintrk);
      if (estConversion && CFG.linkedinConversion) window.lintrk('track', { conversion_id: Number(CFG.linkedinConversion) });
    }
  }

  var css = '#mhk-cc{position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:560px;margin:0 auto;background:#0B111E;color:#F2EDE1;border:1px solid rgba(199,164,104,.35);border-radius:16px;padding:18px 20px;font:300 14px/1.55 "DM Sans","Helvetica Neue",sans-serif;box-shadow:0 18px 50px rgba(0,0,0,.35)}' +
    '#mhk-cc b{font-weight:500}#mhk-cc a{color:#C7A468}' +
    '#mhk-cc .r{display:flex;gap:10px;margin-top:14px}' +
    '#mhk-cc button{flex:1;padding:11px 14px;border-radius:999px;font:500 14px "DM Sans",sans-serif;cursor:pointer;border:1px solid #C7A468}' +
    '#mhk-cc .no{background:transparent;color:#F2EDE1}#mhk-cc .ok{background:#C7A468;color:#0B111E}' +
    '#mhk-cc-link{position:fixed;left:12px;bottom:10px;z-index:9998;font:400 12px "DM Sans",sans-serif;color:rgba(242,237,225,.55);background:rgba(11,17,30,.6);padding:4px 10px;border-radius:999px;text-decoration:none}';

  function bandeau() {
    if (document.getElementById('mhk-cc')) return;
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var d = document.createElement('div'); d.id = 'mhk-cc'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Cookies');
    d.innerHTML = '<b>Cookies publicitaires</b><br>Avec votre accord, nous utilisons des traceurs (Meta, TikTok, LinkedIn) pour mesurer l\'efficacité de nos publicités. Vous pouvez refuser : le site fonctionne pareil. <a href="/privacy.html#cookies">En savoir plus</a>' +
      '<div class="r"><button class="no" type="button">Refuser</button><button class="ok" type="button">Accepter</button></div>';
    document.body.appendChild(d);
    d.querySelector('.no').onclick = function () { ecrire(false); d.remove(); };
    d.querySelector('.ok').onclick = function () { ecrire(true); d.remove(); chargerPixels(); };
  }

  function lien() {
    if (document.getElementById('mhk-cc-link')) return;
    var a = document.createElement('a'); a.id = 'mhk-cc-link'; a.href = '#'; a.textContent = 'Cookies';
    a.onclick = function (e) {
      e.preventDefault();
      // Retirer un accord déjà donné : on efface le choix et on recharge,
      // pour que les pixels déjà chargés disparaissent de la page.
      if (lire() === true) { try { localStorage.removeItem(KEY); } catch (x) {} location.reload(); return; }
      bandeau();
    };
    document.body.appendChild(a);
  }

  function demarrer() {
    var c = lire();
    if (c === true) chargerPixels();
    else if (c === null) bandeau();
    lien();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer); else demarrer();
})();
