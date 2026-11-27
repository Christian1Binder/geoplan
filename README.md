# GeoPlan 2.1

Browserbasierter, maßhaltiger Lageplaner mit Kartenebenen, Objektbibliothek, Projektordnern, Gruppen, Messungen, Routen, Offline-Paketen und Präsentationsmodus.

[GeoPlan öffnen](https://christian1binder.github.io/geoplan/)

## Bedienung

- Die Karte ist der zentrale Arbeitsbereich. Die Seitenleisten lassen sich einzeln ausblenden und am Desktop in der Breite verstellen.
- Links: Bibliothek (Suche, Favoriten, Symbol-/Listenansicht), Objekte, Route, Team.
- Rechts: Objekt, Ebenen, Karte und Info. Einstellungen stehen im passenden Inspektor statt dauerhaft auf der Karte.
- Die vertikale Werkzeugleiste enthält Auswahl, Rahmen, Distanz, Fläche, Bemaßung, Messabschluss und Abbruch. Raster, Fangfunktion und Präsentation stehen unter Ansicht.
- Auf kleinen Bildschirmen sind die Seitenleisten einblendbar; auf Touch-Geräten kann die Karte mit zwei Fingern verschoben und gezoomt werden.

## Export

Export öffnet eine Vorschau für PNG, JPEG und PDF. Kartenausschnitt, sichtbare Inhalte, Auswahl oder ein markierter Bereich sind möglich. Papierformat A4 bis A0, Ausrichtung und optionaler Druckmaßstab (am Kartenmittelpunkt), Maßstabsleiste und Legende sind wählbar.

Kartenkacheln werden aus lesbaren Anzeigedaten, Cache oder CORS-fähigem Abruf zusammengesetzt. Sichtbarkeit, Reihenfolge und Deckkraft werden berücksichtigt. Fehlende Kacheln werden in der Vorschau und in einem ausdrücklich zugelassenen unvollständigen Export gekennzeichnet. Ein vollständiger Export setzt exportierbare Kartenbilddaten voraus: Fremdserver, die keinen CORS-Zugriff erlauben, können nicht durch die statische App umgangen werden. Die App wechselt in diesem Fall nicht stillschweigend die Kartenquelle. Quellen- und Lizenzangaben bleiben enthalten.

Der PDF-Export erzeugt eine eigenständige einseitige Raster-PDF ohne externe PDF-Bibliothek. Für feste Druckmaßstäbe mit 100 % / tatsächlicher Größe drucken. Kartenprojektion, Bildqualität und die Druckereinstellungen begrenzen die Genauigkeit; kein Vermessungsersatz.

## Individuelle Beschriftungen (2.1)

Im Objektinspektor stehen Name, Abmessungen, Beschreibung und Berücksichtigung beim Export pro Objekt zur Verfügung; Mehrfachauswahl und Gruppenname werden ebenfalls unterstützt. Automatisch entspricht dem bisherigen globalen Verhalten. Exportmodi: Objekteinstellungen übernehmen, alle, keine oder einzelne Namen/Maße/Texte auswählen. Die manuelle Liste lässt sich durchsuchen. Die Einstellungen im Export verändern das Projekt nicht. Objektmaße setzen die Exportoption „Messungen und Maße“ voraus.

## Datenschutz der persönlichen Bibliothek

Eigene Typen und Komplexe werden ausschließlich lokal in IndexedDB und ersatzweise/zusätzlich im LocalStorage des Browsers gespeichert, getrennt vom letzten Projekt. Es gibt keinen Upload, keine Synchronisation, kein Benutzerkonto und keine externe Bibliotheks-API. Die bisherigen lokalen Projektbestände werden migriert. Der separate Bibliothekseditor speichert seine eigene letzte Bibliothek lokal und blockiert Netzwerkzugriffe per Content Security Policy. Die Hauptanwendung erlaubt nur eigene Ressourcen und die erforderlichen Karten- und Routingdienste; Suchbegriffe, Kartenausschnitte und Routenkoordinaten können für diese Dienste übertragen werden, keine Bibliothekseinträge. Offline-Pakete können nur von einem lokalen Webserver geladen werden; enthaltene externe Kartenquellen werden abgelehnt.

Projektdateien, Bibliotheksdateien und Offline-Pakete werden durch bewusst ausgelöste lokale Downloads gespeichert und können private Daten enthalten. Die App kann nicht kontrollieren, ob ein Nutzer diese Dateien anschließend manuell teilt, in einen synchronisierten Ordner speichert oder ob das Betriebssystem bzw. der Browser eigene Sicherungen erstellt. Das Löschen von Browserdaten kann lokale Bibliotheken entfernen. Separate lokale Backups bleiben sinnvoll.

## Dateien und Kompatibilität

Bestehende Projekt-JSONs bleiben kompatibel. Die Hauptanwendung bleibt in index.html, die separate Bibliothek und der vorhandene Service Worker bleiben erhalten. GeoPlan benötigt keinen eigenen Anwendungsserver; Online-Karten und Routen benötigen die jeweiligen Dienste. Lokale Wiederherstellung nutzt IndexedDB zusätzlich zum bisherigen LocalStorage. Projektdateien sind weiterhin die dauerhafte, übertragbare Sicherung.

## Tests

Mit Node.js 22:

```sh
for file in tests/*.cjs; do
  if [ "$file" != "tests/browser-v2.cjs" ]; then node "$file" || exit 1; fi
done
npm install --no-save playwright
npx playwright install chromium
node tests/browser-v2.cjs
```

Die Browserprüfung verwendet kontrollierte Kartenbilder, nicht die Verfügbarkeit öffentlicher Kartendienste. Live-Kartenserver, Safari auf macOS und echte iPad-/Pencil-Gesten sind gesondert zu prüfen. GitHub Actions führt die Regressionstests aus.

## Sicherung

Der Stand vor GeoPlan 2.0 ist im Branch `backup/pre-geoplan-2.0` gesichert.
