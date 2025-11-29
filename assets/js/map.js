// map.js
// Khởi tạo biến map toàn cục (window.map) để các module khác dùng

(function () {
  // tạo map global
  window.map = L.map("map", { zoomControl: false }).setView(
    [16.47, 107.58],
    12
  );

  // zoom control bottomleft
  L.control.zoom({ position: "bottomleft" }).addTo(window.map);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {}).addTo(
    map
  );

  fetch("./Data/vn.json")
    .then((res) => res.json())
    .then((data) => {
      // Lọc ra tỉnh Thừa Thiên Huế
      console.log(data.features.map((f) => f.properties.name));
      const hue = data.features.filter((f) =>
        f.properties.name.includes("Thua_Thien_Hue")
      );

      // Thêm vào bản đồ
      L.geoJSON(hue, {
        style: {
          color: "#e63946",
          weight: 2,
          fill: false,
          fillOpacity: 0.5,
        },
        onEachFeature: (feature, layer) => {
          layer.bindPopup(`<b>${feature.properties.name}</b>`);
        },
      }).addTo(map);

      console.log("GeoJSON loaded:", hue);

      // Căn bản đồ khớp vùng Huế
      const layer = L.geoJSON(hue);
      map.fitBounds(layer.getBounds());
    });
})();
