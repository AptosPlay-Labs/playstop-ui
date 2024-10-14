
// Importa las funciones necesarias de los SDKs de Firebase
import { initializeApp } from "firebase/app";
import { getAnalytics, type Analytics } from "firebase/analytics";
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// Configuración de tu aplicación web de Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
  measurementId: import.meta.env.VITE_MEASUREMENT_ID
};


// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app)
const storage = getStorage(app);  // Inicializa Firebase Storage

// Inicializa Analytics solo si se ejecuta en el cliente y Firebase Analytics está disponible
let analytics: Analytics | undefined;
if(typeof window !== "undefined" && firebaseConfig.measurementId) {
  console.log(app)
  analytics = getAnalytics(app);
}

export { app, analytics, db, storage};