// assets/js/locals.js
// Module quản lý các địa điểm (locals) và hiển thị marker + avatar tác giả khi click
window.LocalsModule = (function () {
  const DATA_URL = '/Data/locals.json';
  const AUTHORS_URL = '/Data/authors.json';

  const GLOBAL_MIN_ZOOM = 13;   // marker hiển khi zoom >= 13
  const ZOOM_ON_CLICK = 15;     // zoom target khi click marker
  const AUTHOR_AVATAR_SIZE = 44; // px

  let locals = [];              // mảng địa điểm
  const placesLayer = L.layerGroup(); // layer cho markers địa điểm
  const authorMarkersGroup = L.layerGroup(); // layer cho avatar tác giả (xóa/ghi dễ dàng)
  const idToMarker = {};        // map id -> marker
  let localAuthors = null;      // fallback authors list nếu AuthorsModule không expose getAuthorsByPlace
  let currentAuthorPlaceId = null;

  /* ---------- Helpers ---------- */
  function ensureMap() {
    if (!window.map) throw new Error('window.map chưa được khởi tạo. Hãy nạp map.js trước LocalsModule.');
    return window.map;
  }

  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"'`]/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;' })[m]);
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
    // fallback: dùng localAuthors (có thể async)
    if (localAuthors === null) {
      // chưa load -> synchronous empty (caller có thể await showAuthorsAround which will call loadLocalAuthorsOnce)
      return [];
    }
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

  // Show author avatars around a placeObj (arrange in circle); radiusPx in pixel
  // This function is async because it may load authors fallback
  async function showAuthorsAround(placeObj, radiusPx = 90) {
    if (!placeObj || !placeObj.lat || !placeObj.lon) return;
    const map = ensureMap();

    // Make sure authors data available
    if (!(window.AuthorsModule && typeof window.AuthorsModule.getAuthorsByPlace === 'function')) {
      await loadLocalAuthorsOnce();
    }

    // get authors
    let authorsForPlace = getAuthorsForPlace(placeObj.id || placeObj.place_id);
    // If fallback returned empty but module might be async loaded later, try AuthorsModule again
    if ((!authorsForPlace || authorsForPlace.length === 0) && window.AuthorsModule && typeof window.AuthorsModule.getAuthorsByPlace === 'function') {
      authorsForPlace = window.AuthorsModule.getAuthorsByPlace(placeObj.id || placeObj.place_id) || [];
    }

    // if still none -> clear and return
    if (!authorsForPlace || authorsForPlace.length === 0) {
      clearAuthorMarkers();
      return;
    }

    // prepare group
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
        const angle = (i / n) * (Math.PI * 2) - Math.PI / 2; // start at top
        const r = radiusPx;
        const dx = Math.round(Math.cos(angle) * r);
        const dy = Math.round(Math.sin(angle) * r);
        pt = L.point(centerPoint.x + dx, centerPoint.y + dy);
      }

      const posLatLng = map.layerPointToLatLng(pt);

      // build DivIcon for avatar
      const avatarHtml = `
        <div class="author-avatar" title="${escapeHtml(author.name || '')}" style="width:${AUTHOR_AVATAR_SIZE}px;height:${AUTHOR_AVATAR_SIZE}px;border-radius:50%;overflow:hidden;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.25)">
          <img src="${escapeHtml(author.image || 'assets/imgs/placeholder.jpg')}" style="width:100%;height:100%;object-fit:cover;display:block">
        </div>
      `;
      const icon = L.divIcon({
        className: 'leaflet-author-divicon',
        html: avatarHtml,
        iconSize: [AUTHOR_AVATAR_SIZE, AUTHOR_AVATAR_SIZE],
        iconAnchor: [AUTHOR_AVATAR_SIZE/2, AUTHOR_AVATAR_SIZE/2]
      });

      const aMarker = L.marker(posLatLng, { icon: icon, keyboard: false, title: author.name || '' });

      // tooltip on hover (use bindTooltip)
      aMarker.bindTooltip(author.name || '', { direction: 'top', offset: [0, -6], permanent: false, opacity: 0.95 });

      // click -> open author detail in sidebar
      aMarker.on('click', () => {
        // save current place for back
        try { localStorage.setItem('currentPlaceObj', JSON.stringify(placeObj)); } catch(e){}

        // use AuthorsModule.showAuthorDetail if available
        if (window.AuthorsModule && typeof window.AuthorsModule.showAuthorDetail === 'function') {
          window.AuthorsModule.showAuthorDetail(author, document.getElementById('sidebar-content'));
        } else {
          // fallback minimal detail
          const detail = document.getElementById('sidebar-content');
          if (detail) detail.innerHTML = `<div style="padding:12px"><h4>${escapeHtml(author.name)}</h4><p>${escapeHtml(author.bio||'')}</p></div>`;
        }

        // If list present, highlight in list (if module supports)
        if (window.AuthorsModule && typeof window.AuthorsModule.highlightAuthorInList === 'function') {
          // ensure list rendered
          if (document.getElementById('sidebar-authors-list')?.children.length === 0) {
            if (typeof window.AuthorsModule.renderAuthorsList === 'function') {
              window.AuthorsModule.renderAuthorsList(placeObj);
              setTimeout(() => window.AuthorsModule.highlightAuthorInList(author.id), 80);
            } else {
              window.AuthorsModule.highlightAuthorInList(author.id);
            }
          } else {
            window.AuthorsModule.highlightAuthorInList(author.id);
          }
        }

        // show sidebar
        const sb = document.getElementById('sidebar');
        if (sb) sb.style.display = 'flex';
      });

      authorMarkersGroup.addLayer(aMarker);
    });

    currentAuthorPlaceId = placeObj.id || placeObj.place_id;
  }

  /* ---------- Load locals and create markers ---------- */
  function loadLocals() {
    const map = ensureMap();
    placesLayer.addTo(map);

    return fetch(DATA_URL)
      .then(r => { if (!r.ok) throw new Error('Không thể tải locals.json'); return r.json(); })
      .then(arr => {
        locals = Array.isArray(arr) ? arr : [];

        locals.forEach(item => {
          const mk = L.marker([item.lat, item.lon], { title: item.name });
          mk.bindPopup(`<div style="min-width:180px"><b>${escapeHtml(item.name)}</b></div>`);

          // allow item.minZoomToShow override
          mk._minZoomToShow = typeof item.minZoomToShow === 'number' ? item.minZoomToShow : GLOBAL_MIN_ZOOM;

          // on click -> zoom and show authors around
          mk.on('click', () => {
            if (!map.hasLayer(mk)) mk.addTo(map);
            map.setView(mk.getLatLng(), ZOOM_ON_CLICK);
            mk.openPopup();

            // show avatars
            // If AuthorsModule exists and authors may be async, showAuthorsAround handles fallback
            showAuthorsAround(item);

            // save current place for back
            try { localStorage.setItem('currentPlaceObj', JSON.stringify(item)); } catch(e){}

            // optionally render author list in sidebar
            if (window.AuthorsModule && typeof window.AuthorsModule.renderAuthorsList === 'function') {
              window.AuthorsModule.renderAuthorsList(item);
            } else {
              // ensure sidebar visible even if AuthorsModule not present
              const sb = document.getElementById('sidebar');
              if (sb) sb.style.display = 'flex';
            }
          });

          placesLayer.addLayer(mk);
          if (item.id) idToMarker[item.id] = mk;
        });

        // update initial visibility and listen zoom changes
        updateMarkerVisibility();
        map.on('zoomend', updateMarkerVisibility);

        // hide author avatars when clicking map background (unless clicking a marker)
        map.on('click', (ev) => {
          // if clicked on map (not marker), clear avatars
          // Leaflet passes event with originalEvent; we can check target layer, but easiest is clear
          clearAuthorMarkers();
        });

        return locals;
      })
      .catch(err => {
        console.error('Lỗi load locals.json:', err);
        throw err;
      });
  }

  function updateMarkerVisibility() {
    const map = ensureMap();
    const z = map.getZoom();

    placesLayer.eachLayer(mk => {
      const minZ = mk._minZoomToShow || GLOBAL_MIN_ZOOM;
      if (z >= minZ) {
        if (!map.hasLayer(mk)) map.addLayer(mk);
      } else {
        if (map.hasLayer(mk)) map.removeLayer(mk);
      }
    });

    // hide author avatars if zoomed out
    if (z < ZOOM_ON_CLICK) {
      clearAuthorMarkers();
    } else {
      // optional: if we previously showed avatars for a place and want to re-draw when zooming in,
      // we could re-show them here. For now, do nothing (avatars show only on marker click).
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
