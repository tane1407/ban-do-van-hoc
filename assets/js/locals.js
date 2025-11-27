// assets/js/locals.js
// Module quản lý các địa điểm (locals) và hiển thị marker + avatar tác giả khi zoom
window.LocalsModule = (function () {
  const DATA_URL = './Data/locals.json';
  const AUTHORS_URL = './Data/authors.json';

  const GLOBAL_MIN_ZOOM = 13;   // marker hiển thị khi zoom >= 14 (tương đương +3 lần)
  const ZOOM_ON_CLICK = 15;     // zoom target khi click marker
  const AUTHOR_AVATAR_ZOOM = 16; // hiển thị avatar khi zoom >= 16
  const AUTHOR_AVATAR_SIZE = 44; // px

  let locals = [];              
  const placesLayer = L.layerGroup(); 
  const authorMarkersGroup = L.layerGroup(); 
  const idToMarker = {};        
  let localAuthors = null;      
  let currentAuthorPlaceId = null;

  /* ---------- Helpers ---------- */
  function ensureMap() {
    if (!window.map) throw new Error('window.map chưa được khởi tạo. Hãy nạp map.js trước LocalsModule.');
    return window.map;
  }

  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"'`]/g, m => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'
    })[m]);
  }

  /* ---------- Load authors fallback (chỉ 1 lần) ---------- */
  function loadLocalAuthorsOnce() {
    if (localAuthors !== null) return Promise.resolve(localAuthors);
    return fetch(AUTHORS_URL)
      .then(r => { if (!r.ok) return []; return r.json(); })
      .then(arr => {
        localAuthors = Array.isArray(arr) ? arr : [];
        return localAuthors;
      })
      .catch(err => {
        console.warn('Không thể tải authors.json fallback:', err);
        localAuthors = [];
        return localAuthors;
      });
  }

  /* Lấy danh sách tác giả theo place id (ưu tiên AuthorsModule nếu có) */
  function getAuthorsForPlace(placeId) {
    if (!placeId) return [];
    if (window.AuthorsModule && typeof window.AuthorsModule.getAuthorsByPlace === 'function') {
      try {
        const a = window.AuthorsModule.getAuthorsByPlace(placeId) || [];
        return a;
      } catch (e) {
        // fallback xuống tiếp
      }
    }
    if (localAuthors === null) return [];
    return localAuthors.filter(a => a.place_id === placeId);
  }

  /* ---------- Author avatars management ---------- */
  function clearAuthorMarkers() {
    authorMarkersGroup.clearLayers();
    const map = window.map;
    if (map && map.hasLayer(authorMarkersGroup)) {
      map.removeLayer(authorMarkersGroup);
    }
    currentAuthorPlaceId = null;
  }

  // Hiển thị avatar tác giả quanh một địa điểm (xếp tròn)
  async function showAuthorsAround(placeObj, radiusPx = 90) {
    if (!placeObj || !placeObj.lat || !placeObj.lon) return;
    const map = ensureMap();

    if (!(window.AuthorsModule && typeof window.AuthorsModule.getAuthorsByPlace === 'function')) {
      await loadLocalAuthorsOnce();
    }

    let authorsForPlace = getAuthorsForPlace(placeObj.id || placeObj.place_id);
    if ((!authorsForPlace || authorsForPlace.length === 0) && window.AuthorsModule && typeof window.AuthorsModule.getAuthorsByPlace === 'function') {
      authorsForPlace = window.AuthorsModule.getAuthorsByPlace(placeObj.id || placeObj.place_id) || [];
    }

    if (!authorsForPlace || authorsForPlace.length === 0) {
      clearAuthorMarkers();
      return;
    }

    clearAuthorMarkers();
    map.addLayer(authorMarkersGroup);

    const centerLatLng = L.latLng(placeObj.lat, placeObj.lon);
    const centerPoint = map.latLngToLayerPoint(centerLatLng);
    const n = authorsForPlace.length;

    authorsForPlace.forEach((author, i) => {
      let pt;
      if (n === 1) {
        pt = centerPoint;
      } else {
        const angle = (i / n) * (Math.PI * 2) - Math.PI / 2;
        const r = radiusPx;
        const dx = Math.round(Math.cos(angle) * r);
        const dy = Math.round(Math.sin(angle) * r);
        pt = L.point(centerPoint.x + dx, centerPoint.y + dy);
      }

      const posLatLng = map.layerPointToLatLng(pt);
      const avatarHtml = `
        <div class="author-avatar" title="${escapeHtml(author.name || '')}" 
          style="width:${AUTHOR_AVATAR_SIZE}px;height:${AUTHOR_AVATAR_SIZE}px;border-radius:50%;overflow:hidden;
                 border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.25)">
          <img src="${escapeHtml(author.image || 'assets/imgs/placeholder.jpg')}" 
               style="width:100%;height:100%;object-fit:cover;display:block">
        </div>
      `;
      const icon = L.divIcon({
        className: 'leaflet-author-divicon',
        html: avatarHtml,
        iconSize: [AUTHOR_AVATAR_SIZE, AUTHOR_AVATAR_SIZE],
        iconAnchor: [AUTHOR_AVATAR_SIZE/2, AUTHOR_AVATAR_SIZE/2]
      });

      const aMarker = L.marker(posLatLng, { icon: icon, keyboard: false, title: author.name || '' });
      aMarker.bindTooltip(author.name || '', { direction: 'top', offset: [0, -6], permanent: false, opacity: 0.95 });

      // click -> hiển thị chi tiết tác giả
      aMarker.on('click', () => {
        try { localStorage.setItem('currentPlaceObj', JSON.stringify(placeObj)); } catch(e){}
        if (window.AuthorsModule && typeof window.AuthorsModule.showAuthorDetail === 'function') {
          window.AuthorsModule.showAuthorDetail(author, document.getElementById('sidebar-content'));
        }
        const sb = document.getElementById('sidebar');
        if (sb) sb.style.display = 'flex';
      });

      authorMarkersGroup.addLayer(aMarker);
    });

    currentAuthorPlaceId = placeObj.id || placeObj.place_id;
  }

  /* ---------- Load locals và tạo marker ---------- */
  function loadLocals() {
    const map = ensureMap();
    placesLayer.addTo(map);

    return fetch(DATA_URL)
      .then(r => { if (!r.ok) throw new Error('Không thể tải locals.json'); return r.json(); })
      .then(arr => {
        locals = Array.isArray(arr) ? arr : [];

        locals.forEach(item => {
          // ----- Custom marker có tên địa phương -----
          const markerHtml = `
            <div class="custom-marker">
              <div class="marker-dot"></div>
              <span class="marker-label">${escapeHtml(item.name)}</span>
            </div>
          `;
          const icon = L.divIcon({
            html: markerHtml,
            className: 'custom-marker-icon',
            iconSize: [30, 42],
            iconAnchor: [15, 42]
          });

          const mk = L.marker([item.lat, item.lon], { icon, title: item.name });
          mk._minZoomToShow = GLOBAL_MIN_ZOOM;

          // click -> chỉ zoom map, KHÔNG hiển thị avatar hay sidebar
          mk.on('click', () => {
            map.setView(mk.getLatLng(), ZOOM_ON_CLICK);
          });

          placesLayer.addLayer(mk);
          if (item.id) idToMarker[item.id] = mk;
        });

        updateMarkerVisibility();
        map.on('zoomend', updateMarkerVisibility);
        map.on('click', () => clearAuthorMarkers());

        return locals;
      })
      .catch(err => {
        console.error('Lỗi load locals.json:', err);
        throw err;
      });
  }

  /* ---------- Kiểm soát ẩn/hiện marker và avatar ---------- */
  function updateMarkerVisibility() {
    const map = ensureMap();
    const z = map.getZoom();

    // Hiển thị marker địa phương khi zoom = 15
    placesLayer.eachLayer(mk => {
      const minZ = mk._minZoomToShow || GLOBAL_MIN_ZOOM;
      const labelEl = mk.getElement()?.querySelector('.marker-label');
      if (z >= minZ && z < AUTHOR_AVATAR_ZOOM) {
        if (!map.hasLayer(mk)) map.addLayer(mk);
        if (labelEl) labelEl.style.display = 'inline';
      } else if (z >= AUTHOR_AVATAR_ZOOM) {
        if (labelEl) labelEl.style.display = 'none';
      } else {
        if (map.hasLayer(mk)) map.removeLayer(mk);
      }
    });

    // Hiển thị avatar tác giả khi zoom >= 16
    if (z < AUTHOR_AVATAR_ZOOM) {
      clearAuthorMarkers();
    } else if (z >= AUTHOR_AVATAR_ZOOM) {
      const visiblePlaces = locals.filter(p => map.getBounds().contains([p.lat, p.lon]));
      if (visiblePlaces.length > 0) {
        showAuthorsAround(visiblePlaces[0]);
      }
    }
  }

  function getPlaces() { return locals; }
  function getMarkerById(id) { return idToMarker[id]; }
  function getCurrentAuthorPlaceId() { return currentAuthorPlaceId; }

  /* ---------- Exported API ---------- */
  return {
    loadLocals,
    updateMarkerVisibility,
    getPlaces,
    getMarkerById,
    showAuthorsAround,
    clearAuthorMarkers,
    getCurrentAuthorPlaceId
  };
})();
