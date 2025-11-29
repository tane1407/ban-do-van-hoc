// assets/js/authors.js
// Module quản lý tác giả

window.AuthorsModule = (function () {
  let authors = [];
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
     - Array → mỗi phần tử = 1 <ul> riêng
     - String nhiều dòng → mỗi dòng = 1 <ul>
     - String 1 dòng → hiển thị thường
  =================================================== */
  function renderTextBlocks(data) {
    if (!data) return "";

    // ✅ Array
    if (Array.isArray(data)) {
      return data.map(item => `
        <ul style="margin:8px 0 0 22px; padding:0">
          <li>${escapeHtml(item)}</li>
        </ul>
      `).join("");
    }

    // ✅ String
    if (typeof data === "string") {
      const lines = data
        .split(/\r?\n/)
        .map(t => t.trim())
        .filter(Boolean);

      if (lines.length > 1) {
        return lines.map(line => `
          <ul style="margin:8px 0 0 22px; padding:0">
            <li>${escapeHtml(line)}</li>
          </ul>
        `).join("");
      }

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

    const imgHtml = author.image ? `
      <div style="text-align:center; margin:16px 0">
        <img src="${escapeHtml(author.image)}"
          style="width:320px;border-radius:6px;
          box-shadow:0 2px 6px rgba(0,0,0,0.25)">
      </div>
    ` : "";

    const bioHtml = author.bio ? `
      <div style="margin-top:14px; text-align:justify">
        <span style="color:#b30000; font-weight:bold">Tiểu sử:</span>
        ${renderTextBlocks(author.bio)}
      </div>
    ` : "";

    const lifeHtml = author.life ? `
      <div style="margin-top:14px; text-align:justify">
        <span style="color:#b30000; font-weight:bold">Cuộc đời:</span>
        ${renderTextBlocks(author.life)}
      </div>
    ` : "";

    const careerHtml = author.career ? `
      <div style="margin-top:14px; text-align:justify">
        <span style="color:#b30000; font-weight:bold">Sự nghiệp thơ văn:</span>

        ${author.career.works ? `
          <div style="margin-top:8px">
            <b>+ Tác phẩm:</b>
            ${renderTextBlocks(author.career.works)}
          </div>
        ` : ""}

        ${author.career.style ? `
          <div style="margin-top:8px">
            <b>+ Đặc điểm thơ văn:</b>
            ${renderTextBlocks(author.career.style)}
          </div>
        ` : ""}
      </div>
    ` : "";

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

        <div style="margin:4px 0 0; font-size:17px; color:#222">
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
      detailEl.innerHTML =
        `<div style="padding:12px">Không có tác giả tại địa điểm này.</div>`;
      openSidebar();
      return;
    }

    detailEl.innerHTML = list.map(author => `
      <div style="border-bottom:1px solid #ddd; padding:12px 0">
        <h4 style="margin:0">${escapeHtml(author.name)}</h4>
        <small style="color:#666">
          ${escapeHtml(author.birth || "")}${author.birth && author.death ? " - " : ""}${escapeHtml(author.death || "")}
        </small>

        ${author.image ? `
          <img src="${escapeHtml(author.image)}"
            style="width:100%;border-radius:8px;margin-top:8px">
        ` : ""}

        ${author.bio ? `
          <div style="margin-top:8px; text-align:justify">
            ${renderTextBlocks(author.bio)}
          </div>
        ` : ""}
      </div>
    `).join("");

    openSidebar();
  }

  /* ===========================
        SIDEBAR
  ============================ */
  function openSidebar() {
    const sb = document.getElementById("sidebar");
    if (sb) sb.style.display = "flex";
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
