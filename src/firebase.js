import { initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey:            "AIzaSyDrjeelSclXYlDzsC0hw07SDBuEVqCGv5k",
  authDomain:        "joker-laverie.firebaseapp.com",
  projectId:         "joker-laverie",
  storageBucket:     "joker-laverie.firebasestorage.app",
  messagingSenderId: "253945256775",
  appId:             "1:253945256775:web:b22519e3286ad9d3808a62",
};

const app = initializeApp(firebaseConfig);

// Mode hors-ligne avec la nouvelle API (Firebase 10+)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export const auth = getAuth(app);
