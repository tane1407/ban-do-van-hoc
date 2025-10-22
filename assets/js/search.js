// assets/js/search.js
// Tìm kiếm (autocomplete) cho cả ĐỊA ĐIỂM (locals) và TÁC GIẢ (authors)
// Yêu cầu: LocalsModule, AuthorsModule (nếu có) và window.map (tuỳ chọn)

(function () {
  const LOCALS_URL = './data/locals.json';
  const AUTHORS_URL = './data/authors.json';

  let searchLocals = [];
  let searchAuthors = [];

  // Load cả 2 file JSON song song
  Promise.all([
    fetch(LOCALS_URL).then(r => r.ok ? r.json() : []).catch(() => []),
    fetch(AUTHORS_URL).then(r => r.ok ? r.json() : []).catch(() => [])
  ])
    .then(([locals, authors]) => {
      searchLocals = Array.isArray(locals) ? locals : [];
      searchAuthors = Array.isArray(authors) ? authors : [];
    })
    .catch(err => {
      console.error('Lỗi tải dữ liệu tìm kiếm:', err);
      searchLocals = [];
      searchAuthors = [];
    });

  /* ---------- Helpers: suggestion box ---------- */
  function createSuggestionBox(inputEl) {
    if (inputEl._sbox) return inputEl._sbox;
    const box = document.createElement('div');
    box.className = 'suggest-box';
    box.style.display = 'none';
    box.style.maxHeight = '360px';
    box.style.overflow = 'auto';
    box.setAttribute('role', 'listbox');
    document.body.appendChild(box);
    inputEl._sbox = box;

    function updatePos() {
      const r = inputEl.getBoundingClientRect();
      box.style.left = (r.left) + 'px';
      box.style.top = (r.bottom + window.scrollY) + 'px';
      box.style.minWidth = Math.max(r.width, 260) + 'px';
    }
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);
    inputEl.addEventListener('input', updatePos);
    return box;
  }

  function hideSuggestions(inputEl) {
    if (inputEl && inputEl._sbox) inputEl._sbox.style.display = 'none';
  }

  /* ---------- Render suggestions (authors first, then places) ---------- */
  function renderSuggestions(inputEl, authorsItems, placesItems) {
    const box = createSuggestionBox(inputEl);
    box.innerHTML = '';

    const hasA = authorsItems && authorsItems.length;
    const hasP = placesItems && placesItems.length;

    if (!hasA && !hasP) {
      box.style.display = 'none';
      return;
    }

    // small factory row
    function makeRow(kind, title, subtitle, payload) {
      const row = document.createElement('div');
      row.className = 'suggest-item';
      row.dataset.kind = kind;
      row.style.padding = '8px 10px';
      row.style.cursor = 'pointer';
      row.innerHTML = `<strong style="display:block">${escapeHtml(title)}</strong>${subtitle ? `<div style="font-size:12px;color:#666">${escapeHtml(subtitle)}</div>` : ''}`;
      row.addEventListener('click', () => {
        box.style.display = 'none';
        if (kind === 'author') onSelectAuthor(payload);
        else onSelectPlace(payload);
        inputEl.blur();
      });
      return row;
    }

    // Authors header
    if (hasA) {
      const h = document.createElement('div');
      h.style.padding = '6px 10px';
      h.style.fontSize = '12px';
      h.style.fontWeight = '700';
      h.style.color = '#333';
      h.textContent = 'Tác giả';
      box.appendChild(h);
      authorsItems.forEach(a => {
        // subtitle là nơi gắn tác giả (place name nếu có)
        const placeName = (a.place_id && findPlaceById(a.place_id)?.name) || '';
        box.appendChild(makeRow('author', a.name, placeName, a));
      });
    }

    // Places header
    if (hasP) {
      const h = document.createElement('div');
      h.style.padding = '6px 10px';
      h.style.fontSize = '12px';
      h.style.fontWeight = '700';
      h.style.color = '#333';
      h.textContent = 'Địa điểm';
      box.appendChild(h);
      placesItems.forEach(p => {
        box.appendChild(makeRow('place', p.name, p.id || '', p));
      });
    }

    box.style.display = 'block';
  }

  /* ---------- Utility small ---------- */
  function escapeHtml(s) {
    if (!s && s !== 0) return '';
    return String(s).replace(/[&<>"'`]/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;' })[m]);
  }

  function findPlaceById(id) {
    if (!id) return null;
    return searchLocals.find(p => p.id === id) || (window.LocalsModule && typeof window.LocalsModule.getPlaces === 'function' ? window.LocalsModule.getPlaces().find(p => p.id === id) : null);
  }

  /* ---------- Khi chọn 1 tác giả từ suggestions ---------- */
  function onSelectAuthor(author) {
    if (!author) return;
    // nếu AuthorsModule có showAuthorDetail -> dùng
    if (window.AuthorsModule && typeof window.AuthorsModule.showAuthorDetail === 'function') {
      window.AuthorsModule.showAuthorDetail(author, document.getElementById('sidebar-content'));
    } else if (window.AuthorsModule && typeof window.AuthorsModule.renderAuthorsList === 'function') {
      // fallback: render list chỗ tác giả
      const place = findPlaceById(author.place_id) || { name: '' };
      window.AuthorsModule.renderAuthorsList(place);
      // cố gắng highlight sau khi render bằng cách gọi function nếu module có
      if (typeof window.AuthorsModule.highlightAuthorInList === 'function') {
        setTimeout(()=> window.AuthorsModule.highlightAuthorInList(author.id), 100);
      }
    } else {
      // fallback đơn giản: mở sidebar và hiển thị tên author
      const detail = document.getElementById('sidebar-content');
      if (detail) {
        detail.innerHTML = `<div style="padding:12px"><h4>${escapeHtml(author.name)}</h4><p>${escapeHtml(author.bio||'')}</p></div>`;
      }
    }

    // zoom tới place nếu có
    if (author.place_id) {
      const place = findPlaceById(author.place_id);
      if (place && place.lat && place.lon && window.map) {
        window.map.setView([place.lat, place.lon], 15);
      }
    }

    // show sidebar
    const sb = document.getElementById('sidebar');
    if (sb) sb.style.display = 'flex';
  }

  /* ---------- Khi chọn 1 địa điểm từ suggestions ---------- */
  function onSelectPlace(place) {
    if (!place) return;
    try { localStorage.setItem('currentPlaceObj', JSON.stringify(place)); } catch(e){}
    if (window.AuthorsModule && typeof window.AuthorsModule.renderAuthorsList === 'function') {
      window.AuthorsModule.renderAuthorsList(place);
    }
    if (place.lat && place.lon && window.map) {
      window.map.setView([place.lat, place.lon], 15);
    }
    const sb = document.getElementById('sidebar');
    if (sb) sb.style.display = 'flex';
  }

  /* ---------- Search helpers ---------- */
  function searchAuthorsByQuery(q) {
    if (!q) return [];
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return searchAuthors.filter(a => (a.name||'').toLowerCase().includes(t)).slice(0, 8);
  }

  function searchPlacesByQuery(q) {
    if (!q) return [];
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return searchLocals.filter(p => (p.name||'').toLowerCase().includes(t)).slice(0, 8);
  }

  /* ---------- Xử lý Enter / xử lý input ---------- */
  function handleEnter(inputEl) {
    const q = (inputEl.value || '').trim();
    if (!q) return;

    // ưu tiên match chính xác author
    const exactAuthor = searchAuthors.find(a => (a.name||'').toLowerCase() === q.toLowerCase());
    if (exactAuthor) { onSelectAuthor(exactAuthor); hideSuggestions(inputEl); return; }

    // ưu tiên match chính xác place
    const exactPlace = searchLocals.find(p => (p.name||'').toLowerCase() === q.toLowerCase());
    if (exactPlace) { onSelectPlace(exactPlace); hideSuggestions(inputEl); return; }

    // nếu không exact: lấy matches
    const aMatches = searchAuthorsByQuery(q);
    const pMatches = searchPlacesByQuery(q);

    // nếu có đúng 1 tác giả -> chọn
    if (aMatches.length === 1 && pMatches.length === 0) { onSelectAuthor(aMatches[0]); hideSuggestions(inputEl); return; }
    // nếu có đúng 1 place -> chọn
    if (pMatches.length === 1 && aMatches.length === 0) { onSelectPlace(pMatches[0]); hideSuggestions(inputEl); return; }

    // nếu nhiều places -> fitBounds
    const placesToBounds = pMatches.length ? pMatches : (aMatches.length ? aMatches.map(a => findPlaceById(a.place_id)).filter(Boolean) : []);
    if (placesToBounds.length > 0 && window.map) {
      const bounds = placesToBounds.map(p => [p.lat, p.lon]);
      window.map.fitBounds(bounds, { padding: [40,40] });
      hideSuggestions(inputEl);
      return;
    }

    alert('Không tìm thấy kết quả chính xác trong dữ liệu local.');
  }

  /* ---------- Wire up DOM inputs (desktop + mobile) ---------- */
  const inputDesktop = document.getElementById('searchDesktop');
  const btnDesktop = document.getElementById('btnSearchDesktop');
  const inputMobile = document.getElementById('searchMobile');
  const btnMobile = document.getElementById('btnSearchMobile');

  function handleInputChange(inputEl) {
    const v = inputEl.value || '';
    if (!v.trim()) { hideSuggestions(inputEl); return; }
    const aMatches = searchAuthorsByQuery(v);
    const pMatches = searchPlacesByQuery(v);
    renderSuggestions(inputEl, aMatches, pMatches);
  }

  if (inputDesktop) {
    inputDesktop.addEventListener('input', () => handleInputChange(inputDesktop));
    inputDesktop.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); handleEnter(inputDesktop); }
      // optional: navigate suggestions with arrow keys (not implemented here)
    });
    btnDesktop?.addEventListener('click', () => handleEnter(inputDesktop));
  }

  if (inputMobile) {
    inputMobile.addEventListener('input', () => handleInputChange(inputMobile));
    inputMobile.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); handleEnter(inputMobile); }
    });
    btnMobile?.addEventListener('click', () => handleEnter(inputMobile));
  }

  // click outside => đóng suggestion
  document.addEventListener('click', (ev) => {
    if (inputDesktop && inputDesktop._sbox && ev.target !== inputDesktop && !inputDesktop._sbox.contains(ev.target)) inputDesktop._sbox.style.display = 'none';
    if (inputMobile && inputMobile._sbox && ev.target !== inputMobile && !inputMobile._sbox.contains(ev.target)) inputMobile._sbox.style.display = 'none';
  });

  // expose small helpers for external usage (tuỳ chọn)
  window.SearchModule = {
    findPlaceById,
    searchAuthorsByQuery,
    searchPlacesByQuery
  };

})();
