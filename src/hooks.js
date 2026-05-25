import { useState, useEffect } from "react";
import { collection, doc, onSnapshot, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";

// Hook pour une collection Firestore (liste de documents)
export function useFireCollection(colName, initVal = []) {
  const [data,  setData]  = useState(initVal);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const ref = collection(db, colName);
    const unsub = onSnapshot(ref,
      snap => {
        const docs = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        setData(docs.length > 0 ? docs : initVal);
        setReady(true);
      },
      err => { console.warn(colName, err); setReady(true); }
    );
    return () => unsub();
  }, [colName]);

  async function upsert(item) {
    const id = String(item.id || Date.now());
    await setDoc(doc(db, colName, id), { ...item, id }, { merge: true });
  }
  async function remove(id) {
    await deleteDoc(doc(db, colName, String(id)));
  }

  return [data, upsert, remove, ready];
}

// Hook pour un document unique (config scalaire)
export function useFireDoc(colName, docId, initVal) {
  const [val,   setVal]   = useState(initVal);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const ref = doc(db, colName, docId);
    const unsub = onSnapshot(ref,
      snap => {
        setVal(snap.exists() ? (snap.data().value ?? initVal) : initVal);
        setReady(true);
      },
      err => { console.warn(colName, docId, err); setReady(true); }
    );
    return () => unsub();
  }, [colName, docId]);

  async function save(newVal) {
    setVal(newVal);
    await setDoc(doc(db, colName, docId), { value: newVal }, { merge: true });
  }

  return [val, save, ready];
}
