// assets/js/authors.js
// Module quản lý tác giả và hiển thị vào sidebar (hiển thị CHI TIẾT đầy đủ khi xem author)
window.AuthorsModule = (function () {
  let authors = [];

  // Load authors.json một lần
  (function loadAuthors() {
    fetch("/data/authors.json")
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

  // Lấy danh sách tác giả theo place_id
  function getAuthorsByPlace(placeId) {
    if (!placeId) return [];
    return authors.filter((a) => a.place_id === placeId);
  }

  // Escape HTML để tránh XSS / hiển thị an toàn
  function escapeHtml(s) {
    if (s === null || s === undefined) return "";
    return String(s).replace(
      /[&<>"'`]/g,
      (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
        "`": "&#96;",
      }[m])
    );
  }

  /* ====== Hiển thị CHI TIẾT tác giả (full) ======
     - Hiển thị: image (to), name, birth-death, bio (toàn bộ), life, works (liệt kê)
     - Có nút "Quay lại" để về danh sách tác giả của place hiện tại.
  */
  function showAuthorDetail(author, containerEl) {
    if (!author) return;
    if (!containerEl) containerEl = document.getElementById("sidebar-content");
    if (!containerEl) return;

    const imgHtml = author.image
      ? `<img src="${escapeHtml(author.image)}" alt="${escapeHtml(
        author.name
      )}" style="width:100%;border-radius:8px;margin-top:8px">`
      : "";
    const birthDeath = `${escapeHtml(author.birth || "")}${author.birth && author.death ? " - " : ""
      }${escapeHtml(author.death || "")}`;

    // works: nếu có mảng -> liệt kê
    let worksHtml = "";
    if (author.works && Array.isArray(author.works) && author.works.length) {
      worksHtml = `<div style="margin-top:12px"><strong>Tác phẩm chính:</strong><ul style="margin-top:6px; padding-left:18px;">${author.works
        .map((w) => `<li>${escapeHtml(w)}</li>`)
        .join("")}</ul></div>`;
    }

    // life và bio: hiển thị đầy đủ (có thể nhiều đoạn)
    const bioHtml = author.bio
      ? `<div style="margin-top:10px;white-space:pre-line">${escapeHtml(
        author.bio
      )}</div>`
      : "";
    const lifeHtml = author.life
      ? `<div style="margin-top:10px"><strong>Cuộc đời:</strong><div style="margin-top:6px; white-space:pre-line">${escapeHtml(
        author.life
      )}</div></div>`
      : "";

    containerEl.innerHTML = `
      <div style="padding:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
          <div>
            <h4 style="margin:0 0 6px 0">${escapeHtml(author.name)}</h4>
            <small style="color:#666">${birthDeath}</small>
          </div>
        </div>
        ${imgHtml}
        ${bioHtml}
        ${lifeHtml}
        ${worksHtml}

        <div style="margin-top:14px; display:flex; gap:8px; align-items:center;">
          <button id="author-back" class="btn btn-sm btn-outline-secondary">← Quay lại</button>
          ${author.source
        ? `<a href="${escapeHtml(
          author.source
        )}" target="_blank" rel="noopener" class="btn btn-sm btn-link">Nguồn</a>`
        : ""
      }
        </div>
      </div>
    `;

    // Bắt sự kiện back (nếu element tồn tại)
    const back = document.getElementById("author-back");
    if (back) {
      back.onclick = () => {
        const placeRaw = localStorage.getItem("currentPlaceObj");
        if (placeRaw) {
          try {
            const placeObj = JSON.parse(placeRaw);
            renderAuthorsList(placeObj); // render lại danh sách tác giả cho địa điểm đó
          } catch (e) {
            // fallback: chỉ đóng sidebar
            closeSidebar();
          }
        } else {
          // nếu không có place hiện hành thì đóng sidebar
          closeSidebar();
        }
      };
    }

    openSidebar();
  }

  /* ====== Render danh sách tác giả (compact list) ======
     - Tạo các .author-card (avatar tròn, tên, subtitle)
     - Không auto mở detail; default detail là tóm tắt số lượng
     - Dùng event delegation (1 listener) để xử lý click trên list
  */
  function renderAuthorsList(placeObj) {
    const authorsListEl = document.getElementById("sidebar-authors-list");
    const detailEl = document.getElementById("sidebar-content");
    const titleEl = document.getElementById("sidebar-title");
    if (!authorsListEl || !detailEl || !titleEl || !placeObj) return;

    titleEl.textContent = placeObj.name || "Thông tin địa điểm";
    authorsListEl.innerHTML = "";
    detailEl.innerHTML = "";

    const list = getAuthorsByPlace(placeObj.id || placeObj.place_id) || [];

    if (!list.length) {
      detailEl.innerHTML = `<div style="padding:12px">Không có thông tin chi tiết.</div>`;
      openSidebar();
      return;
    }

    // Build compact list
    list.forEach((a) => {
      const subtitleText =
        placeObj && placeObj.name ? placeObj.name : a.place_id || "";
      const item = document.createElement("div");
      item.className = "author-card";
      item.dataset.authorId = a.id;
      item.innerHTML = `
        <img class="avatar" src="${escapeHtml(
        a.image || "assets/imgs/placeholder.jpg"
      )}" alt="${escapeHtml(a.name)}" />
        <div class="meta">
          <div class="name">${escapeHtml(a.name)}</div>
          <div class="subtitle">${escapeHtml(subtitleText)}</div>
        </div>
      `;
      authorsListEl.appendChild(item);
    });

    // Default detail: summary tóm tắt (không mở detail nào)
    detailEl.innerHTML = `
      <div style="padding:12px">
        <h6 style="margin-top:0">Thông tin chi tiết</h6>
        <p>Hiển thị <strong>${list.length
      }</strong> tác giả tại <strong>${escapeHtml(
        placeObj.name
      )}</strong>.</p>
      </div>
    `;

    // Gắn handler delegated nếu chưa gắn
    attachDelegatedHandlerOnce();

    openSidebar();
  }

  /* ====== Delegation: xử lý click trên authors-list (gắn 1 lần) ====== */
  let _delegatedAttached = false;
  function attachDelegatedHandlerOnce() {
    if (_delegatedAttached) return;
    _delegatedAttached = true;
    const authorsListEl = document.getElementById("sidebar-authors-list");
    if (!authorsListEl) return;
    authorsListEl.addEventListener("click", function (ev) {
      const card = ev.target.closest(".author-card");
      if (!card) return;
      const aid = card.dataset.authorId;
      if (!aid) return;

      // Mark active
      authorsListEl
        .querySelectorAll(".author-card")
        .forEach((r) => r.classList.remove("active"));
      card.classList.add("active");

      // Find author and show detail
      const author = authors.find((x) => x.id === aid);
      if (author) {
        showAuthorDetail(author, document.getElementById("sidebar-content"));
      }
    });
  }

  /* ====== Utility: highlight và cuộn tới 1 author trong list ====== */
  function highlightAuthorInList(authorId) {
    const authorsListEl = document.getElementById("sidebar-authors-list");
    if (!authorsListEl) return false;
    const target = authorsListEl.querySelector(
      `.author-card[data-author-id="${authorId}"]`
    );
    if (!target) return false;
    // remove old active
    authorsListEl
      .querySelectorAll(".author-card")
      .forEach((r) => r.classList.remove("active"));
    target.classList.add("active");
    // scroll to view
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    // show detail
    const author = authors.find((a) => a.id === authorId);
    if (author)
      showAuthorDetail(author, document.getElementById("sidebar-content"));
    return true;
  }

  /* ====== Open / Close sidebar ====== */
  function openSidebar() {
    const sb = document.getElementById("sidebar");
    if (sb) sb.style.display = "flex";
  }
  function closeSidebar() {
    const sb = document.getElementById("sidebar");
    if (sb) sb.style.display = "none";
  }

  // Close button (nếu có)
  document
    .getElementById("sidebar-close")
    ?.addEventListener("click", closeSidebar);

  // Expose public API
  return {
    getAuthorsByPlace,
    renderAuthorsList,
    showAuthorDetail,
    highlightAuthorInList,
    openSidebar,
    closeSidebar,
  };
})();
