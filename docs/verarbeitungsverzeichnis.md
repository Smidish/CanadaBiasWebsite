# Verzeichnis von Verarbeitungstätigkeiten (Art. 30 DSGVO)

**Internes Dokument: wird nicht veröffentlicht und nicht hochgeladen.**
Vorlage mit den Fakten, die sich aus dem Code dieser Website ergeben. Alles mit `TODO` bitte
selbst ausfüllen und prüfen. Das ist eine Arbeitsvorlage, keine Rechtsberatung.

**Verantwortlicher:** TODO: Name, Anschrift, Kontakt
**Datenschutzbeauftragte/r:** TODO: falls benannt, sonst „nicht benannt (nicht erforderlich)“
**Stand:** TODO: Datum

---

## 1. Bereitstellung der Website (Hosting, Server-Logfiles)

| | |
|---|---|
| Zweck | Auslieferung der Website, Betriebssicherheit, Fehleranalyse |
| Rechtsgrundlage | Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse am sicheren Betrieb) |
| Betroffene | Besucherinnen und Besucher der Website |
| Datenkategorien | IP-Adresse, Datum/Uhrzeit, aufgerufene URL, Referrer, Browser/User-Agent, HTTP-Status, übertragene Datenmenge |
| Empfänger / Auftragsverarbeiter | ALL-INKL.COM – Neue Medien Münnich (Hoster), AVV vom TODO: Datum |
| Drittlandübermittlung | keine (Rechenzentrum in Deutschland) |
| Löschfrist | TODO: in den KAS-Logeinstellungen gewählte Frist / Anonymisierung |
| TOM (Art. 32) | HTTPS/TLS, HSTS, Sicherheits-Header (CSP u. a.), FTP nur über TLS mit auf den Site-Ordner beschränktem Unterkonto, keine serverseitige Anwendung und keine Datenbank |

## 2. Reichweitenmessung (Google Analytics 4)

| | |
|---|---|
| Zweck | Anonyme Nutzungsstatistik: Seitenaufrufe, gelesene Pfade, Scrolltiefe |
| Rechtsgrundlage | Einwilligung, Art. 6 Abs. 1 lit. a DSGVO i. V. m. § 25 Abs. 1 TDDDG |
| Betroffene | Besucherinnen und Besucher, die eingewilligt haben |
| Datenkategorien | Online-Kennungen (Cookies `_ga`, `_ga_*`), Geräte- und Browserinformationen, ungefährer Standort (aus der IP abgeleitet; GA4 speichert keine IP-Adressen), Nutzungsdaten |
| Empfänger / Auftragsverarbeiter | Google Ireland Ltd.; Auftragsverarbeitungsbedingungen akzeptiert am TODO: Datum |
| Drittlandübermittlung | USA möglich (Google LLC); Angemessenheitsbeschluss EU-US Data Privacy Framework vom 10.07.2023 |
| Löschfrist | 2 Monate (GA-Einstellung „Datenaufbewahrung“); Cookies nach Widerruf gelöscht |
| TOM | Consent Mode v2 (Basis-Modus: vor der Einwilligung keine Anfrage an Google), Google Signals aus, keine Werbefunktionen, Widerruf jederzeit über „Cookie settings“ |

## 3. Einwilligungsverwaltung (Klaro)

| | |
|---|---|
| Zweck | Einholen, Speichern und Nachweisen der Einwilligung |
| Rechtsgrundlage | Art. 6 Abs. 1 lit. c DSGVO (Nachweispflicht, Art. 7 Abs. 1) |
| Datenkategorien | Einwilligungsstatus, gespeichert im localStorage des Browsers (`scds.consent.v1`) |
| Empfänger | keine (Klaro wird vom eigenen Server geladen, keine Übermittlung) |
| Löschfrist | bis die Nutzerin oder der Nutzer den Browserspeicher löscht oder die Wahl ändert |

## 4. Lokale Speicherung im Browser (Komfortfunktionen)

| | |
|---|---|
| Zweck | Farbschema merken, besuchte Pfade im Menü markieren |
| Rechtsgrundlage | § 25 Abs. 2 Nr. 2 TDDDG (unbedingt erforderlich für den gewünschten Dienst); keine personenbezogene Verarbeitung auf dem Server |
| Datenkategorien | localStorage `scds.theme.v1`, `scds.seen.v1` |
| Empfänger | keine, die Daten verlassen das Gerät nicht |

## 5. Kontakt per E-Mail: TODO, nur falls eine Adresse veröffentlicht wird

| | |
|---|---|
| Zweck | Beantwortung von Anfragen |
| Rechtsgrundlage | Art. 6 Abs. 1 lit. f bzw. lit. b DSGVO |
| Datenkategorien | Name, E-Mail-Adresse, Inhalt der Nachricht |
| Empfänger / Auftragsverarbeiter | TODO: E-Mail-Anbieter (z. B. ALL-INKL, gleicher AVV) |
| Löschfrist | TODO |
