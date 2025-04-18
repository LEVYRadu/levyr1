// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDxz1TvNfnbj6Q02Dos9lU9-pIPdcR3zy4",
  authDomain: "levyr-e699f.firebaseapp.com",
  projectId: "levyr-e699f",
  storageBucket: "levyr-e699f.firebasestorage.app",
  messagingSenderId: "40694340915",
  appId: "1:40694340915:web:eff11c44fc9b8cf4b37246",
  measurementId: "G-XH9561DF5E"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
