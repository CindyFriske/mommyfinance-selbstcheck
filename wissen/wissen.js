/* ==========================================================================
   MommyFinance Wissensbibliothek
   Erklärt Fachbegriffe direkt im Fließtext, ohne die Leserin von der Seite wegzuschicken.

   Ein erklärtes Wort steht im HTML so:
     <span class="glossar" data-wort="ETF" data-erklaerung="...">ETF</span>

   Hinweis: Funktions- und Variablennamen bleiben bewusst ohne Umlaute. Umlaute sind in
   JavaScript zwar erlaubt, machen aber bei Werkzeugen und beim Kopieren zwischen Systemen
   erfahrungsgemäß Ärger. Alles, was eine Besucherin zu sehen bekommt, steht dagegen mit
   richtigen Umlauten hier drin.

   Bewusste Entscheidungen:
   - Die Blase wird erst bei Bedarf erzeugt und danach wieder entfernt. So liegen nicht
     dutzende versteckte Kästen im Dokument herum.
   - Sie funktioniert per Überfahren mit der Maus UND per Antippen. Auf dem Handy gibt es
     kein Überfahren, dort wäre eine reine Hover-Lösung schlicht unsichtbar.
   - Die Position wird beim Öffnen berechnet und am Fensterrand gespiegelt, damit die Blase
     nie halb aus dem Bild ragt.
   - Ohne JavaScript bleibt der Text vollständig lesbar. Es geht nur die Erklärung verloren,
     kein Inhalt.
   ========================================================================== */
(function () {
  'use strict';

  var offen = null;   // das gerade erklärte Wort
  var blase = null;   // die dazugehörige Blase

  function zumachen() {
    if (blase && blase.parentNode) blase.parentNode.removeChild(blase);
    if (offen) offen.classList.remove('offen');
    blase = null;
    offen = null;
  }

  function aufmachen(wort) {
    if (offen === wort) return;
    zumachen();

    var text = wort.getAttribute('data-erklaerung');
    if (!text) return;

    blase = document.createElement('span');
    blase.className = 'glossar-blase';

    var name = wort.getAttribute('data-wort');
    if (name) {
      var titel = document.createElement('b');
      titel.textContent = name;
      blase.appendChild(titel);
    }
    blase.appendChild(document.createTextNode(text));
    document.body.appendChild(blase);

    // Erst einhängen, dann messen. Vorher kennt der Browser die Größe der Blase nicht.
    var w = wort.getBoundingClientRect();
    var b = blase.getBoundingClientRect();
    var rand = 12;

    var links = w.left + window.scrollX + (w.width / 2) - (b.width / 2);
    links = Math.max(rand, Math.min(links, window.innerWidth - b.width - rand));

    // Standardmäßig darüber. Ist oben kein Platz, klappt sie nach unten.
    var oben = w.top + window.scrollY - b.height - 10;
    if (w.top - b.height - 10 < 0) oben = w.bottom + window.scrollY + 10;

    blase.style.left = links + 'px';
    blase.style.top = oben + 'px';

    wort.classList.add('offen');
    offen = wort;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var woerter = document.querySelectorAll('.glossar');

    Array.prototype.forEach.call(woerter, function (wort) {
      // Für die Tastatur erreichbar machen, sonst kämen Menschen ohne Maus nie an die
      // Erklärung heran.
      if (!wort.hasAttribute('tabindex')) wort.setAttribute('tabindex', '0');
      wort.setAttribute('role', 'button');
      var name = wort.getAttribute('data-wort') || wort.textContent;
      wort.setAttribute('aria-label', name + ', Erklärung anzeigen');

      wort.addEventListener('mouseenter', function () { aufmachen(wort); });
      wort.addEventListener('mouseleave', function () { zumachen(); });
      wort.addEventListener('focus', function () { aufmachen(wort); });
      wort.addEventListener('blur', function () { zumachen(); });

      // Antippen öffnet, nochmal tippen schließt wieder.
      wort.addEventListener('click', function (e) {
        e.stopPropagation();
        if (offen === wort) zumachen(); else aufmachen(wort);
      });

      wort.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); aufmachen(wort); }
        if (e.key === 'Escape') zumachen();
      });
    });

    // Tippen irgendwo sonst schließt die Blase. Wichtig auf dem Handy, sonst bliebe sie
    // stehen, bis man zufällig wieder dasselbe Wort trifft.
    document.addEventListener('click', zumachen);
    window.addEventListener('scroll', zumachen, { passive: true });
    window.addEventListener('resize', zumachen);
  });
})();

/* ==========================================================================
   Das Anmeldeformular an den Funnel anschließen
   Ergänzt am 11.09.2026.

   Vorher war der Knopf bewusst tot gelegt, weil Brevo noch nicht eingerichtet war.
   Jetzt schickt das Formular seine Daten an funnel.mommyfinance.de, dort läuft die
   Anmeldung, und Brevo verschickt die Bestätigungsmail.

   Bewusste Entscheidungen:
   - Die Rückmeldung wird hier erzeugt und nicht ins HTML geschrieben. So bleiben alle
     sechs Themenseiten unverändert und es gibt nur eine Stelle, die man pflegen muss.
   - Wer schon bestätigt hat, wartet nicht auf eine zweite Mail, sondern bekommt sofort
     den Link zu ihrer Bibliothek.
   - Geht etwas schief, steht da nie eine falsche Erfolgsmeldung, sondern ein sichtbarer
     Hinweis mit Cindys Adresse. Lieber eine E-Mail von Hand als eine verlorene Frau.
   ========================================================================== */
(function () {
  'use strict';

  var FUNNEL = 'https://funnel.mommyfinance.de';
  var ZIEL = FUNNEL + '/bibliothek/anmelden';

  function herkunftAusAdresse() {
    // /wissen/kinderdepot/ ergibt "kinderdepot". Damit sieht Cindy im Dashboard,
    // über welches Thema jemand gekommen ist.
    var teile = window.location.pathname.split('/').filter(Boolean);
    return teile.length >= 2 ? teile[teile.length - 1].slice(0, 60) : 'wissen';
  }

  function meldungsfeld(formular) {
    var vorhanden = formular.querySelector('.formular-meldung');
    if (vorhanden) return vorhanden;
    var feld = document.createElement('div');
    feld.className = 'formular-meldung';
    feld.setAttribute('role', 'status');
    feld.setAttribute('aria-live', 'polite');
    var knopf = formular.querySelector('button[type="submit"]');
    formular.insertBefore(feld, knopf);
    return feld;
  }

  function zeige(feld, art, html) {
    feld.className = 'formular-meldung ' + art;
    feld.innerHTML = html;
    feld.style.display = 'block';
  }

  document.addEventListener('DOMContentLoaded', function () {
    var formular = document.querySelector('form.formular');
    if (!formular) return;

    var knopf = formular.querySelector('button[type="submit"]');
    var beschriftung = knopf ? knopf.textContent : '';
    var feld = meldungsfeld(formular);
    feld.style.display = 'none';

    formular.addEventListener('submit', function (e) {
      e.preventDefault();

      var vorname = (formular.querySelector('#vorname') || {}).value || '';
      var email = (formular.querySelector('#email') || {}).value || '';
      var einwilligung = !!(formular.querySelector('#einwilligung') || {}).checked;

      vorname = vorname.trim();
      email = email.trim();

      if (!vorname) return zeige(feld, 'fehler', 'Bitte trag deinen Vornamen ein.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        return zeige(feld, 'fehler', 'Diese E-Mail-Adresse sieht nicht richtig aus.');
      }
      if (!einwilligung) {
        return zeige(feld, 'fehler', 'Bitte setz noch das Häkchen, damit ich dir den Zugang schicken darf.');
      }

      if (knopf) { knopf.disabled = true; knopf.textContent = 'Einen Moment ...'; }
      zeige(feld, 'laeuft', 'Deine Anmeldung geht raus ...');

      fetch(ZIEL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vorname: vorname,
          email: email,
          einwilligung: 'Ja',
          herkunft: herkunftAusAdresse(),
        }),
      })
        .then(function (antwort) {
          return antwort.json().then(function (daten) {
            return { status: antwort.status, daten: daten };
          });
        })
        .then(function (ergebnis) {
          var daten = ergebnis.daten || {};

          if (!daten.ok) {
            throw new Error(daten.fehler || 'unbekannt');
          }

          if (daten.bestaetigungNoetig === false && daten.zugang) {
            formular.reset();
            zeige(feld, 'erfolg',
              '<strong>Du bist schon dabei.</strong><br>' +
              'Deine Bibliothek steht bereits offen, du brauchst keine neue Bestätigung. ' +
              '<a href="' + FUNNEL + daten.zugang + '">Hier geht es zu deinen Leitfäden.</a>');
          } else {
            formular.reset();
            zeige(feld, 'erfolg',
              '<strong>Fast geschafft.</strong><br>' +
              'Ich habe dir gerade eine E-Mail geschickt. Klick darin auf den Knopf, ' +
              'dann ist dein Zugang offen. Schau bitte auch kurz im Spam-Ordner nach.');
          }
          if (knopf) knopf.textContent = beschriftung;
        })
        .catch(function (fehler) {
          var text = String(fehler && fehler.message) || '';
          var bekannt = text && text !== 'unbekannt' && text.indexOf('Failed to fetch') === -1;
          zeige(feld, 'fehler',
            (bekannt ? text : 'Da ist gerade etwas schiefgelaufen.') +
            '<br>Schreib mir bitte kurz an ' +
            '<a href="mailto:cindy@mommyfinance.de?subject=Zugang%20zur%20PDF-Bibliothek">' +
            'cindy@mommyfinance.de</a>, dann schalte ich dich von Hand frei.');
          if (knopf) { knopf.disabled = false; knopf.textContent = beschriftung; }
        });
    });
  });
})();
