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

      // Lấy bounds của vùng Huế
      const layer = L.geoJSON(hue);
      const bounds = layer.getBounds();

      // Căn bản đồ vừa khít với vùng Huế
      map.fitBounds(bounds);

      // Kiểm tra nếu là mobile (chiều rộng < 768px)
      if (window.innerWidth < 768) {
        const currentZoom = map.getZoom();
        map.setZoom(currentZoom + 0.5); // zoom thêm 0.5 cấp
      }

      console.log("GeoJSON loaded:", hue);
      
    });
})();
