// map.js
// Khởi tạo biến map toàn cục (window.map) để các module khác dùng

(function () {
  // tạo map global
  window.map = L.map('map', { zoomControl: false }).setView([16.470, 107.580], 11);

  // zoom control bottomleft
  L.control.zoom({ position: 'bottomleft' }).addTo(window.map);

  // tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(window.map);

  // optional: basic map events or helpers
  window.map.whenReady(() => {
    console.info('Map is ready.');
  });

})();
