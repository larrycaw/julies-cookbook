# Julies kokebok

En privat kokebok for Julie og Isak, med norske tekster, pasteller, oppskrifter,
matbilder, favoritter, porsjonsberegning, handleliste og bilde-/tekstimport.

Denne checkouten viderefører den eksisterende Sites-appen som en statisk
React/Vite-app for GitHub Pages. Originalen er fortsatt tilgjengelig på
<https://julies-kokebok.creamyelm32.chatgpt.site> og er ikke endret.

## Offentlig demo

GitHub Pages bygger som standard en demo med `VITE_COOKBOOK_DEMO=1`. Den åpner
kokeboken direkte med eksempeloppskrifter, redigering, bilder, porsjoner og
handleliste. Endringer lever bare mens siden er åpen og forsvinner ved reload;
**Nullstill demo** starter på nytt. Nettimport krever fortsatt en tilkoblet
server; tekst- og bildeimport kan prøves i demoen.

Demoen initialiserer ikke Firebase og laster ikke ekte kontoer eller data.
For en vanlig innloggingsbeskyttet byggversjon utelates demo-variabelen.

## Status

- Utseendet, oppskriftsredigeringen, porsjonsberegningen, handlelisten,
  eksempeloppskriftene og lokal OCR er bevart.
- Bygget fungerer under repositoryets undermappe på GitHub Pages. Fonter,
  favicon og OCR-filer bruker samme grunnsti.
- Serveravhengighetene fra Sites er erstattet med en tydelig backend-kontrakt
  i `lib/backend.ts`. Den er ennå ikke koblet til Firebase.
- E-postinnlogging med Firebase Auth er implementert: opprett passord første
  gang, bruk samme passord senere, bekreft e-post og gjenopprett glemt passord.
  Innloggingen er deaktivert frem til webkonfigurasjon og serverfunksjoner
  er koblet til et valgt Firebase-prosjekt.
- Kontooppslaget og tilgangssjekken sjekker de to godkjente e-postadressene
  på serveren. Verifisert innlogging åpner foreløpig en status for den
  gjenstående datatilkoblingen; oppskrifter og handleliste er ennå ikke koblet
  til Firebase.
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
merket. Endringer forsvinner når siden lastes
på nytt. Den er ikke en innlogging og kobler ikke til private data.

## Kontroller

```sh
npm run check
npm test
npm ci --prefix functions
npm --prefix functions run build
npm run test:auth
npm run test:ocr
PAGES_BASE_PATH=/julies-cookbook/ VITE_COOKBOOK_DEMO=1 npm run build
```

Testene dekker norsk porsjonsberegning, ingredienser, importparsing,
handlelistegruppering, låst backend, samtidige redigeringer og stabile
ID-er ved gjentatte forsøk. OCR-testen leser en ekte oppskriftsbildefil med
norske og engelske språkfiler fra de installerte pakkene.

Auth-emulatortesten bruker et isolert demoprosjekt. Den kontrollerer faktisk
passordopprettelse, e-postbekreftelse, innlogging, feil passord, passordbytte
og kontoer som allerede finnes uten passord. Den leser eller endrer ingen
produksjonskontoer.

## E-post først, passord første gang

1. Brukeren skriver e-postadressen. `emailSignInOptions` undersøker kontoen
   bare hvis adressen er invitert til kokeboken.
2. En ny konto får **Opprett passord** og **Bekreft passord**. Passordet må ha
   minst 12 tegn. Firebase Auth håndterer lagringen; appen legger aldri
   passordet i localStorage, logger eller konfigurasjonsfiler.
3. Brukeren bekrefter e-postadressen med Firebase sin e-postlenke før
   innloggingen godkjennes av `validateCookbookAccess`.
4. Neste gang vises **Passord** og **Logg inn**. **Glemt passord** sender
   en lenke for å velge et nytt passord.
5. En eksisterende konto uten passord, for eksempel fra Google, får en
   e-postlenke for å opprette passord uten å lage en ekstra konto.

Vanlige besøkende kan ikke slå opp vilkårlige kontoer. Løsningen bruker ikke
`fetchSignInMethodsForEmail`, som ikke gir pålitelige førstegangsoppslag når
Firebase sin beskyttelse mot e-postoppslag er aktivert.

For aktivering: kopier `.env.example` til en lokal `.env` og fyll inn
webkonfigurasjonen. Sett samme fire `VITE_FIREBASE_*` verdier under repositoryets
**Settings → Secrets and variables → Actions → Variables** for Pages-bygget.
Dette er offentlige Firebase-webverdier, ikke tjenestekontonøkler.
Tilgangslisten `COOKBOOK_EMAILS` ligger i en ignorert `functions/.env` lokalt;
en nedlastet kildekodepakke inneholder bare `functions/.env.example` og må
få de to avtalte adressene før serverfunksjonene deployes.

Aktiver e-post/passord i Firebase Auth, sett prosjektets passordpolicy til
minst 12 tegn og legg til `larrycaw.github.io` som godkjent domene for
e-postlenker. Behold prosjektets eksisterende godkjente domener. Firebase sin
innebygde side håndterer bekreftelses- og tilbakestillingslenkene og sender
brukeren tilbake til kokeboken. Deploy `auth` og `functions:cookbook-auth`
med `npx -y firebase-tools@latest deploy --project <prosjekt-id> --only auth,functions:cookbook-auth`
etter at prosjekt og konto er valgt. Serverfunksjonene ligger i `europe-west1`.
Cloud Functions krever at prosjektet støtter funksjonsdeploy, vanligvis Blaze.

## GitHub Pages

Demoen bruker det tilkoblede repositoryet `larrycaw/julies-cookbook` og er
publisert på <https://larrycaw.github.io/julies-cookbook/>.

1. Bruk `julies-cookbook` under GitHub-kontoen `larrycaw`.
2. Send denne checkouten til repositoryets `main`-gren.
3. Pages er aktivert fra **gh-pages / (root)**. Behold denne innstillingen.
4. Arbeidsflyten `.github/workflows/pages.yml` kjører tester, bygger appen og
   sender `dist/` til `gh-pages` og ber GitHub bygge Pages. Stien følger
   repositoryets navn automatisk.

Med innlogget GitHub CLI og en ren, committet checkout kan gjeldende commit
sendes til `main` med `npm run publish:github`. Pushen starter demo-arbeidsflyten.
Skriptet overskriver ikke eksisterende Git-historikk. Resultatet kontrolleres
i GitHub Actions.

Den publiserte siden er en demo med midlertidige data. E-postinnloggingen og
felles lagring trenger fortsatt et tilkoblet Firebase-prosjekt.

## Gjenstående Firebase-arbeid

Før inngangen åpnes, må et valgt Firebase-prosjekt være tilgjengelig gjennom
en autentisert CLI eller MCP-forbindelse. Det nåværende miljøet blokkerer
`auth.firebase.tools`, og har ingen Firebase-innlogging eller prosjekt-ID.

1. Opprett eller velg Firebase-prosjekt og webapp; hent webkonfigurasjonen.
2. Identifiser databasens utgave før valg av SDK og implementering av adapter.
3. Aktiver e-post/passord, deploy innloggingsfunksjonene og legg
   `larrycaw.github.io` til autoriserte domener. Legg også til `localhost`
   ved lokal testing.
4. Implementer en adapter for `CookbookBackend` med privat felles lagring,
   bilder, versjonskontroll og idempotente handlelisteoperasjoner.
5. Håndhev de to avtalte e-postkontoene og bekreftet e-post i backendens sikkerhetsregler.
   En sjekk i grensesnittet alene gir ingen beskyttelse.
6. Koble innloggingsstatus til adapteren. Ved utlogging eller tilbakekalt
   tilgang må abonnenter, bilder og privat klienttilstand fjernes.
7. Flytt nettimport til en autentisert funksjon med samme målbegrensninger,
   tidsgrenser og størrelsesgrenser som originalen.
8. Test at begge kontoene kan lese og redigere, at andre kontoer avvises,
   og at samtidige redigeringer gir konflikt. Migrer eksisterende data bare
   etter at ny privat lagring er verifisert.

Ikke legg tjenestekontonøkler, CLI-tokens eller private oppskrifter i Git.
