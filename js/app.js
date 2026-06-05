// ============================================================
// js/app.js — RINJANI4D Logika Halaman Utama User
// ============================================================

// ── Inisialisasi Supabase Client ──────────────────────────────
const { createClient } = supabase;
const db = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

// ── State Global ──────────────────────────────────────────────
let allMatches = [];
let activeLeague = "SEMUA";

// ── DOM Ready ─────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initBannerSlider();
  initTabs();
  loadMatches();
  init3DCarousel();
  startMarquee();
});

// ══════════════════════════════════════════════════════════════
// BANNER SLIDER
// ══════════════════════════════════════════════════════════════
function initBannerSlider() {
  const slides = document.querySelectorAll(".slide");
  const dots = document.querySelectorAll(".dot");
  let current = 0;
  let timer;

  function goTo(idx) {
    slides[current].classList.remove("active");
    dots[current].classList.remove("active");
    current = (idx + slides.length) % slides.length;
    slides[current].classList.add("active");
    dots[current].classList.add("active");
  }

  function autoPlay() {
    timer = setInterval(() => goTo(current + 1), 4000);
  }

  document.querySelector(".slider-prev")?.addEventListener("click", () => {
    clearInterval(timer);
    goTo(current - 1);
    autoPlay();
  });

  document.querySelector(".slider-next")?.addEventListener("click", () => {
    clearInterval(timer);
    goTo(current + 1);
    autoPlay();
  });

  dots.forEach((dot, i) =>
    dot.addEventListener("click", () => {
      clearInterval(timer);
      goTo(i);
      autoPlay();
    })
  );

  autoPlay();
}

// ══════════════════════════════════════════════════════════════
// SISTEM TAB SPA
// ══════════════════════════════════════════════════════════════
function initTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;
      tabBtns.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`tab-${target}`)?.classList.add("active");

      if (target === "carousel") triggerCarouselAnim();
    });
  });
}

// ══════════════════════════════════════════════════════════════
// LOAD MATCHES DARI SUPABASE
// ══════════════════════════════════════════════════════════════
async function loadMatches() {
  showScheduleSkeleton();

  try {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const { data, error } = await db
      .from(CONFIG.TABLE_NAME)
      .select("*")
      .gte("match_time", todayStart.toISOString())
      .order("match_time", { ascending: true });

    if (error) throw error;

    // Filter: hapus pertandingan yang sudah lewat > 2 jam
    const twoHoursMs = 2 * 60 * 60 * 1000;
    allMatches = (data || []).filter((m) => {
      const matchTime = new Date(m.match_time);
      return now - matchTime < twoHoursMs;
    });

    renderLeagueFilters();
    renderSchedule();
    renderPredictions();
  } catch (err) {
    console.error("Gagal memuat data:", err);
    document.getElementById("schedule-container").innerHTML =
      `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Gagal memuat data. Periksa koneksi Anda.</p></div>`;
  }
}

// ══════════════════════════════════════════════════════════════
// RENDER FILTER LIGA (OTOMATIS dari data aktif)
// ══════════════════════════════════════════════════════════════
function renderLeagueFilters() {
  const leagueBar = document.getElementById("league-filter-bar");
  if (!leagueBar) return;

  const leagues = ["SEMUA", ...new Set(allMatches.map((m) => m.league))];

  leagueBar.innerHTML = leagues
    .map(
      (l) =>
        `<button class="league-btn ${l === activeLeague ? "active" : ""}" data-league="${l}">
          ${getLeagueIcon(l)} ${l}
        </button>`
    )
    .join("");

  leagueBar.querySelectorAll(".league-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeLeague = btn.dataset.league;
      leagueBar
        .querySelectorAll(".league-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderSchedule();
    });
  });
}

function getLeagueIcon(league) {
  const icons = {
    "PREMIER LEAGUE": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    "LA LIGA": "🇪🇸",
    "SERIE A": "🇮🇹",
    BUNDESLIGA: "🇩🇪",
    "LIGUE 1": "🇫🇷",
    UCL: "⭐",
    "LIGA INDONESIA": "🇮🇩",
    "PIALA DUNIA": "🌍",
  };
  return icons[league?.toUpperCase()] || "⚽";
}

// ══════════════════════════════════════════════════════════════
// RENDER TABEL JADWAL
// ══════════════════════════════════════════════════════════════
function renderSchedule() {
  const container = document.getElementById("schedule-container");
  if (!container) return;

  const filtered =
    activeLeague === "SEMUA"
      ? allMatches
      : allMatches.filter(
          (m) => m.league?.toUpperCase() === activeLeague.toUpperCase()
        );

  if (!filtered.length) {
    container.innerHTML = `<div class="empty-state"><i class="fas fa-calendar-times"></i><p>Tidak ada jadwal untuk liga ini hari ini.</p></div>`;
    return;
  }

  // Grup berdasarkan liga
  const grouped = filtered.reduce((acc, m) => {
    const key = m.league || "LAINNYA";
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  container.innerHTML = Object.entries(grouped)
    .map(
      ([league, matches]) => `
    <div class="league-group">
      <div class="league-header">
        <span class="league-icon">${getLeagueIcon(league)}</span>
        <span class="league-name">${league}</span>
      </div>
      <div class="match-table-wrap">
        <table class="match-table">
          <thead>
            <tr>
              <th>JAM</th>
              <th colspan="3">PERTANDINGAN</th>
              <th>PREDIKSI</th>
            </tr>
          </thead>
          <tbody>
            ${matches.map((m) => renderMatchRow(m)).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `
    )
    .join("");
}

function renderMatchRow(m) {
  const time = new Date(m.match_time).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });

  const logo1 = m.logo1_url
    ? `<img src="${m.logo1_url}" class="club-logo" alt="${m.team1}" loading="lazy">`
    : `<div class="club-logo-placeholder">${m.team1?.charAt(0) || "?"}</div>`;

  const logo2 = m.logo2_url
    ? `<img src="${m.logo2_url}" class="club-logo" alt="${m.team2}" loading="lazy">`
    : `<div class="club-logo-placeholder">${m.team2?.charAt(0) || "?"}</div>`;

  const prediction = m.prediction
    ? `<span class="pred-badge">${m.prediction}</span>`
    : "-";

  return `
    <tr class="match-row">
      <td class="match-time">${time}</td>
      <td class="team-cell team-left">
        ${logo1}
        <span class="team-name">${m.team1 || "-"}</span>
      </td>
      <td class="vs-cell"><span class="vs-text">VS</span></td>
      <td class="team-cell team-right">
        <span class="team-name">${m.team2 || "-"}</span>
        ${logo2}
      </td>
      <td class="pred-cell">${prediction}</td>
    </tr>`;
}

function showScheduleSkeleton() {
  const container = document.getElementById("schedule-container");
  if (!container) return;
  container.innerHTML = Array(4)
    .fill(
      `<div class="skeleton-row">
        <div class="skel skel-sm"></div>
        <div class="skel skel-md"></div>
        <div class="skel skel-xs"></div>
        <div class="skel skel-md"></div>
        <div class="skel skel-sm"></div>
      </div>`
    )
    .join("");
}

// ══════════════════════════════════════════════════════════════
// RENDER KARTU PREDIKSI PARLAY
// ══════════════════════════════════════════════════════════════
function renderPredictions() {
  const container = document.getElementById("prediction-container");
  if (!container) return;

  const withPrediction = allMatches.filter((m) => m.prediction);

  if (!withPrediction.length) {
    container.innerHTML = `<div class="empty-state"><i class="fas fa-star"></i><p>Prediksi parlay belum tersedia hari ini.</p></div>`;
    return;
  }

  container.innerHTML = withPrediction
    .map((m) => renderPredictionCard(m))
    .join("");
}

function renderPredictionCard(m) {
  const time = new Date(m.match_time).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });

  const copyText = `⚽ PREDIKSI RINJANI4D\n${m.league}\n${m.team1} vs ${m.team2}\nJam: ${time} WIB\nPrediksi: ${m.prediction}\n\nDaftar: ${CONFIG.SITE_URL}`;

  return `
    <div class="pred-card">
      <div class="pred-card-header">
        <span class="pred-league">${getLeagueIcon(m.league)} ${m.league}</span>
        <span class="pred-time">🕐 ${time} WIB</span>
      </div>
      <div class="pred-card-body">
        <div class="pred-team">
          ${m.logo1_url
            ? `<img src="${m.logo1_url}" class="pred-logo" alt="${m.team1}">`
            : `<div class="pred-logo-ph">${m.team1?.charAt(0)}</div>`}
          <span>${m.team1}</span>
        </div>
        <div class="pred-score-box">
          <div class="pred-label">PREDIKSI</div>
          <div class="pred-score">${m.prediction}</div>
        </div>
        <div class="pred-team">
          ${m.logo2_url
            ? `<img src="${m.logo2_url}" class="pred-logo" alt="${m.team2}">`
            : `<div class="pred-logo-ph">${m.team2?.charAt(0)}</div>`}
          <span>${m.team2}</span>
        </div>
      </div>
      <div class="pred-card-footer">
        <button class="copy-btn" onclick="copyPrediction(this, \`${copyText.replace(/`/g, "\\`")}\`)">
          <i class="fas fa-copy"></i> Salin Prediksi
        </button>
        <a class="card-btn" href="${CONFIG.SITE_URL}" target="_blank" rel="noopener">
          <i class="fas fa-trophy"></i> Pasang Sekarang
        </a>
      </div>
    </div>`;
}

function copyPrediction(btn, text) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.innerHTML;
    btn.innerHTML = `<i class="fas fa-check"></i> Tersalin!`;
    btn.classList.add("copied");
    setTimeout(() => {
      btn.innerHTML = orig;
      btn.classList.remove("copied");
    }, 2000);
  });
}

// ══════════════════════════════════════════════════════════════
// 3D CAROUSEL BOLA
// ══════════════════════════════════════════════════════════════
const carouselTeams = [
  { name: "Man City",   color: "#6CABDD" },
  { name: "Real Madrid",color: "#FEBE10" },
  { name: "Barcelona",  color: "#A50044" },
  { name: "Bayern",     color: "#DC052D" },
  { name: "Liverpool",  color: "#C8102E" },
  { name: "PSG",        color: "#004170" },
  { name: "Juventus",   color: "#ffffff" },
  { name: "Chelsea",    color: "#034694" },
];

let carouselAngle = 0;
let carouselAnim;

function init3DCarousel() {
  const track = document.getElementById("carousel-track");
  if (!track) return;

  const count = carouselTeams.length;
  const angleStep = 360 / count;
  const radius = 220;

  track.innerHTML = carouselTeams
    .map(
      (team, i) => `
    <div class="carousel-item" style="
      --angle: ${i * angleStep}deg;
      --radius: ${radius}px;
      background: radial-gradient(circle at 35% 35%, ${team.color}cc, ${team.color}44);
      border: 2px solid ${team.color}88;
    ">
      <div class="ball-glow" style="background: ${team.color}33;"></div>
      <span class="ball-pattern">⚽</span>
      <div class="ball-label">${team.name}</div>
    </div>`
    )
    .join("");
}

function triggerCarouselAnim() {
  cancelAnimationFrame(carouselAnim);
  const track = document.getElementById("carousel-track");
  if (!track) return;

  function rotate() {
    carouselAngle += 0.4;
    track.style.transform = `rotateY(${carouselAngle}deg)`;
    carouselAnim = requestAnimationFrame(rotate);
  }
  rotate();
}

// ══════════════════════════════════════════════════════════════
// RUNNING TEXT / MARQUEE
// ══════════════════════════════════════════════════════════════
function startMarquee() {
  const el = document.getElementById("marquee-text");
  if (!el) return;

  const messages = [
    "🏆 RINJANI4D — Prediksi Bola Terpercaya #1 Indonesia",
    "⚽ Jadwal & Prediksi Parlay diupdate setiap hari",
    "🎯 Daftar sekarang dan raih kemenangan bersama kami",
    "🔥 Bonus new member menanti Anda!",
    "📊 Akurasi prediksi tertinggi se-Indonesia",
  ];

  el.textContent = messages.join("   ✦   ");
}
