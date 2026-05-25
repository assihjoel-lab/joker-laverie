# 🃏 JOKER Laverie & Service

## Déploiement Netlify

1. Va sur netlify.com → "Add new site" → "Deploy manually"
2. Installe les dépendances : `npm install`
3. Build : `npm run build`
4. Glisse le dossier `build/` sur Netlify Drop

## Règles Firestore

Dans Firebase Console → Firestore → Règles :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```
