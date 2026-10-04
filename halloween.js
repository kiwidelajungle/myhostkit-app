/* MyHostKit — décorations et offre Halloween (octobre 2026).
   Ajoute : toiles d'araignée, chauves-souris, fantôme dans le hero,
   pastille d'offre avec compte à rebours, encart « code promo » sur
   la page d'activation. Rien d'autre.
   L'offre (-50 % pendant 2 mois, code HALLOWEEN) s'efface d'elle-même
   après l'échéance ; la remise elle-même est vérifiée par Stripe.
   Désactivation : retirer ce script et halloween.css des pages. */
(function () {
  'use strict';
  if (document.documentElement.dataset.halloween === 'off') return;

  /* ─── Offre ─── */
  var OFFER = {
    code: 'HALLOWEEN',
    label: '-50 % pendant 2 mois',
    // 1er novembre 2026 à 23 h 59 min 59 s, heure de Paris (UTC+1 après le 25/10)
    end: Date.parse('2026-11-01T22:59:59Z')
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

  /* ─── Dessins ─── */
  var BAT =
    '<svg viewBox="0 0 64 32" fill="currentColor" aria-hidden="true">' +
    '<path d="M32 10c-2 0-3.5 1.6-4 3.5C25 9 18 6 10 8c3 2 4 5 3 8-4-1-8 0-11 2 5 1 8 4 9 8 2-2 6-3 9-1 2 2 4 5 4 8 2-3 5-5 8-5s6 2 8 5c0-3 2-6 4-8 3-2 7-1 9 1 1-4 4-7 9-8-3-2-7-3-11-2-1-3 0-6 3-8-8-2-15 1-18 5.5-.5-1.9-2-3.5-4-3.5z"/>' +
    '</svg>';

  var GHOST =
    '<svg viewBox="0 0 54 64" aria-hidden="true">' +
    '<path d="M27 2C14 2 5 12 5 26v30c0 3 3 4 5 2l4-4 4 4c2 2 4 2 6 0l3-4 3 4c2 2 4 2 6 0l4-4 4 4c2 2 5 1 5-2V26C49 12 40 2 27 2z" fill="#F2EDE1"/>' +
    '<ellipse cx="19" cy="26" rx="3.6" ry="5" fill="#2A1240"/><ellipse cx="35" cy="26" rx="3.6" ry="5" fill="#2A1240"/>' +
    '<ellipse cx="27" cy="38" rx="4" ry="3" fill="#2A1240"/>' +
    '</svg>';

  var WEB =
    '<svg class="hw-web left" viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true">' +
    '<path d="M0 0L200 0M0 0L0 200M0 0L190 60M0 0L150 120M0 0L100 160M0 0L60 190"/>' +
    '<path d="M40 0Q38 22 0 40M80 0Q74 44 0 80M120 0Q110 66 0 120M160 0Q146 88 0 160M200 0Q182 110 0 200"/>' +
    '</svg>';

  function el(html) {
    var t = document.createElement('div');
    t.innerHTML = html.trim();
    return t.firstChild;
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

  /* ─── Décor ─── */
  function decorate() {
    var body = document.body;

    body.appendChild(el(WEB));
    var right = el(WEB);
    right.classList.remove('left');
    right.classList.add('right');
    body.appendChild(right);

    var sky = document.createElement('div');
    sky.className = 'hw-sky';
    sky.setAttribute('aria-hidden', 'true');
    [
      { y: '9%', s: '38px', d: '28s', delay: '0s' },
      { y: '16%', s: '26px', d: '34s', delay: '-11s' },
      { y: '6%', s: '20px', d: '40s', delay: '-23s' },
      { y: '22%', s: '30px', d: '31s', delay: '-5s' }
    ].forEach(function (b) {
      var bat = document.createElement('div');
      bat.className = 'hw-bat';
      bat.style.setProperty('--y', b.y);
      bat.style.setProperty('--s', b.s);
      bat.style.setProperty('--d', b.d);
      bat.style.setProperty('--delay', b.delay);
      bat.innerHTML = BAT;
      sky.appendChild(bat);
    });
    body.appendChild(sky);

    var hero = document.querySelector('.hero');
    if (hero) hero.appendChild(el('<div class="hw-ghost" aria-hidden="true">' + GHOST + '</div>'));
  }

  /* ─── Pastille d'offre au-dessus du titre ─── */
  function pill() {
    if (document.querySelector('.hw-pill')) return;
    if (document.querySelector('.offer')) return; // page d'activation : l'encart suffit
    var anchor = document.querySelector('.hero .eyebrow') || document.querySelector('main h1, h1');
    if (!anchor) return;
    var r = remaining();
    var html;
    if (r) {
      html =
        '<div class="hw-pill hw-offer" role="status"><span class="hw-ico" aria-hidden="true">🎃</span>' +
        '<span class="hw-txt"><b>Offre Halloween</b> · ' + OFFER.label + ' avec le code ' +
        '<button type="button" class="hw-code" title="Copier le code">' + OFFER.code + '</button>' +
        '<span class="hw-sep">·</span><span class="hw-left">plus que <b class="hw-cd"></b></span></span></div>';
    } else {
      html =
        '<div class="hw-pill"><span class="hw-ico" aria-hidden="true">🎃</span>' +
        '<span><b>Spécial Halloween</b> · zéro tableur, zéro frayeur.</span></div>';
    }
    var node = el(html);
    anchor.parentNode.insertBefore(node, anchor);
    var code = node.querySelector('.hw-code');
    if (code) code.addEventListener('click', function () { copyCode(code); });
  }

  /* ─── Encart sur la page d'activation ─── */
  function activationBox() {
    var offer = document.querySelector('.offer');
    if (!offer || !remaining()) return;
    var box = el(
      '<div class="hw-box" role="status">' +
      '<div class="hw-box-head"><span aria-hidden="true">🎃</span> Offre Halloween : <b>' + OFFER.label + '</b></div>' +
      '<p>Après votre 1ᵉʳ mois offert, vos deux premiers mois facturés sont à moitié prix. ' +
      'Sur la page de paiement, cliquez sur <b>« Ajouter un code promotionnel »</b> et saisissez :</p>' +
      '<div class="hw-box-row"><button type="button" class="hw-code big" title="Copier le code">' + OFFER.code + '</button>' +
      '<span class="hw-left">Se termine dans <b class="hw-cd"></b></span></div>' +
      '<small>Valable jusqu\'au 1ᵉʳ novembre 2026 inclus, pour les nouveaux abonnements.</small>' +
      '</div>'
    );
    offer.parentNode.insertBefore(box, offer.nextSibling);
    var code = box.querySelector('.hw-code');
    code.addEventListener('click', function () { copyCode(code); });
  }

  /* ─── Compte à rebours ─── */
  function tick() {
    var r = remaining();
    var nodes = document.querySelectorAll('.hw-cd');
    if (!r) {
      // échéance passée : l'offre disparaît, la pastille redevient neutre
      var offerPill = document.querySelector('.hw-pill.hw-offer');
      if (offerPill) { offerPill.parentNode.removeChild(offerPill); pill(); }
      var box = document.querySelector('.hw-box');
      if (box) box.parentNode.removeChild(box);
      return;
    }
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = fmt(r);
    setTimeout(tick, r.d > 0 ? 30000 : 1000);
  }

  function init() {
    decorate();
    pill();
    activationBox();
    tick();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
