/* MyHostKit — décor de Noël (décembre 2026).
   Ajoute : neige légère, guirlande lumineuse en haut de l'écran,
   pastille d'offre avec compte à rebours au-dessus du titre, encart
   « code promo » sur la page d'activation. Aucun texte de page ni prix
   modifié. L'offre (-50 % pendant 2 mois, code NOEL) s'efface d'elle-même
   après l'échéance ; la remise elle-même est portée par Stripe.
   Désactivation : retirer ce script et noel.css des pages. */
(function () {
  'use strict';
  if (document.documentElement.dataset.noel === 'off') return;

  /* ─── Offre ─── */
  var OFFER = {
    code: 'NOEL',
    label: '-50 % pendant 2 mois',
    // 31 décembre 2026 à 23 h 59 min 59 s, heure de Paris (UTC+1)
    end: Date.parse('2026-12-31T22:59:59Z')
  };
  function remaining() {
    var ms = OFFER.end - Date.now();
    if (ms <= 0) return null;
    var s = Math.floor(ms / 1000);
    var d = Math.floor(s / 86400); s -= d * 86400;
    var h = Math.floor(s / 3600); s -= h * 3600;
    var m = Math.floor(s / 60); s -= m * 60;
    return { d: d, h: h, m: m, s: s };
  }
  function two(n) { return n < 10 ? '0' + n : '' + n; }
  function fmt(r) {
    if (r.d > 0) return r.d + ' j ' + two(r.h) + ' h ' + two(r.m) + ' min';
    if (r.h > 0) return r.h + ' h ' + two(r.m) + ' min ' + two(r.s) + ' s';
    return r.m + ' min ' + two(r.s) + ' s';
  }
  function copyCode(btn) {
    var done = function () {
      var old = btn.textContent;
      btn.textContent = 'Copié';
      btn.classList.add('ok');
      setTimeout(function () { btn.textContent = old; btn.classList.remove('ok'); }, 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(OFFER.code).then(done, done);
    } else { done(); }
  }

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(html) {
    var t = document.createElement('div');
    t.innerHTML = html.trim();
    return t.firstChild;
  }

  /* ─── Guirlande ─── */
  function garland() {
    var w = 1200, n = 24, colors = ['#E0484E', '#D4AF5C', '#3FA46A', '#F4F7FB'];
    var path = 'M0 6';
    for (var i = 0; i < n; i++) {
      var x0 = (w / n) * i, x1 = (w / n) * (i + 1);
      path += ' Q' + ((x0 + x1) / 2) + ' 22 ' + x1 + ' 6';
    }
    var bulbs = '';
    for (var j = 0; j < n; j++) {
      var cx = (w / n) * (j + 0.5);
      var c = colors[j % colors.length];
      bulbs += '<g class="bulb" style="--d:' + ((j % 5) * 0.37).toFixed(2) + 's;--t:' + (2 + (j % 3) * 0.6).toFixed(1) + 's">' +
        '<rect x="' + (cx - 2) + '" y="12" width="4" height="3" rx="1" fill="rgba(242,237,225,.5)"/>' +
        '<ellipse cx="' + cx + '" cy="19.5" rx="4" ry="5.5" fill="' + c + '"/>' +
        '<ellipse cx="' + cx + '" cy="19.5" rx="9" ry="9" fill="' + c + '" opacity=".18"/></g>';
    }
    var node = el(
      '<div class="xm-garland" aria-hidden="true"><svg viewBox="0 0 ' + w + ' 34" preserveAspectRatio="none">' +
      '<path class="wire" d="' + path + '"/>' + bulbs + '</svg></div>'
    );
    document.body.appendChild(node);
    // la guirlande s'efface quand on défile, pour ne pas gêner la lecture
    var onScroll = function () { node.classList.toggle('hide', window.scrollY > 120); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ─── Neige ─── */
  function snow() {
    if (reduce) return;
    var cv = document.createElement('canvas');
    cv.className = 'xm-snow';
    cv.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cv);
    var ctx = cv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var flakes = [], W = 0, H = 0, running = true;

    function size() {
      W = window.innerWidth; H = window.innerHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var target = Math.round(Math.min(70, W / 22)); // neige légère, moins sur mobile
      while (flakes.length < target) flakes.push(make(true));
      flakes.length = target;
    }
    function make(anywhere) {
      return {
        x: Math.random() * W,
        y: anywhere ? Math.random() * H : -10,
        r: 0.8 + Math.random() * 2.2,
        vy: 0.25 + Math.random() * 0.7,
        vx: -0.2 + Math.random() * 0.4,
        ph: Math.random() * Math.PI * 2,
        a: 0.35 + Math.random() * 0.45
      };
    }
    function frame() {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < flakes.length; i++) {
        var f = flakes[i];
        f.ph += 0.01;
        f.x += f.vx + Math.sin(f.ph) * 0.3;
        f.y += f.vy;
        if (f.y > H + 10 || f.x < -10 || f.x > W + 10) flakes[i] = f = make(false);
        ctx.beginPath();
        ctx.fillStyle = 'rgba(244,247,251,' + f.a + ')';
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(frame);
    }
    size();
    window.addEventListener('resize', size);
    document.addEventListener('visibilitychange', function () {
      var wasRunning = running;
      running = !document.hidden;
      if (running && !wasRunning) requestAnimationFrame(frame);
    });
    requestAnimationFrame(frame);
  }

  /* ─── Pastille au-dessus du titre ─── */
  function pill() {
    if (document.querySelector('.xm-pill')) return;
    if (document.querySelector('.offer')) return; // page d'activation : l'encart suffit
    var anchor = document.querySelector('.hero .eyebrow') || document.querySelector('main h1, h1');
    if (!anchor) return;
    var html;
    if (remaining()) {
      html =
        '<div class="xm-pill xm-offer" role="status"><span class="xm-ico" aria-hidden="true">🎄</span>' +
        '<span class="xm-txt"><b>Offre de Noël</b> · ' + OFFER.label + ' avec le code ' +
        '<button type="button" class="xm-code" title="Copier le code">' + OFFER.code + '</button>' +
        '<span class="xm-sep">·</span><span class="xm-left">plus que <b class="xm-cd"></b></span></span></div>';
    } else {
      html =
        '<div class="xm-pill"><span class="xm-ico" aria-hidden="true">🎄</span>' +
        '<span><b>Joyeuses fêtes</b> · essai 14 jours sans carte bancaire</span></div>';
    }
    var node = el(html);
    anchor.parentNode.insertBefore(node, anchor);
    var code = node.querySelector('.xm-code');
    if (code) code.addEventListener('click', function () { copyCode(code); });
  }

  /* ─── Encart sur la page d'activation ─── */
  function activationBox() {
    var offer = document.querySelector('.offer');
    if (!offer || !remaining()) return;
    var box = el(
      '<div class="xm-box" role="status">' +
      '<div class="xm-box-head"><span aria-hidden="true">🎄</span> Offre de Noël : <b>' + OFFER.label + '</b></div>' +
      '<p>Vos deux premiers mois d\'abonnement sont à moitié prix. ' +
      'Sur la page de paiement, cliquez sur <b>« Ajouter un code promotionnel »</b> et saisissez :</p>' +
      '<div class="xm-box-row"><button type="button" class="xm-code big" title="Copier le code">' + OFFER.code + '</button>' +
      '<span class="xm-left">Se termine dans <b class="xm-cd"></b></span></div>' +
      '<small>Valable jusqu\'au 31 décembre 2026 inclus, pour les nouveaux abonnements.</small>' +
      '</div>'
    );
    offer.parentNode.insertBefore(box, offer.nextSibling);
    var code = box.querySelector('.xm-code');
    code.addEventListener('click', function () { copyCode(code); });
  }

  /* ─── Compte à rebours ─── */
  function tick() {
    var r = remaining();
    var nodes = document.querySelectorAll('.xm-cd');
    if (!r) {
      // échéance passée : l'offre disparaît, la pastille redevient « Joyeuses fêtes »
      var offerPill = document.querySelector('.xm-pill.xm-offer');
      if (offerPill) { offerPill.parentNode.removeChild(offerPill); pill(); }
      var box = document.querySelector('.xm-box');
      if (box) box.parentNode.removeChild(box);
      return;
    }
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = fmt(r);
    setTimeout(tick, r.d > 0 ? 30000 : 1000);
  }

  function init() {
    garland();
    snow();
    pill();
    activationBox();
    tick();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
