/* MyHostKit — décorations Halloween (octobre 2026).
   Ajoute : toiles d'araignée dans les coins, chauves-souris, fantôme
   dans le hero, pastille d'annonce au-dessus du titre. Rien d'autre.
   Désactivation : retirer ce script et halloween.css des pages. */
(function () {
  'use strict';
  if (document.documentElement.dataset.halloween === 'off') return;

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

  function init() {
    var body = document.body;

    // toiles d'araignée
    body.appendChild(el(WEB));
    var right = el(WEB);
    right.classList.remove('left');
    right.classList.add('right');
    body.appendChild(right);

    // chauves-souris
    var sky = document.createElement('div');
    sky.className = 'hw-sky';
    sky.setAttribute('aria-hidden', 'true');
    var bats = [
      { y: '9%', s: '38px', d: '28s', delay: '0s' },
      { y: '16%', s: '26px', d: '34s', delay: '-11s' },
      { y: '6%', s: '20px', d: '40s', delay: '-23s' },
      { y: '22%', s: '30px', d: '31s', delay: '-5s' }
    ];
    bats.forEach(function (b) {
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

    // fantôme dans le hero
    var hero = document.querySelector('.hero');
    if (hero) {
      var ghost = el('<div class="hw-ghost" aria-hidden="true">' + GHOST + '</div>');
      hero.appendChild(ghost);
    }

    // pastille d'annonce au-dessus du titre (hero), sinon rien
    var anchor = document.querySelector('.hero .eyebrow') || document.querySelector('.hero h1');
    if (anchor && !document.querySelector('.hw-pill')) {
      var pill = el(
        '<div class="hw-pill"><span class="hw-ico" aria-hidden="true">🎃</span>' +
        '<span><b>Spécial Halloween</b> · zéro tableur, zéro frayeur.</span></div>'
      );
      anchor.parentNode.insertBefore(pill, anchor);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
