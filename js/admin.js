// ============================================================
// js/admin.js — RINJANI4D Logika Dashboard Admin
// ============================================================

// ── Auth Guard ────────────────────────────────────────────────
(function authGuard() {
  const pass = window.prompt("🔐 Masukkan Password Admin RINJANI4D:");
  if (!pass || pass.trim() !== CONFIG.ADMIN_PASSWORD) {
    alert("❌ Password salah! Anda akan dialihkan ke halaman utama.");
    window.location.replace("index.html");
  }
})();

// ── Inisialisasi Supabase ──────────────────────────────────────
const { createClient } = supabase;
const db = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

// ── State ─────────────────────────────────────────────────────
let logo1File = null;
let logo2File = null;

// ── DOM Ready ─────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initImagePreviews();
  initPublishBtn();
  loadRecentMatches();
  setDefaultDateTime();
});

// ══════════════════════════════════════════════════════════════
// DEFAULT DATE-TIME (sekarang + 1 jam)
// ══════════════════════════════════════════════════════════════
function setDefaultDateTime() {
  const input = document.getElementById("match_time");
  if (!input) return;
  const d = new Date(Date.now() + 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  input.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ══════════════════════════════════════════════════════════════
// PREVIEW GAMBAR LOGO
// ══════════════════════════════════════════════════════════════
function initImagePreviews() {
  setupPreview("logo1_file", "logo1_preview", "ph1", (file) => (logo1File = file));
  setupPreview("logo2_file", "logo2_preview", "ph2", (file) => (logo2File = file));
}

function setupPreview(inputId, previewId, phId, onFile) {
  const input   = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  const ph      = document.getElementById(phId);
  if (!input || !preview) return;

  input.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("File harus berupa gambar!", "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast("Ukuran file maksimal 2MB!", "error");
      return;
    }
    onFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      preview.src = ev.target.result;
      preview.style.display = "block";
      if (ph) ph.style.display = "none";
    };
    reader.readAsDataURL(file);
  });
}

// ══════════════════════════════════════════════════════════════
// UPLOAD LOGO KE SUPABASE STORAGE
// ══════════════════════════════════════════════════════════════
async function uploadLogo(file, teamName) {
  if (!file) return null;
  const ext      = file.name.split(".").pop();
  const filename = `${Date.now()}_${teamName.replace(/\s+/g, "_").toLowerCase()}.${ext}`;

  const { error } = await db.storage
    .from(CONFIG.STORAGE_BUCKET)
    .upload(filename, file, { cacheControl: "3600", upsert: false });

  if (error) throw new Error(`Gagal upload logo: ${error.message}`);

  const { data: urlData } = db.storage
    .from(CONFIG.STORAGE_BUCKET)
    .getPublicUrl(filename);

  return urlData.publicUrl;
}

// ══════════════════════════════════════════════════════════════
// PUBLISH MATCH
// ══════════════════════════════════════════════════════════════
function initPublishBtn() {
  const btn = document.getElementById("publish-btn");
  if (!btn) return;
  btn.addEventListener("click", publishMatch);
}

async function publishMatch() {
  const btn    = document.getElementById("publish-btn");
  const fields = {
    league     : document.getElementById("league")?.value,
    team1      : document.getElementById("team1")?.value?.trim(),
    team2      : document.getElementById("team2")?.value?.trim(),
    match_time : document.getElementById("match_time")?.value,
    prediction : document.getElementById("prediction")?.value?.trim(),
  };

  if (!fields.league || !fields.team1 || !fields.team2 || !fields.match_time) {
    showToast("⚠️ Lengkapi semua field yang wajib diisi!", "error");
    return;
  }

  btn.disabled   = true;
  btn.innerHTML  = `<span class="spinner"></span> Memproses...`;

  try {
    showToast("📤 Mengupload logo...", "info");

    const [logo1_url, logo2_url] = await Promise.all([
      uploadLogo(logo1File, fields.team1),
      uploadLogo(logo2File, fields.team2),
    ]);

    showToast("💾 Menyimpan data ke database...", "info");

    const { error } = await db.from(CONFIG.TABLE_NAME).insert([{
      league     : fields.league,
      team1      : fields.team1,
      team2      : fields.team2,
      match_time : new Date(fields.match_time).toISOString(),
      prediction : fields.prediction || null,
      logo1_url  : logo1_url || null,
      logo2_url  : logo2_url || null,
      created_at : new Date().toISOString(),
    }]);

    if (error) throw error;

    showToast("✅ Jadwal berhasil dipublish!", "success");
    resetForm();
    loadRecentMatches();
  } catch (err) {
    console.error(err);
    showToast(`❌ Error: ${err.message}`, "error");
  } finally {
    btn.disabled  = false;
    btn.innerHTML = `<i class="fas fa-paper-plane"></i> Publish Jadwal`;
  }
}

// ══════════════════════════════════════════════════════════════
// RESET FORM
// ══════════════════════════════════════════════════════════════
function resetForm() {
  ["team1", "team2", "prediction"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  document.getElementById("league").value = "";
  setDefaultDateTime();

  ["logo1_file", "logo2_file"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  ["logo1_preview", "logo2_preview"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) { el.src = ""; el.style.display = "none"; }
  });

  ["ph1", "ph2"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = "grid";
  });

  logo1File = null;
  logo2File = null;
}

// ══════════════════════════════════════════════════════════════
// LOAD RECENT MATCHES
// ══════════════════════════════════════════════════════════════
async function loadRecentMatches() {
  const container = document.getElementById("recent-matches");
  if (!container) return;

  container.innerHTML = `<div class="loading-text"><span class="spinner"></span> Memuat data...</div>`;

  try {
    const { data, error } = await db
      .from(CONFIG.TABLE_NAME)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;

    if (!data.length) {
      container.innerHTML = `<p class="empty-msg">Belum ada jadwal yang diinput.</p>`;
      return;
    }

    container.innerHTML = data.map((m) => renderAdminRow(m)).join("");

    container.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", () => deleteMatch(btn.dataset.id));
    });
  } catch (err) {
    container.innerHTML = `<p class="error-msg">Gagal memuat: ${err.message}</p>`;
  }
}

function renderAdminRow(m) {
  const time = new Date(m.match_time).toLocaleString("id-ID", {
    dateStyle : "short",
    timeStyle : "short",
    timeZone  : "Asia/Jakarta",
  });

  return `
    <div class="admin-match-row">
      <div class="amr-logos">
        ${m.logo1_url
          ? `<img src="${m.logo1_url}" class="amr-logo" alt="">`
          : `<div class="amr-logo-ph">${m.team1?.charAt(0)}</div>`}
        <span class="amr-vs">VS</span>
        ${m.logo2_url
          ? `<img src="${m.logo2_url}" class="amr-logo" alt="">`
          : `<div class="amr-logo-ph">${m.team2?.charAt(0)}</div>`}
      </div>
      <div class="amr-info">
        <div class="amr-teams">${m.team1} vs ${m.team2}</div>
        <div class="amr-meta">
          <span class="amr-league">${m.league}</span> · <span>${time} WIB</span>
        </div>
        ${m.prediction ? `<div class="amr-pred">Prediksi: <strong>${m.prediction}</strong></div>` : ""}
      </div>
      <button class="delete-btn" data-id="${m.id}" title="Hapus">
        <i class="fas fa-trash-alt"></i>
      </button>
    </div>`;
}

// ══════════════════════════════════════════════════════════════
// DELETE MATCH
// ══════════════════════════════════════════════════════════════
async function deleteMatch(id) {
  if (!confirm("Yakin ingin menghapus jadwal ini?")) return;

  const { error } = await db.from(CONFIG.TABLE_NAME).delete().eq("id", id);

  if (error) {
    showToast(`❌ Gagal hapus: ${error.message}`, "error");
  } else {
    showToast("🗑️ Jadwal berhasil dihapus!", "success");
    loadRecentMatches();
  }
}

// ══════════════════════════════════════════════════════════════
// TOAST NOTIFICATION
// ══════════════════════════════════════════════════════════════
function showToast(msg, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className  = `toast toast-${type}`;
  toast.textContent = msg;
  container.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 50);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
