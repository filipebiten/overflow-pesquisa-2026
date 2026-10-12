import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getDatabase, ref, push, set, get, onValue, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";
import { init as initResponder } from "./responder.js";

const fbApp = initializeApp(FIREBASE_CONFIG);
const db = getDatabase(fbApp);

initResponder({ db, ref, push, set, get, onValue, serverTimestamp, el: document.getElementById("app") });
