// script.js
// Các tiện ích nhỏ, ví dụ: cập nhật visibility search bar theo kích thước, đóng sidebar khi click map, ...
(function () {
  // show/hide desktop/mobile search when resizing
  function updateSearchVisibility() {
    const desktop = document.querySelector(".search-desktop");
    const mobile = document.querySelector(".search-mobile");
    if (window.innerWidth >= 769) {
      desktop?.classList.remove("d-none");
      mobile?.classList.add("d-none");
    } else {
      mobile?.classList.remove("d-none");
      desktop?.classList.add("d-none");
    }
  }
  window.addEventListener("resize", updateSearchVisibility);
  updateSearchVisibility();

  // close sidebar when clicking map background
  if (window.map) {
    window.map.on("click", () => {
      const sb = document.getElementById("sidebar");
      if (sb) sb.style.display = "none";
    });
  } else {
    window.addEventListener("load", () => {
      if (window.map) {
        window.map.on("click", () => {
          const sb = document.getElementById("sidebar");
          if (sb) sb.style.display = "none";
        });
      }
    });
  }

  // Auto-load locals after everything ready (if LocalsModule exists)
  function tryLoadLocals() {
    if (
      window.LocalsModule &&
      typeof window.LocalsModule.loadLocals === "function"
    ) {
      // call, but guard against multiple calls
      if (!window._locals_loaded) {
        window._locals_loaded = true;
        window.LocalsModule.loadLocals().catch(() => { });
      }
    } else {
      // retry after a short delay if not ready
      setTimeout(tryLoadLocals, 300);
    }
  }
  tryLoadLocals();
})();
