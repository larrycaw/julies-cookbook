# Julies kokebok

En privat kokebok for Julie og Isak, med norske tekster, pasteller, oppskrifter,
matbilder, favoritter, porsjonsberegning, handleliste og bilde-/tekstimport.

Denne checkouten viderefører den eksisterende Sites-appen som en statisk
React/Vite-app for GitHub Pages. Originalen er fortsatt tilgjengelig på
<https://julies-kokebok.creamyelm32.chatgpt.site> og er ikke endret.

## Status

- Utseendet, oppskriftsredigeringen, porsjonsberegningen, handlelisten,
  eksempeloppskriftene og lokal OCR er bevart.
- Bygget fungerer under repositoryets undermappe på GitHub Pages. Fonter,
  favicon og OCR-filer bruker samme grunnsti.
- Serveravhengighetene fra Sites er erstattet med en tydelig backend-kontrakt
  i `lib/backend.ts`. Den er ennå ikke koblet til Firebase.
- Produksjonsbygget viser en låst inngang. Google-knappen er deaktivert frem
  til ekte innlogging, tilgangsregler og lagring er konfigurert og testet.
- Oppskrifter, handleliste og bilder fra den opprinnelige appen er **ikke**
  migrert. Kildekoden inneholder bare eksempeloppskrifter.
- Nettimport trenger en autentisert serverfunksjon. GitHub Pages kan ikke
  kjøre den gamle serverruten, og nettleserens CORS-regler hindrer direkte
  import fra de fleste oppskriftssider. Tekst- og bildeimport er bevart.

## Lokal forhåndsvisning

Krever Node.js 24 eller nyere:

```sh
npm ci
npm run dev
```

Åpne adressen Vite skriver ut. Legg til `?preview=1` på localhost for å
prøve kokebokgrensesnittet med midlertidige data. Forhåndsvisningen er tydelig
merket og finnes bare i utviklingsmodus. Endringer forsvinner når siden lastes
på nytt. Den er ikke en innlogging og kobler ikke til private data.

## Kontroller

```sh
npm run check
npm test
npm run test:ocr
PAGES_BASE_PATH=/julies-kokebok/ npm run build
```

Testene dekker norsk porsjonsberegning, ingredienser, importparsing,
handlelistegruppering, låst backend, samtidige redigeringer og stabile
ID-er ved gjentatte forsøk. OCR-testen leser en ekte oppskriftsbildefil med
norske og engelske språkfiler fra de installerte pakkene.

## GitHub Pages

Målet er `larrycaw/julies-kokebok`. Repositoryet må opprettes før publisering.
Arbeidsmappen ble opprinnelig klargjort for det tomme `julies-cookbook`-
repositoryet; ingen kode er sendt dit.

1. Opprett `julies-kokebok` under GitHub-kontoen `larrycaw`.
2. Send denne checkouten til repositoryets `main`-gren.
3. Velg **Settings → Pages → Source → GitHub Actions**.
4. Arbeidsflyten `.github/workflows/pages.yml` kjører tester, bygger appen og
   publiserer `dist/`. Stien følger repositoryets navn automatisk.

Med innlogget GitHub CLI og en ren, committet checkout kan disse trinnene
gjøres med `npm run publish:github`. Skriptet oppretter repositoryet dersom
det mangler, sender gjeldende commit til `main` og starter Pages-arbeidsflyten.
Det overskriver ikke eksisterende Git-historikk eller et annet Pages-oppsett.
Det starter en publisering; resultatet må kontrolleres i GitHub Actions.

Adressen blir normalt <https://larrycaw.github.io/julies-kokebok/>.
Dette er en forventet adresse, ikke en bekreftet publisering.

## Gjenstående Firebase-arbeid

Før inngangen åpnes, må et valgt Firebase-prosjekt være tilgjengelig gjennom
en autentisert CLI eller MCP-forbindelse. Det nåværende miljøet blokkerer
`auth.firebase.tools`, og har ingen Firebase-innlogging eller prosjekt-ID.

1. Opprett eller velg Firebase-prosjekt og webapp; hent webkonfigurasjonen.
2. Identifiser databasens utgave før valg av SDK og implementering av adapter.
3. Aktiver Google-innlogging og legg `larrycaw.github.io` til autoriserte
   domener. Legg også til `localhost` ved lokal testing.
4. Implementer en adapter for `CookbookBackend` med privat felles lagring,
   bilder, versjonskontroll og idempotente handlelisteoperasjoner.
5. Håndhev de to avtalte Google-kontoene i backendens sikkerhetsregler.
   En sjekk i grensesnittet alene gir ingen beskyttelse.
6. Koble innloggingsstatus til adapteren. Ved utlogging eller tilbakekalt
   tilgang må abonnenter, bilder og privat klienttilstand fjernes.
7. Flytt nettimport til en autentisert funksjon med samme målbegrensninger,
   tidsgrenser og størrelsesgrenser som originalen.
8. Test at begge kontoene kan lese og redigere, at andre kontoer avvises,
   og at samtidige redigeringer gir konflikt. Migrer eksisterende data bare
   etter at ny privat lagring er verifisert.

Ikke legg tjenestekontonøkler, CLI-tokens eller private oppskrifter i Git.
