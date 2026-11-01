/* Peekaboo Timer — your own photos as hidden pictures. Stored in IndexedDB on this device only. */
(function () {
  'use strict';
  const PK = (window.PK = window.PK || {});

  const DB_NAME = 'peekaboo';
  const STORE = 'photos';
  let dbPromise = null;
  const memory = new Map(); // fallback when IndexedDB is unavailable (private mode etc.)

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      } catch (e) { resolve(null); }
    });
    return dbPromise;
  }

  function tx(db, mode, fn) {
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const store = t.objectStore(STORE);
      const out = fn(store);
      t.oncomplete = () => resolve(out && 'result' in out ? out.result : undefined);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  }

  /** Square-crop and shrink a photo so it is light to store and quick to draw. */
  async function prepare(file) {
    const SIZE = 900;
    let source;
    let w;
    let h;
    if (window.createImageBitmap) {
      try {
        source = await createImageBitmap(file, { imageOrientation: 'from-image' });
      } catch (e) {
        source = await createImageBitmap(file);
      }
      w = source.width;
      h = source.height;
    } else {
      source = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      });
      w = source.naturalWidth;
      h = source.naturalHeight;
    }
    const side = Math.min(w, h);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = Math.min(SIZE, side);
    const c = canvas.getContext('2d');
    c.imageSmoothingQuality = 'high';
    c.drawImage(source, (w - side) / 2, (h - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
    if (source.close) source.close();
    return new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', 0.86);
    });
  }

  PK.photos = {
    async list() {
      const db = await open();
      if (!db) return Array.from(memory.values());
      try {
        const rows = await tx(db, 'readonly', (s) => s.getAll());
        return (rows || []).sort((a, b) => a.created - b.created);
      } catch (e) { return Array.from(memory.values()); }
    },
    async add(file) {
      const blob = await prepare(file);
      const row = { id: 'photo-' + PK.uid(), blob, created: Date.now() };
      const db = await open();
      if (db) {
        try { await tx(db, 'readwrite', (s) => s.put(row)); return row; } catch (e) { /* fall through */ }
      }
      memory.set(row.id, row);
      return row;
    },
    async remove(id) {
      memory.delete(id);
      const db = await open();
      if (!db) return;
      try { await tx(db, 'readwrite', (s) => s.delete(id)); } catch (e) { /* ignore */ }
    },
  };
})();
