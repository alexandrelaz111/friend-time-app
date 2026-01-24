# Database Documentation

Structure de la base de données Supabase pour FriendTime.

## 📁 Organisation

```
database/
├── schema.sql              # Schéma complet de référence (tables, RLS, triggers, fonctions)
├── migrations/             # Migrations chronologiques (une par changement)
│   └── YYYY-MM-DD-description.sql
└── scripts/                # Scripts utilitaires ponctuels (cleanup, debug, etc.)
    └── cleanup-corrupted-data.sql
```

## 🔄 Workflow

### 1. Développement local
- Modifier le fichier SQL approprié (schema.sql ou créer une migration)
- Tester dans Supabase SQL Editor
- Commit les changements

### 2. Déploiement
- Copier le contenu du fichier SQL
- Exécuter dans **Supabase Dashboard > SQL Editor**
- Vérifier les résultats

### 3. Synchronisation
- Après modification directe dans Supabase, mettre à jour les fichiers locaux
- Documenter dans une migration si c'est un changement structurel

## 📄 Fichiers

### `schema.sql`
Schéma complet de la base de données :
- Tables (profiles, friendships, user_locations, time_sessions, monthly_stats)
- Index pour performance
- Row Level Security (RLS)
- Triggers automatiques
- Fonctions stored procedures (get_nearby_friends, end_stale_sessions, etc.)

**Utilisation :** Setup initial d'un nouveau projet ou référence

### `migrations/`
Changements incrémentaux appliqués à la base :
- Format : `YYYY-MM-DD-description.sql`
- Une migration = un changement logique
- Exécuter dans l'ordre chronologique

**Exemple :**
```
migrations/2026-01-24-add-cleanup-function.sql
```

### `scripts/`
Scripts utilitaires à usage ponctuel :
- Nettoyage de données
- Debug
- Migration de données
- Maintenance

**Exemples :**
- `cleanup-corrupted-data.sql` : Nettoie les sessions zombies

## ⚠️ Bonnes pratiques

1. **Ne jamais modifier directement les tables en prod** sans tester
2. **Toujours versionner** les changements de schéma
3. **Documenter** pourquoi un changement est nécessaire
4. **Tester** les migrations sur un projet Supabase de dev d'abord
5. **Synchroniser** les fichiers locaux après modification directe dans Supabase

## � Reconstruire la Database

### De zéro (fresh start)

1. **Dans Supabase Dashboard > SQL Editor > New Query**:
   ```sql
   -- Exécuter d'abord (crée la structure complète)
   -- Copier le contenu de database/schema.sql
   ```

2. **Vérifier les RLS policies** (elles sont incluses dans schema.sql)

3. **(Optionnel) Ajouter des données de test**:
   ```sql
   -- Copier le contenu de database/seed.sql
   ```

### Après changements (migrations)

1. **Créer une nouvelle migration** dans `database/migrations/`:
   ```
   database/migrations/YYYY-MM-DD-description.sql
   ```

2. **Exécuter dans Supabase SQL Editor**

3. **Mettre à jour schema.sql** si c'est un changement structurel majeur

## 📋 Checklist de Déploiement

- [ ] schema.sql à jour avec tous les changements
- [ ] Migrations documentées en ordre chronologique
- [ ] seed.sql contient les données de test
- [ ] RLS policies vérifiées
- [ ] Triggers et fonctions testées

## 🔗 Liens utiles

- [Supabase Dashboard](https://supabase.com/dashboard)
- [Documentation Supabase SQL](https://supabase.com/docs/guides/database)
- [PostGIS Documentation](https://postgis.net/docs/) (pour calculs géographiques)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (pour versionner la database)
