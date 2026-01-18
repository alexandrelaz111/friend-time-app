# FriendTime - Guide d'Installation

## Prérequis

1. **Node.js** (version 18 ou supérieure)
   - Télécharge sur https://nodejs.org

2. **Expo CLI**
   ```bash
   npm install -g expo-cli
   ```

3. **Application Expo Go** sur ton téléphone
   - iOS: App Store
   - Android: Play Store

## Installation du projet

1. **Ouvre le terminal** et va dans le dossier du projet:
   ```bash
   cd "/Users/alexandrelazerat/Desktop/app ami loc/friend-time-app"
   ```

2. **Installe les dépendances**:
   ```bash
   npm install
   ```

## Configuration de Supabase

### Étape 1: Créer un projet Supabase

1. Va sur https://supabase.com et crée un compte
2. Clique sur "New Project"
3. Choisis un nom (ex: "friendtime")
4. Choisis un mot de passe pour la base de données
5. Sélectionne la région la plus proche (Europe West pour la France)
6. Attends que le projet soit créé

### Étape 2: Configurer la base de données

1. Dans ton dashboard Supabase, va dans **SQL Editor**
2. Clique sur "New Query"
3. Copie TOUT le contenu du fichier `supabase-schema.sql`
4. Colle-le dans l'éditeur SQL
5. Clique sur "Run" (ou Ctrl+Enter)
6. Tu devrais voir "Success. No rows returned" - c'est normal!

### Étape 3: Récupérer tes clés API

1. Va dans **Settings** > **API**
2. Tu trouveras:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: une longue chaîne de caractères

### Étape 4: Configurer l'application

1. Ouvre le fichier `src/services/supabase.ts`
2. Remplace les valeurs:
   ```typescript
   const SUPABASE_URL = 'https://TON_PROJECT_ID.supabase.co';
   const SUPABASE_ANON_KEY = 'TA_CLE_ANON';
   ```

## Lancer l'application

```bash
npm start
```

Ou avec Expo:
```bash
npx expo start
```

Ensuite:
- **Sur iPhone**: Scanne le QR code avec l'app Appareil Photo
- **Sur Android**: Scanne le QR code avec l'app Expo Go

## Structure du projet

```
friend-time-app/
├── App.tsx                    # Point d'entrée
├── src/
│   ├── context/
│   │   └── AuthContext.tsx    # Gestion de l'auth
│   ├── navigation/
│   │   └── AppNavigator.tsx   # Navigation
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── HomeScreen.tsx     # Dashboard principal
│   │   ├── FriendsScreen.tsx  # Gestion des amis
│   │   └── ProfileScreen.tsx  # Paramètres
│   ├── services/
│   │   ├── supabase.ts        # Client Supabase
│   │   ├── authService.ts     # Authentification
│   │   ├── friendService.ts   # Gestion amis
│   │   └── locationService.ts # Géolocalisation
│   └── types/
│       └── index.ts           # Types TypeScript
└── supabase-schema.sql        # Schéma BDD
```

## Comment ça marche ?

### Tracking de localisation
- L'app envoie ta position toutes les 30 secondes
- Seule ta dernière position est stockée (pas d'historique)
- Le tracking fonctionne en arrière-plan

### Détection de proximité
- Quand deux amis sont à moins de 50 mètres
- Une "session" de temps commence automatiquement
- Quand ils s'éloignent, la session se termine
- Le temps est comptabilisé

### Statistiques
- Total du temps passé avec chaque ami
- Statistiques mensuelles
- Classement des amis par temps passé

## Résolution de problèmes

### "Location permission denied"
- Va dans Paramètres > FriendTime > Localisation
- Sélectionne "Toujours" ou "Lorsque l'app est active"

### "Network error"
- Vérifie ta connexion internet
- Vérifie que les clés Supabase sont correctes

### L'app ne track pas en arrière-plan
- iOS: Va dans Paramètres > FriendTime > Localisation > "Toujours"
- Android: Désactive l'optimisation batterie pour FriendTime

## Pour aller plus loin

### Publier sur les stores

1. **Crée un compte développeur**:
   - Apple: https://developer.apple.com ($99/an)
   - Google: https://play.google.com/console ($25 une fois)

2. **Build l'application**:
   ```bash
   npx expo build:ios
   npx expo build:android
   ```

3. **Soumets aux stores** via leurs plateformes respectives

### Améliorations possibles

- Notifications push quand tu rencontres un ami
- Graphiques de statistiques
- Challenges entre amis
- Partage sur les réseaux sociaux
- Mode "ne pas déranger"
- Historique des rencontres
