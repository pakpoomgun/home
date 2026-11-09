// Service Worker — แคชตัวแอปให้เปิดได้เร็ว/ออฟไลน์ (ข้อมูลจริงไม่ถูกแคชที่นี่ เก็บเฉพาะในเครื่องหลัง login)
const VER = 'hi-v1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return; // POST ไป Apps Script ไม่แตะเลย
  const u = new URL(req.url);

  // หน้าเว็บ: ลองเน็ตก่อน (ได้เวอร์ชันใหม่เสมอ) ถ้าออฟไลน์ใช้ของในแคช
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(r => { const cp = r.clone(); caches.open(VER).then(c => c.put('index.html', cp)); return r; })
        .catch(() => caches.match('index.html'))
    );
    return;
  }

  // ไฟล์ของแอปเอง + ฟอนต์: แคชก่อนแล้วอัปเดตเบื้องหลัง
  const own = u.origin === self.location.origin;
  const font = u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com';
  if (own || font) {
    e.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(r => {
          if (r && (r.ok || r.type === 'opaque')) { const cp = r.clone(); caches.open(VER).then(c => c.put(req, cp)); }
          return r;
        }).catch(() => hit);
        return hit || net;
      })
    );
  }
  // อย่างอื่น (รูปจาก Drive ฯลฯ) ปล่อยผ่านตามปกติ
});
