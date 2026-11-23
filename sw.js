const VERSAO='dieta-v1.0.5';
const ARQ=['./','index.html','style.css','app.js','data.js','manifest.json','img/inicial.jpg','img/casal.jpg','img/dieta.jpg','img/receitas.jpg','img/mercado.jpg','img/bruto.jpg','img/semanal.jpg','img/couro.jpg','img/f_casal.jpg','img/f_dieta.jpg','img/f_receitas.jpg','img/f_mercado.jpg','img/icon-192.png','img/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSAO).then(c=>c.addAll(ARQ)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==VERSAO).map(x=>caches.delete(x)))));self.clients.claim();});
self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));});
