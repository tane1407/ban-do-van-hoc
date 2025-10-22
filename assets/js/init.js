// init.js - load locals nhưng KHÔNG auto-open sidebar
(function () {
  function tryInit() {
    if (window.LocalsModule && typeof window.LocalsModule.loadLocals === 'function') {
      if (!window._locals_loaded) {
        window._locals_loaded = true;
        window.LocalsModule.loadLocals().catch(err => {
          console.warn('Locals load failed in init:', err);
        });
      }
      return;
    }
    setTimeout(tryInit, 200);
  }
  tryInit();

  // quản lý hi/ẩn thanh tìm kiếm theo kích thước
  function updateSearchVisibility(){
    const desktop = document.querySelector('.search-desktop');
    const mobile = document.querySelector('.search-mobile');
    if (window.innerWidth >= 769) { desktop?.classList.remove('d-none'); mobile?.classList.add('d-none'); }
    else { mobile?.classList.remove('d-none'); desktop?.classList.add('d-none'); }
  }
  window.addEventListener('resize', updateSearchVisibility);
  updateSearchVisibility();

  // khi click lên map, ẩn suggestion box (không đóng sidebar)
  if (window.map) {
    window.map.on('click', () => {
      document.getElementById('searchDesktop')?._sbox && (document.getElementById('searchDesktop')._sbox.style.display='none');
      document.getElementById('searchMobile')?._sbox && (document.getElementById('searchMobile')._sbox.style.display='none');
    });
  }
})();
