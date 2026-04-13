/*
 Simulation script: start -> pause -> resume -> stop for test-user.
 Tries firebase-admin if GOOGLE_APPLICATION_CREDENTIALS is set, otherwise falls back to client SDK using NEXT_PUBLIC_* env vars.
*/

const USE_ADMIN = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;

async function run() {
  let firestore;
  if (USE_ADMIN) {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    firestore = admin.firestore();
    console.log('Using firebase-admin');
  } else {
    const { initializeApp } = require('firebase/app');
    const { getFirestore, doc, setDoc, deleteDoc, collection, addDoc } = require('firebase/firestore');
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    };
    if (!firebaseConfig.apiKey) {
      console.error('No client firebase config available in env. Cannot run simulation.');
      process.exit(1);
    }
    const app = initializeApp(firebaseConfig);
    firestore = getFirestore(app);
    // attach helpers for modular SDK
    firestore._helpers = { doc, setDoc, deleteDoc, collection, addDoc };
    console.log('Using firebase client SDK');
  }

  const uid = 'test-user';
  const taskId = 'test-task-1';

  // start
  const currentRefPath = `users/${uid}/active_task_timer/current`;
  const startPayload = {
    taskId,
    userId: uid,
    startedAt: new Date().toISOString(),
    isPaused: false,
    isActive: true,
  };

  console.log('Starting timer...');
  if (USE_ADMIN) {
    await firestore.doc(currentRefPath).set(startPayload);
  } else {
    const { doc, setDoc } = firestore._helpers;
    await setDoc(doc(firestore, `users/${uid}/active_task_timer/current`), startPayload);
  }

  // wait 2s
  await new Promise(r => setTimeout(r, 2000));

  // pause
  console.log('Pausing timer...');
  const pausePayload = { ...startPayload, isPaused: true, isActive: false, pausedAt: new Date().toISOString() };
  if (USE_ADMIN) {
    await firestore.doc(currentRefPath).set(pausePayload);
  } else {
    const { doc, setDoc } = firestore._helpers;
    await setDoc(doc(firestore, `users/${uid}/active_task_timer/current`), pausePayload);
  }

  await new Promise(r => setTimeout(r, 1500));

  // resume - emulate what resumeTimer should do: shift startedAt forward by pause duration
  console.log('Resuming timer...');
  const pausedAt = new Date(pausePayload.pausedAt).getTime();
  const startedAtMs = new Date(startPayload.startedAt).getTime();
  const pauseDuration = Date.now() - pausedAt;
  const newStartedAt = new Date(startedAtMs + pauseDuration).toISOString();
  const resumePayload = { ...pausePayload, isPaused: false, isActive: true, pausedAt: undefined, startedAt: newStartedAt };
  if (USE_ADMIN) {
    await firestore.doc(currentRefPath).set(resumePayload);
  } else {
    const { doc, setDoc } = firestore._helpers;
    await setDoc(doc(firestore, `users/${uid}/active_task_timer/current`), resumePayload);
  }

  await new Promise(r => setTimeout(r, 2000));

  // stop - create timesheet entry and delete active doc
  console.log('Stopping timer and saving timesheet...');
  const endTime = new Date();
  const durationSec = Math.floor((endTime.getTime() - new Date(resumePayload.startedAt).getTime()) / 1000);
  const timesheet = {
    taskId,
    taskTitle: 'Tarefa de teste',
    projectId: 'test-project',
    goalId: 'test-goal',
    milestoneId: null,
    userId: uid,
    startedAt: resumePayload.startedAt,
    endedAt: endTime.toISOString(),
    duration: durationSec,
    createdAt: new Date().toISOString(),
    comment: 'Simulação automática',
  };

  if (USE_ADMIN) {
    await firestore.collection(`users/${uid}/timesheets`).add(timesheet);
    await firestore.doc(currentRefPath).delete();
  } else {
    const { collection, addDoc, doc, deleteDoc } = firestore._helpers;
    await addDoc(collection(firestore, `users/${uid}/timesheets`), timesheet);
    await deleteDoc(doc(firestore, `users/${uid}/active_task_timer/current`));
  }

  console.log('Simulation complete. Timesheet created:', timesheet);
}

run().catch(err => {
  console.error('Simulation failed:', err);
  process.exit(1);
});
