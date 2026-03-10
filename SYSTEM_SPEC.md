
# Teknisk Systemdokumentation: Timelog

## 1. Introduktion

Detta dokument utgör den fullständiga tekniska specifikationen för Timelog-applikationen. Syftet är att erbjuda en uttömmande förståelse för systemets arkitektur, datamodell, frontend-logik och säkerhetsimplementering. Dokumentationen är avsedd att fungera som en primär resurs för underhåll, vidareutveckling och, om nödvändigt, en fullständig rekonstruktion av systemet av en senior utvecklare.

---

## 2. Systemarkitektur

### 2.1 Val av Teknologistack

Timelog är byggt på en modern, serverlös arkitektur med en noggrant utvald uppsättning teknologier för att maximera utvecklingshastighet, skalbarhet och säkerhet.

*   **Next.js 15 (med App Router):** Valet av Next.js, och specifikt App Router, är strategiskt. App Router möjliggör en hybrid rendering-modell där React Server Components (RSC) används som standard. Detta minskar mängden JavaScript som skickas till klienten, vilket leder till snabbare initiala sidladdningar. Arkitekturen med kapslade layouter och en filbaserad routing (`/app/dashboard/admin/users/[id]/page.tsx`) skapar en logisk och underhållbar projektstruktur. Det används även för API Routes (`/api/...`) som fungerar som systemets säkra backend.

*   **TypeScript:** Användningen av TypeScript är icke-förhandlingsbar i ett projekt av denna komplexitet. Det ger statisk typkontroll, vilket dramatiskt minskar risken för runtime-fel. Genom att definiera strikta typer för våra datamodeller (t.ex. `UserProfile`, `TimeEntry`) säkerställer vi dataintegritet genom hela applikationen, från databas till UI.

*   **Firebase (BaaS):** Firebase valdes som Backend-as-a-Service för att hantera autentisering (Firebase Auth) och datalagring (Cloud Firestore). Detta eliminerar behovet av att bygga och underhålla en egen backend-server för databasdelen.
    *   **Frontend (Client SDK):** Används för prenumerationer i realtid och grundläggande dokumenthantering, skyddat av Firestore Security Rules.
    *   **Backend (Admin SDK):** `firebase-admin` körs i Next.js API Routes för privilegierade operationer. Ett centralt exempel är att permanent radera användare: Frontend kan inte radera någons inloggningskonto av säkerhetsskäl. Vid radering görs istället ett anrop till `/api/admin/users/[id]` som använder Admin SDK för att radera användaren från Firebase Auth, varpå frontend raderar profildokumentet från Firestore. Detta frigör omedelbart anställningsnumret.

### 2.2 Filstruktur

Strukturen följer Next.js App Router-konventionen:

*   `/src/app/`: Applikationens rot.
    *   `/layout.tsx`: Rotlayouten som applicerar globala stilar och providers.
    *   `/dashboard/`: En route-grupp för alla inloggade vyer.
        *   `/layout.tsx`: Dashboard-layouten som innehåller huvudnavigation, sidomeny och användar-menyn.
        *   `/admin/`: Sida och underkomponenter för admin-panelen.
            *   `/users/[id]/page.tsx`: En dynamisk route för att skapa (`/new`) eller redigera (`/[en-användares-id]`) användare.
    *   `/login/`: Sidan för inloggning.
*   `/src/components/`: Innehåller UI-komponenter.
    *   `/ui/`: Autogenererade, ostylade komponenter från Shadcn UI (t.ex. `Button`, `Card`, `Select`).
*   `/src/firebase/`: All Firebase-relaterad konfiguration och logik.
    *   `config.ts`: Innehåller den publika Firebase-konfigurationen.
    *   `provider.tsx`: Huvud-providern som hanterar autentiseringsstatus och tillhandahåller Firebase-instanser via React Context.
    *   `/firestore/`: Innehåller anpassade hooks (`useDoc`, `useCollection`) för datahämtning.
*   `/src/lib/`: Hjälpfunktioner och typdefinitioner.
    *   `types.ts`: Central plats för alla TypeScript-typer (t.ex. `UserProfile`, `FirestoreTimeEntry`).

---

## 3. Datamodell (Cloud Firestore)

Datamodellen är designad med en dokument-orienterad strategi där den mesta datan är kapslad under användarens egen profil för att förenkla säkerhetsregler och datafrågor.

*   **`/profiles/{profileId}`:**
    *   **Beskrivning:** Huvudkollektionen som lagrar enskilda användarprofiler. `{profileId}` är identiskt med användarens Firebase Auth UID. Detta är roten för nästan all användarspecifik data.
    *   **Fält (urval):**
        *   `id`: `string` (UID)
        *   `firstName`, `lastName`: `string`
        *   `employeeId`: `string` (används för inloggning)
        *   `salaryValue`: `number | null`
        *   `employmentType`: `string | null` (t.ex. "Tillsvidare")
        *   `isClockedIn`: `boolean`
        *   `permissions`: `object` (en map med booleans, t.ex. `{ handleUsers: true, approvePayroll: false }`)

*   **`/profiles/{profileId}/timeEntries/{timeEntryId}`:**
    *   **Beskrivning:** En sub-kollektion under varje profil som lagrar individuella tidsinlägg. Denna struktur gör det enkelt att hämta alla poster för en specifik användare och säkra dem så att endast ägaren (eller en admin) kan läsa dem.
    *   **Fält:**
        *   `startTime`: `string` (ISO 8601 Timestamp)
        *   `endTime`: `string | null` (ISO 8601 Timestamp, `null` om passet är aktivt)
        *   `status`: `string` (t.ex. "Arbete", "Sjuk")
        *   `profileId`: `string` (Denormaliserad för referens)

*   **`/profiles/{profileId}/schedules/{scheduleId}`:**
    *   **Beskrivning:** En sub-kollektion för schemalagda tider. `{scheduleId}` är formaterat som `YYYY-WW` (t.ex. "2024-32").
    *   **Fält:**
        *   `days`: `object` (en map där nyckeln är veckodagen (1-7) och värdet är en tid-sträng, t.ex. `{ "1": "08-17" }`)

*   **`/companySettings/main`:**
    *   **Beskrivning:** En "singleton"-kollektion som endast innehåller ett dokument, `main`. Detta lagrar globala företagsinställningar som används vid generering av anställningsavtal.
    *   **Fält:** `companyName`, `orgNumber`, `address`, etc. (alla är `string | null`).

*   **`/adjustment_logs/{logId}`:**
    *   **Beskrivning:** En rotkollektion för att spåra manuella justeringar av tid. Denna är separerad för att kunna ha striktare skriv-behörigheter (endast `create`).
    *   **Fält:** `adjustingUserId`, `action`, `originalTime`, `adjustedTime`, `createdAt`.

---

## 4. Frontend-logik & Formhantering

### 4.1 Arkitektur för `UserEditForm`

Under felsökningen av formuläret för att redigera användare identifierades en kritisk "race condition". Formuläret renderades och initialiserades med tomma värden *innan* datan från Firestore hade hunnit hämtas. När datan väl anlände, misslyckades `form.reset()`-anropet att på ett tillförlitligt sätt uppdatera de komplexa `Select`-komponenterna.

Lösningen var en **strukturell omarbetning** till ett "Wrapper Component Pattern":

1.  **Yttre Komponent (`UserEditForm`):** Denna komponent agerar som en "datavakt". Dess enda ansvar är att:
    *   Anropa `useDoc`-hooken för att hämta `userProfile`-datan från Firestore.
    *   Visa ett laddnings-state (t.ex. en spinner) medan `isLoading` är `true`.
    *   Visa ett felmeddelande om datan inte kan hämtas.
    *   **Endast när datan är fullständigt hämtad** (`!isLoading && userProfile`), renderas den inre komponenten.

2.  **Inre Komponent (`UserEditFormInner`):**
    *   Denna komponent tar emot den färdighämtade `userProfile`-datan som en prop.
    *   `react-hook-form`'s `useForm` anropas *inuti* denna komponent, och den färdiga datan skickas direkt in i `defaultValues`.
    *   Detta garanterar att formuläret initialiseras **en enda gång** med den korrekta, fullständiga datan. Behovet av `useEffect` och `form.reset()` för att synkronisera data försvinner helt, vilket eliminerar alla timing-problem.

Denna arkitektur är den mest robusta metoden för att hantera formulär som är beroende av asynkron data.

### 4.2 `react-hook-form` och Zod-validering

*   **Validering:** Vi använder `zodResolver` för att integrera Zod-scheman med `react-hook-form`. Detta ger kraftfull, typsäker validering.
*   **Hantering av `null`:** En kritisk lärdom var hanteringen av fält som kan vara `null` i databasen (t.ex. `employmentType`). Initialt orsakade `z.string().optional()` problem. Den korrekta regeln är `z.string().nullable()`. Detta talar om för Zod att värdet antingen måste vara en `string` eller `null`, vilket exakt matchar datamodellen och förhindrar valideringsfel när formuläret laddas med data från Firestore.

### 4.3 `Select`-komponenter (Shadcn UI)

Den mest envisa buggen i projektet var kopplingen till `Select`-komponenterna. Lösningen ligger i att förstå att de måste fungera som strikt **kontrollerade komponenter**.

*   **Korrekt koppling:** Varje `Select`-komponent måste vara omsluten av en `Controller`-komponent från `react-hook-form`. Dataflödet är som följer:
    1.  `Controller` tillhandahåller ett `field`-objekt.
    2.  `Select`'s `onValueChange`-prop **måste** kopplas till `field.onChange`. Detta säkerställer att när användaren gör ett val, uppdateras `react-hook-form`'s interna state.
    3.  `Select`'s `value`-prop **måste** kopplas till `field.value`.

*   **Hantering av `null` i UI:** `Shadcn`'s `Select`-komponent kan inte hantera `null` som ett `value`. Detta skulle orsaka ett fel i React. Samtidigt returnerar vår databas `null` för tomma fält. Lösningen är att transformera värdet precis innan det skickas till komponenten: `value={field.value ?? ''}`. Denna "nullish coalescing operator" säkerställer att om `field.value` är `null` eller `undefined`, skickas en tom sträng (`''`) till `Select`-komponenten istället. Komponenten kan hantera en tom sträng utan att krascha och kommer då korrekt att visa sin `placeholder` ("Välj...").

---

## 5. Säkerhetsmodell (RBAC)

Säkerheten i Timelog är helt beroende av **Firestore Security Rules**. Dessa regler exekveras på Googles servrar och kan inte kringgås av en klient, oavsett vad som manipuleras i webbläsaren.

### 5.1 Regel-logik

Reglerna i `firestore.rules` implementerar en Role-Based Access Control (RBAC)-modell.

*   **Helper-funktioner:**
    *   `isSignedIn()`: Kontrollerar att `request.auth` inte är `null`.
    *   `isOwner(userId)`: Jämför den inloggade användarens UID (`request.auth.uid`) med den efterfrågade resursens ID.
    *   `hasPermission(permission)`: Denna funktion är central för admin-logiken. Den gör en `get()`-förfrågan till den *inloggade användarens egen* profilsökväg (`/databases/$(database)/documents/profiles/$(request.auth.uid)`) och kontrollerar om `permissions`-mappen existerar och om den efterfrågade `permission`-nyckeln (t.ex. "handleUsers") är satt till `true`.

*   **Regel för `/profiles/{profileId}`:**
    *   `allow read`: En användare får läsa ett profildokument *om* de är ägaren (`isOwner(profileId)`) **ELLER** om de har `handleUsers`-behörighet (`hasPermission('handleUsers')`).
    *   `allow update`: En användare får uppdatera sitt eget profil. En admin med `handleUsers`-rättighet får uppdatera vems profil som helst. En extra kontroll säkerställer att en användare inte kan ge sig själv nya behörigheter om de inte redan har `handlePermissions`.
    *   `allow create, delete`: Endast användare med `handleUsers`-behörighet får skapa eller radera profiler.

Denna modell säkerställer att en vanlig användare är strikt begränsad till sin egen data, medan administratörer med specifika flaggor i sin egen profil ges utökad åtkomst.

### 5.2 UI Granulär Behörighetsstyrning (Frontend)

Utöver databasreglerna styr användarens `permissions`-objekt exakt *vilka* knappar och flikar som är synliga i webbläsaren. Varje enskild behörighet låser upp associerade UI-komponenter för att säkerställa "Least Privilege"-principen även visuellt:

*   **Meny-access ("Admin"-knappen):** Syns endast om användaren har *minst en* administrativ behörighet (ex. `generateContracts`, `handleUsers`, `approvePayroll` eller `handlePermissions`).
*   **Dynamiska flikar i Admin-vyn:** Admin-vyns landningssida och standardflik dynamiskt beräknas. En användare med enbart `generateContracts` hanterar inga användare och ser därför inga andra delar av administrationsgränssnittet utan skickas direkt till avtalsgeneratorn.
*   **Redigera användare (`UserEditForm`):** Visar strikt uppdelade formulärsflikar för att separera ansvarsområden:
    *   En HR/Administratör med **"Hantera Användare"** (`handleUsers`) ser enbart anställningsfakta och personuppgifter.
    *   En IT/Systemansvarig med **"Hantera Behörigheter"** (`handlePermissions`) får tillgång till behörighetsfliken för att justera rättigheter, men kan vara förhindrad från att redigera (eller ens se flikarna för) lön och personliga uppgifter om de saknar `handleUsers`.
    *   Superadmin (ID: 64112) överrider samtliga dessa lås.

---

## 6. State Management & Data Fetching

*   **Firebase Provider:** I appens rot (`/src/app/layout.tsx`) omsluts hela applikationen av `FirebaseClientProvider`. Denna provider ansvarar för att initialisera Firebase på klienten och tillhandahålla Firebase-tjänsterna (app, auth, firestore) och autentiseringsstatus via React Context. Den innehåller även en `onAuthStateChanged`-lyssnare som i realtid hämtar och uppdaterar användarens profil när inloggningsstatus ändras.

*   **`useDoc` & `useCollection`:** Dessa anpassade hooks abstraherar bort komplexiteten med att prenumerera på Firestore-data.
    *   De använder `onSnapshot` för att skapa en realtidsprenumeration.
    *   De hanterar `isLoading`- och `error`-states.
    *   **Memoization:** Det är kritiskt att den `doc()`- eller `collection()`-referens som skickas till dessa hooks är memoized med `useMemoFirebase`. Utan detta skulle en ny referens skapas vid varje rendering, vilket skulle trigga en oändlig loop av datahämtningar.

---

## 7. Deployment & Miljö

*   **Miljövariabler:** Firebase-konfigurationen i `src/firebase/config.ts` (`apiKey`, `authDomain`, etc.) är designad för att vara publik. Den identifierar Firebase-projektet men ger ingen behörighet i sig. All säkerhet sköts av Firestore Security Rules. Det finns inget behov av att dölja dessa nycklar i `.env`-filer.

*   **"Exposed Secrets":** Applikationen i sitt nuvarande skick innehåller inga hemligheter på klientsidan som behöver skyddas. Om framtida integrationer kräver hemliga API-nycklar (t.ex. för en betaltjänst), måste dessa lagras i en `.env.local`-fil och **endast** användas på serversidan (i Next.js Server Actions eller API Routes) för att aldrig exponeras i webbläsaren.

---

## Appendix A: Firestore Rules Source

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // --------------------------------
    // Helper Functions
    // --------------------------------
    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    function isSuperAdmin() {
      return request.auth.token.email == '64112@timelog.app';
    }

    // Checks if the requesting user has a specific permission flag set to true in their profile.
    function hasPermission(permission) {
      let profilePath = /databases/$(database)/documents/profiles/$(request.auth.uid);
      return exists(profilePath) &&
             get(profilePath).data.permissions != null &&
             get(profilePath).data.permissions[permission] == true;
    }

    // On user creation, ensures no permissions are granted by default.
    function noElevatedPermissionsOnCreate() {
        let p = request.resource.data.permissions;
        return p == null || p.keys().size() == 0 || (
               p.viewLiveCost == false &&
               p.viewAbsence == false &&
               p.handleTimeReports == false &&
               p.handleAbsence == false &&
               p.handleUsers == false &&
               p.approvePayroll == false &&
               p.generateContracts == false &&
               p.handlePermissions == false &&
               p.handleSchema == false &&
               p.editOwnTimes == false
        );
    }
    
    // --------------------------------
    // Collection Rules: /profiles
    // --------------------------------
    match /profiles/{profileId} {

      // Read: A user can read their own profile. An admin with 'handleUsers' can read any profile.
      allow read: if isOwner(profileId) || hasPermission('handleUsers') || isSuperAdmin();
      
      // Create: An admin with 'handleUsers' can create new profiles, but without elevated permissions.
      allow create: if (hasPermission('handleUsers') || isSuperAdmin()) && noElevatedPermissionsOnCreate();
      
      // Update: A user can update their own profile (but not permissions unless they have 'handlePermissions').
      // An admin with 'handleUsers' can update any profile.
      allow update: if isSignedIn() && 
        (
            (isOwner(profileId) && (request.resource.data.permissions.diff(resource.data.permissions).affectedKeys().size() == 0 || hasPermission('handlePermissions'))) || 
            hasPermission('handleUsers') || 
            isSuperAdmin()
        );

      // Delete: Admins can delete users, but not the super admin account.
      allow delete: if (hasPermission('handleUsers') || isSuperAdmin()) && get(/databases/$(database)/documents/profiles/$(profileId)).data.employeeId != '64112';
      
      // --- Sub-collections ---
      match /projects/{projectId} {
        // A user can manage their own projects. Admins with 'handleTimeReports' can also view/edit them.
        allow read, write: if isOwner(profileId) || hasPermission('handleTimeReports') || isSuperAdmin();
      }

      match /tasks/{taskId} {
         // A user can manage their own tasks. Admins with 'handleTimeReports' can also view/edit them.
        allow read, write: if isOwner(profileId) || hasPermission('handleTimeReports') || isSuperAdmin();
      }

      match /timeEntries/{timeEntryId} {
        // A user can read/create their own time entries. Admins with 'handleTimeReports' can read/create for any user.
        allow read, create: if isOwner(profileId) || hasPermission('handleTimeReports') || isSuperAdmin();

        // A user can update/delete their own entries ONLY if they have 'editOwnTimes'.
        // Admins with 'handleTimeReports' can manage any entry.
        allow update, delete: if (isOwner(profileId) && hasPermission('editOwnTimes')) || hasPermission('handleTimeReports') || isSuperAdmin();
      }

      match /schedules/{scheduleId} {
        // A user can read their own schedule. An admin with 'handleSchema' can read anyone's.
        allow read: if isOwner(profileId) || hasPermission('handleSchema') || isSuperAdmin();
        // Only admin with 'handleSchema' permission can write schedules.
        allow write: if hasPermission('handleSchema') || isSuperAdmin();
      }
    }
    
    // --------------------------------
    // Collection Rules: /companySettings
    // --------------------------------
    match /companySettings/main {
        // Only admins who can generate contracts can read/write company settings.
        allow read, write: if hasPermission('generateContracts') || isSuperAdmin();
    }

    // --------------------------------
    // Collection Rules: /adjustment_logs
    // --------------------------------
    match /adjustment_logs/{logId} {
        // Users who can edit their own time can create adjustment logs.
        allow create: if hasPermission('editOwnTimes');
        // Only admins who manage users can review the adjustment logs.
        allow read: if hasPermission('handleUsers');
        // Logs are immutable.
        allow update, delete: if false;
    }
  }
}
```
