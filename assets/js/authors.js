// assets/js/authors.js
// Module quản lý tác giả + sidebar mobile 3 size

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
     - Array → mỗi phần tử = 1 <ul>
     - String nhiều dòng → mỗi dòng = 1 <ul>
     - String 1 dòng → <div>
  =================================================== */
  function renderTextBlocks(data) {
    if (!data) return "";

    // ✅ Array
    if (Array.isArray(data)) {
      return data
        .map(
          (item) => `
          <ul style="margin:8px 0 0 22px; padding:0">
            <li>${escapeHtml(item)}</li>
          </ul>
        `
        )
        .join("");
    }

    // ✅ String
    if (typeof data === "string") {
      const lines = data
        .split(/\r?\n/)
        .map((t) => t.trim())
        .filter(Boolean);

      if (lines.length > 1) {
        return lines
          .map(
            (line) => `
              <ul style="margin:8px 0 0 22px; padding:0">
                <li>${escapeHtml(line)}</li>
              </ul>
            `
          )
          .join("");
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

    const imgHtml = author.image
      ? `
        <div style="text-align:center; margin:16px 0">
          <img src="${escapeHtml(author.image)}"
            style="max-width:100%; width:320px;
            border-radius:8px;
            box-shadow:0 2px 6px rgba(0,0,0,.25)">
        </div>
      `
      : "";

    containerEl.innerHTML = `
      <div style="padding:15px; font-size:16px; line-height:1.65">

        <h2 style="
          margin:0;
          font-size:26px;
          font-weight:bold;
          color:#b30000;
          text-transform:uppercase
        ">
          ${escapeHtml(author.name)}
        </h2>

        <div style="margin-top:4px; font-size:17px; color:#222">
          ${birthDeath}
        </div>

        ${imgHtml}

        ${
          author.bio
            ? `
          <div style="margin-top:14px">
            <span style="color:#b30000; font-weight:bold">Tiểu sử:</span>
            ${renderTextBlocks(author.bio)}
          </div>
        `
            : ""
        }

        ${
          author.life
            ? `
          <div style="margin-top:14px">
            <span style="color:#b30000; font-weight:bold">Cuộc đời:</span>
            ${renderTextBlocks(author.life)}
          </div>
        `
            : ""
        }

        ${
          author.career
            ? `
          <div style="margin-top:14px">
            <span style="color:#b30000; font-weight:bold">Sự nghiệp thơ văn:</span>

            ${
              author.career.works
                ? `
              <div style="margin-top:8px">
                <b>+ Tác phẩm:</b>
                ${renderTextBlocks(author.career.works)}
              </div>`
                : ""
            }

            ${
              author.career.style
                ? `
              <div style="margin-top:8px">
                <b>+ Đặc điểm thơ văn:</b>
                ${renderTextBlocks(author.career.style)}
              </div>`
                : ""
            }
          </div>
        `
            : ""
        }

      </div>
    `;

    openSidebar();
  }
  
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
      .map(
        (a) => `
        <div class="author-card" onclick="AuthorsModule.showAuthorDetail(${JSON.stringify(a).replace(/"/g, "&quot;")})">
          ${
            a.image
              ? `<img class="avatar" src="${escapeHtml(a.image)}">`
              : ""
          }
          <div class="meta">
            <div class="name">${escapeHtml(a.name)}</div>
            <div class="subtitle">
              ${escapeHtml(a.birth || "")}${a.birth && a.death ? " - " : ""}${escapeHtml(a.death || "")}
            </div>
          </div>
        </div>
      `
      )
      .join("");

    openSidebar();
  }

  /* sidebar */
  function openSidebar() {
    const sb = document.getElementById("sidebar");
    if (!sb) return;

    sb.style.display = "flex";
    sb.classList.remove("full", "mini");
    sb.classList.add("medium");
  }

  function closeSidebar() {
    const sb = document.getElementById("sidebar");
    if (sb) sb.style.display = "none";
  }

  document
    .getElementById("sidebar-close")
    ?.addEventListener("click", closeSidebar);

  (function enableMobileDrag() {
    if (window.innerWidth >= 768) return;

    const sb = document.getElementById("sidebar");
    const header = document.querySelector(".sidebar-header");
    if (!sb || !header) return;

    let startY = 0;
    let endY = 0;

    function setState(state) {
      sb.classList.remove("mini", "medium", "full");
      sb.classList.add(state);
    }

    header.addEventListener("touchstart", (e) => {
      startY = e.touches[0].clientY;
    });

    header.addEventListener("touchmove", (e) => {
      endY = e.touches[0].clientY;
    });

    header.addEventListener("touchend", () => {
      const delta = startY - endY;

      if (delta > 60) {
        if (sb.classList.contains("mini")) setState("medium");
        else setState("full");
      } else if (delta < -60) {
        if (sb.classList.contains("full")) setState("medium");
        else setState("mini");
      }
    });
  })();

  /* ===========================
        PUBLIC API
  ============================ */
  return {
    getAuthorsByPlace,
    renderAuthorsForPlace,
    showAuthorDetail,
    openSidebar,
    closeSidebar,
  };
})();
