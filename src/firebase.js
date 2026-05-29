import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey:            "AIzaSyDrjeelSclXYlDzsC0hw07SDBuEVqCGv5k",
  authDomain:        "joker-laverie.firebaseapp.com",
  projectId:         "joker-laverie",
  storageBucket:     "joker-laverie.firebasestorage.app",
  messagingSenderId: "253945256775",
  appId:             "1:253945256775:web:b22519e3286ad9d3808a62",
};

const app  = initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const auth = getAuth(app);

// Activer le mode hors-ligne (cache local IndexedDB)
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === "failed-precondition") {
    // Plusieurs onglets ouverts en même temps
    console.warn("Hors-ligne désactivé : plusieurs onglets ouverts");
  } else if (err.code === "unimplemented") {
    // Navigateur ne supporte pas IndexedDB
    console.warn("Hors-ligne non supporté par ce navigateur");
  }
});
