// assets/js/authors.js
// Module quản lý tác giả

window.AuthorsModule = (function () {
  let authors = [];

  /* ===========================
      LOAD authors.json
  ============================ */
  (function loadAuthors() {
    fetch("./Data/authors.json")
      .then((res) => {
        if (!res.ok) throw new Error("Cannot load authors.json");
        return res.json();
      })
      .then((arr) => {
        authors = Array.isArray(arr) ? arr : [];
      })
      .catch((err) => {
        console.error("Error loading authors.json:", err);
        authors = [];
      });
  })();

  /* ===========================
      HELPERS
  ============================ */
  function getAuthorsByPlace(placeId) {
    if (!placeId) return [];
    return authors.filter((a) => a.place_id === placeId);
  }

  function escapeHtml(s) {
    if (s === null || s === undefined) return "";
    return String(s).replace(/[&<>"'`]/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
      "`": "&#96;",
    }[m]));
  }

  /* ==================================================
     Render text blocks:
     - Mảng → mỗi phần = 1 <ul> riêng
     - Chuỗi nhiều dòng → tách mỗi dòng = 1 <ul>
     - Chuỗi 1 dòng → hiển thị bình thường
  =================================================== */
  function renderTextBlocks(data) {
    if (!data) return "";

    // ✅ Array → mỗi block = 1 <ul>
    if (Array.isArray(data)) {
      return data
        .map(block => `
          <ul style="margin:8px 0 0 22px; padding:0">
            <li>${escapeHtml(block)}</li>
          </ul>
        `)
        .join("");
    }

    // ✅ String
    if (typeof data === "string") {
      const lines = data
        .split(/\r?\n/)
        .map(s => s.trim())
        .filter(Boolean);

      // nhiều dòng → nhiều <ul>
      if (lines.length > 1) {
        return lines
          .map(line => `
            <ul style="margin:8px 0 0 22px; padding:0">
              <li>${escapeHtml(line)}</li>
            </ul>
          `)
          .join("");
      }

      // 1 dòng
      return `<div>${escapeHtml(data)}</div>`;
    }

    return "";
  }

  /* ===========================
        CHI TIẾT TÁC GIẢ
  ============================ */
  function showAuthorDetail(author, containerEl) {
    if (!author) return;
    if (!containerEl) containerEl = document.getElementById("sidebar-content");
    if (!containerEl) return;

    const birthDeath = `${escapeHtml(author.birth || "")}${
      author.birth && author.death ? " - " : ""
    }${escapeHtml(author.death || "")}`;

    const imgHtml = author.image
      ? `
        <div style="text-align:center; margin:16px 0">
          <img src="${escapeHtml(author.image)}"
            style="width:240px; border-radius:6px;
                   box-shadow:0 2px 6px rgba(0,0,0,.25)">
        </div>
      `
      : "";

    const bioHtml = author.bio
      ? `
        <div style="margin-top:14px; text-align:justify">
          <span style="color:#b30000; font-weight:bold">Tiểu sử:</span>
          ${renderTextBlocks(author.bio)}
        </div>
      `
      : "";

    const lifeHtml = author.life
      ? `
        <div style="margin-top:14px; text-align:justify">
          <span style="color:#b30000; font-weight:bold">Cuộc đời:</span>
          ${renderTextBlocks(author.life)}
        </div>
      `
      : "";

    const careerHtml = author.career
      ? `
        <div style="margin-top:14px; text-align:justify">
          <span style="color:#b30000; font-weight:bold">Sự nghiệp thơ văn:</span>

          ${
            author.career.works
              ? `
                <div style="margin-top:8px">
                  <b>Tác phẩm:</b>
                  ${renderTextBlocks(author.career.works)}
                </div>
              `
              : ""
          }

          ${
            author.career.style
              ? `
                <div style="margin-top:8px">
                  <b>Đặc điểm thơ văn:</b>
                  ${renderTextBlocks(author.career.style)}
                </div>
              `
              : ""
          }
        </div>
      `
      : "";

    containerEl.innerHTML = `
      <div style="padding:15px; font-size:16px; line-height:1.65">

        <h2 style="
          margin:0;
          font-weight:bold;
          color:#b30000;
          font-size:26px;
          text-transform:uppercase
        ">
          ${escapeHtml(author.name)}
        </h2>

        <div style="margin-top:4px; font-size:17px; color:#222">
          ${birthDeath}
        </div>

        ${imgHtml}
        ${bioHtml}
        ${lifeHtml}
        ${careerHtml}
      </div>
    `;
  }

  /* ===========================
        DANH SÁCH TÁC GIẢ
  ============================ */
  function renderAuthorsForPlace(placeObj) {
    const detailEl = document.getElementById("sidebar-content");
    const titleEl = document.getElementById("sidebar-title");
    if (!placeObj || !detailEl || !titleEl) return;

    titleEl.textContent = placeObj.name || "Thông tin địa điểm";

    const list = getAuthorsByPlace(placeObj.id || placeObj.place_id);
    if (!list.length) {
      detailEl.innerHTML = `<div style="padding:12px">Không có tác giả tại địa điểm này.</div>`;
      openSidebar();
      return;
    }

    detailEl.innerHTML = list
      .map(a => `
        <div style="border-bottom:1px solid #ddd; padding:12px 0">
          <h4 style="margin:0">${escapeHtml(a.name)}</h4>
          <small style="color:#666">
            ${escapeHtml(a.birth || "")}${a.birth && a.death ? " - " : ""}${escapeHtml(a.death || "")}
          </small>

          ${a.image ? `<img src="${escapeHtml(a.image)}"
            style="width:100%; border-radius:8px; margin-top:8px">` : ""}

          ${a.bio ? `<div style="margin-top:8px; text-align:justify">
            ${renderTextBlocks(a.bio)}
          </div>` : ""}
        </div>
      `)
      .join("");

    openSidebar();
  }

  /* ===========================
        SIDEBAR
  ============================ */
 function openSidebar() {
  const sb = document.getElementById("sidebar");
  if (!sb) return;

  sb.style.display = "flex";

  if (window.innerWidth < 768) {
    sb.classList.remove("full");
    sb.classList.add("mini");
  }
}


  function closeSidebar() {
    const sb = document.getElementById("sidebar");
    if (sb) sb.style.display = "none";
  }

  document
    .getElementById("sidebar-close")
    ?.addEventListener("click", closeSidebar);

  return {
    getAuthorsByPlace,
    renderAuthorsForPlace,
    showAuthorDetail,
    openSidebar,
    closeSidebar,
  };
})();
(function enableMobileSwipeSidebar() {
  const sidebar = document.getElementById("sidebar");
  const header = document.querySelector(".sidebar-header");
  if (!sidebar || !header) return;

  let startY = 0;
  let currentY = 0;

  header.addEventListener("touchstart", e => {
    startY = e.touches[0].clientY;
  });

  header.addEventListener("touchmove", e => {
    currentY = e.touches[0].clientY;
  });

  header.addEventListener("touchend", () => {
    const diff = currentY - startY;

    // Vuốt lên
    if (diff < -40) {
      sidebar.classList.remove("mini");
      sidebar.classList.add("full");
    }

    // Vuốt xuống
    if (diff > 40) {
      if (sidebar.classList.contains("full")) {
        sidebar.classList.remove("full");
        sidebar.classList.add("mini");
      } else {
        sidebar.style.display = "none";
      }
    }
  });
})();
