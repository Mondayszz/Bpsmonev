// DAFTAR PEGAWAI BPS KOTA KOTAMOBAGU JANUARI 2026
const DAFTAR_PEGAWAI = [
  "Jasni Makalunsenge, S.E., M.Si",
  "Yasir Akuba, SE",
  "Sany Herlina Lendo, SP",
  "Sizi Lia Ginoga, SST, MEKK",
  "Ugiana Ramdhani, SST, M.S.E.",
  "Halida Zulfa Muthia, SST",
  "Adalard Yusuf Kamarastha, S.Tr.Stat",
  "Yohanes Adham Anugerah Widhi, A.Md,Kb.N",
  "Ulung Rimbah",
  "Dita Saskia DJ Saida, A.Md.Stat",
  "Nadyah Rizka Cahyani, A.Md.Stat",
  "Eliza Tiara Devi, S.Tr.Stat",
  "Ratna Pratiwi Kusumastuti S.Tr.Stat",
  "Linda Diana Lumingkewas, SE",
  "Joko Priono, SE",
  "junaidi",
  "Maltina Dali",
  "Dody Iskandar, ST",
  "Jukaini"
];

// Konfigurasi Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB0v-v_bGaQyWg9UOzYQcDD-5lmMRf3qZ4",
  authDomain: "monevdb-61c97.firebaseapp.com",
  projectId: "monevdb-61c97",
  storageBucket: "monevdb-61c97.firebasestorage.app",
  messagingSenderId: "452769158322",
  appId: "1:452769158322:web:4100ad871865ab6d04a5ab",
  measurementId: "G-RFKS678ERE"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let listBerkas = [];
let listPengajuanLembur = [];
let listLaporanLembur = [];
let listBelanjaUP = [];
let currentUserData = null;

const TAHUN_ANGGARAN = 2026;
const usersCache = {};
let spbyRows = [];
let subsStarted = false;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rupiah = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
const safeImg = u => (typeof u === 'string' && u.startsWith('data:image/')) ? u : '';
function isDriveUrl(link) {
  try { const u = new URL(link); return u.protocol === 'https:' && /(^|\.)(drive|docs)\.google\.com$/.test(u.hostname); } catch { return false; }
}

// ---------- UI: toast & modal ----------
function toast(msg, type) {
  msg = String(msg ?? '');
  type = type || (/gagal|ditolak|error/i.test(msg) ? 'error' : /pilih|lengkapi|isi |tidak boleh|belum|harus|dinonaktifkan|maksimal/i.test(msg) ? 'warn' : 'success');
  let root = document.getElementById('toast-root');
  if (!root) { root = document.createElement('div'); root.id = 'toast-root'; document.body.appendChild(root); }
  const icon = { success: '✓', warn: '!', error: '✕' }[type];
  const t = document.createElement('div');
  t.className = 'toast toast-' + type;
  t.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-msg">${esc(msg)}</span>`;
  t.onclick = () => t.remove();
  root.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 4200);
}
window.alert = m => toast(m);

function closeModal() { document.getElementById('modal-root')?.remove(); }
function openModal(html, wide) {
  closeModal();
  const o = document.createElement('div');
  o.id = 'modal-root';
  o.className = 'modal-overlay';
  o.innerHTML = `<div class="modal-box ${wide ? 'modal-wide' : ''}">${html}</div>`;
  o.addEventListener('click', e => { if (e.target === o || e.target.closest('[data-modal-close]')) closeModal(); });
  document.body.appendChild(o);
  requestAnimationFrame(() => o.classList.add('show'));
  return o;
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

function confirmModal(title, msg, okLabel = 'Ya, lanjutkan') {
  return new Promise(resolve => {
    const o = openModal(`<h3 class="modal-title">${esc(title)}</h3><p class="modal-text">${esc(msg)}</p>
      <div class="flex gap-2 justify-end mt-5"><button data-modal-close class="btn-ghost">Batal</button><button data-ok class="btn-danger">${esc(okLabel)}</button></div>`);
    o.querySelector('[data-ok]').onclick = () => { closeModal(); resolve(true); };
    o.addEventListener('click', e => { if (e.target === o || e.target.closest('[data-modal-close]')) resolve(false); });
  });
}

window.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();
  populatePegawaiDropdowns();
  initCharts();
});

function startSubscriptions(roles) {
  if (subsStarted) return;
  subsStarted = true;
  subscribeRealtimeData();
  subscribeRekamSPBY();
  subscribeLembur();
  subscribeBelanjaUP();
  ['SK', 'KAK', 'SPM'].forEach(loadArsipList);
  if (roles.includes('Operator') || roles.includes('Super Admin')) subscribeUsersRealtime();
}

function switchSKTab(id) {
  document.querySelectorAll('.tab-sk-content').forEach(e => e.classList.add('hidden'));
  document.getElementById(id)?.classList.remove('hidden');
  ['sk', 'kak', 'spm'].forEach(k => {
    const b = document.getElementById('btn-tab-' + k);
    if (b) b.className = 'px-4 py-2 rounded-lg transition ' + (('tab-' + k) === id ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-800');
  });
}

// ==========================================================================
// HALAMAN DOKUMENTASI: GALERI FOTO LEMBUR & BELANJA UP (klik untuk perbesar)
// ==========================================================================
function switchDokTab(id) {
  document.querySelectorAll('.dok-tab-content').forEach(e => e.classList.add('hidden'));
  document.getElementById(id)?.classList.remove('hidden');
  ['dok-lembur', 'dok-belanja'].forEach(k => {
    const b = document.getElementById('btn-' + k);
    if (b) b.className = 'px-4 py-2 rounded-lg transition ' + (k === id ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-800');
  });
}

function openImageModal(src, title, subtitle) {
  openModal(`
    <div class="flex items-center justify-between gap-3 mb-3">
      <div class="min-w-0">
        <h3 class="modal-title truncate">${esc(title || 'Dokumentasi')}</h3>
        ${subtitle ? `<p class="modal-text mt-0">${esc(subtitle)}</p>` : ''}
      </div>
      <button data-modal-close class="btn-ghost shrink-0">Tutup</button>
    </div>
    <img src="${src}" alt="${esc(title || 'Dokumentasi')}" class="w-full max-h-[75vh] object-contain rounded-xl border border-slate-200 bg-slate-50">
  `, true);
}

function renderDokGrid(containerId, items, getSrc, getTitle, getSubtitle) {
  const box = document.getElementById(containerId);
  if (!box) return;
  const withFoto = items.filter(d => safeImg(getSrc(d)));
  if (!withFoto.length) {
    box.innerHTML = '<p class="col-span-full text-center text-slate-400 py-6">Belum ada foto dokumentasi.</p>';
    return;
  }
  box.innerHTML = withFoto.map((d, i) => `
    <button type="button" onclick="openDokImage('${containerId}', ${i})" class="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      <img src="${safeImg(getSrc(d))}" alt="${esc(getTitle(d))}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
      <span class="absolute inset-x-0 bottom-0 bg-slate-900/70 text-white text-[10px] px-2 py-1 truncate text-left">${esc(getTitle(d))}</span>
    </button>
  `).join('');
  window[containerId + '_data'] = { withFoto, getSrc, getTitle, getSubtitle };
}

function openDokImage(containerId, i) {
  const store = window[containerId + '_data'];
  if (!store) return;
  const d = store.withFoto[i];
  openImageModal(store.getSrc(d), store.getTitle(d), store.getSubtitle ? store.getSubtitle(d) : '');
}

function renderDokumentasiLembur() {
  renderDokGrid('dok-grid-lembur', listLaporanLembur, d => d.foto, d => `${d.nama || '-'} · ${d.tgl || '-'}`, d => d.output || '');
}

function renderDokumentasiBelanja() {
  renderDokGrid('dok-grid-belanja', listBelanjaUP, d => d.bukti, d => `${d.toko || '-'} · ${d.tgl || '-'}`, d => `${d.jenis || '-'} · ${rupiah(d.nominal)}`);
}

function exportAllToExcel() {
  if (typeof XLSX === 'undefined') { alert('Library Excel belum termuat, coba refresh halaman.'); return; }
  const wb = XLSX.utils.book_new();
  const add = (name, arr) => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(arr.length ? arr : [{ info: 'Belum ada data' }]), name);
  add('Berkas', listBerkas.map(({ id, createdAt, ...r }) => r));
  add('SPBY', spbyRows.map(({ createdAt, ...r }) => r));
  add('Lembur', listLaporanLembur.map(({ id, foto, createdAt, ...r }) => r));
  add('Belanja UP', listBelanjaUP.map(({ id, bukti, createdAt, ...r }) => r));
  XLSX.writeFile(wb, 'MONEV_BPS_Export.xlsx');
}

// ==========================================================================
// POPULATE DROPDOWNS & CHECKLIST PEGAWAI
function populatePegawaiDropdowns() {
  const singleSelectIds = ['sm-pembuat', 'ppk-penerima', 'bendahara-pembuat', 'lembur-ketua', 'lap-nama', 'akun-nama'];
  
  singleSelectIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = '<option value="">-- Pilih Pegawai --</option>';
      DAFTAR_PEGAWAI.forEach(nama => {
        el.innerHTML += `<option value="${nama}">${nama}</option>`;
      });
    }
  });

  const containerPeserta = document.getElementById('container-lembur-peserta');
  if (containerPeserta) {
    containerPeserta.innerHTML = '';
    DAFTAR_PEGAWAI.forEach((nama) => {
      containerPeserta.innerHTML += `
        <label class="flex items-center gap-2 cursor-pointer text-xs hover:bg-slate-100 p-1.5 rounded transition">
          <input type="checkbox" name="chk-peserta-lembur" value="${nama}" class="rounded text-blue-800 focus:ring-blue-600 w-4 h-4">
          <span class="text-slate-700 font-medium">${nama}</span>
        </label>
      `;
    });
  }
}

function navigateTo(pageId) {
  document.querySelectorAll('.page-view').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('[data-page]').forEach(b => b.classList.toggle('nav-active', b.getAttribute('data-page') === pageId));
  const target = document.getElementById(pageId);
  if (target) {
    const ht = document.getElementById('header-title');
    if (ht && PAGE_TITLES[pageId]) ht.textContent = PAGE_TITLES[pageId];
    target.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function toggleSubmenu(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const btn = el.previousElementSibling; // tombol trigger ada tepat sebelum panel submenu
  const isOpen = el.classList.contains('open');
  el.classList.toggle('open', !isOpen);
  if (btn && btn.tagName === 'BUTTON') btn.setAttribute('aria-expanded', String(!isOpen));
}

function convertFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

function subscribeRealtimeData() {
  db.collection("berkas_keuangan").orderBy("createdAt", "desc").onSnapshot(snapshot => {
    listBerkas = [];
    const tbody = document.getElementById('tbody-monitoring-berkas');
    if (tbody) tbody.innerHTML = '';

    if (snapshot.empty && tbody) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-slate-400">Belum ada data.</td></tr>`;
    } else {
      snapshot.forEach(doc => {
        const b = doc.data();
        b.id = doc.id;
        listBerkas.push(b);

        if (tbody) {
          tbody.innerHTML += `
            <tr class="hover:bg-slate-50 border-b border-slate-100">
              <td class="px-4 py-3 font-semibold text-slate-800">${esc(b.smPembuat || '-')} <br><span class="text-xs text-slate-400 font-mono">${esc(b.smNoMemo || '-')}</span></td>
              <td class="px-4 py-3">${esc(b.smUraian || '-')}</td>
              <td class="px-4 py-3">${statusBadge(b.statusPosisi || 'SM')}</td>
              <td class="px-4 py-3 text-xs">Penyerahan: ${esc(b.smTglPenyerahan || '-')}</td>
              <td class="px-4 py-3 text-xs italic">${esc(b.ppkCatatan || '-')}</td>
            </tr>
          `;
        }
      });
    }

    populateBerkasDropdown('ppk-select-berkas', listBerkas.filter(b => b.statusPosisi === 'SM'));
    populateBerkasDropdown('ppspm-select-berkas', listBerkas.filter(b => b.statusPosisi === 'PPK'));
    populateBerkasDropdown('operator-select-berkas', listBerkas.filter(b => b.statusPosisi === 'PPSPM'));
    populateBerkasDropdown('bendahara-select-berkas', listBerkas.filter(b => b.statusPosisi === 'Operator'));
    renderOperatorInbox();
  }, err => console.error('Gagal memuat berkas_keuangan:', err));
}

// Box "menunggu approval" di halaman Operator: nampilin berkas yang statusnya 'PPSPM'
// (sudah diuji PPSPM, menunggu diterima & disetujui Operator untuk diteruskan ke Bendahara)
function renderOperatorInbox() {
  const box = document.getElementById('operator-inbox-list');
  const countEl = document.getElementById('operator-inbox-count');
  if (!box) return;
  const masuk = listBerkas.filter(b => b.statusPosisi === 'PPSPM');
  if (countEl) countEl.textContent = masuk.length;
  if (!masuk.length) {
    box.innerHTML = '<p class="text-center text-slate-400 py-6 text-xs">Belum ada berkas dari PPSPM yang menunggu approval.</p>';
    return;
  }
  box.innerHTML = masuk.map(b => `
    <div class="flex items-center justify-between gap-3 p-3 rounded-xl border border-orange-100 bg-orange-50/60">
      <div class="min-w-0">
        <p class="font-semibold text-sm text-slate-800 truncate font-mono">${esc(b.smNoMemo || '(tanpa nomor)')}</p>
        <p class="text-xs text-slate-500 truncate">${esc(b.smUraian || '-')}</p>
        <p class="text-[10px] text-slate-400 mt-0.5">Diuji PPSPM: ${esc(b.ppspmTglTerima || '-')}</p>
      </div>
      ${statusBadge('Menunggu Operator')}
    </div>
  `).join('');
}

function populateBerkasDropdown(selectId, items) {
  const el = document.getElementById(selectId);
  if (!el) return;
  const currentVal = el.value;
  el.innerHTML = '<option value="">-- Pilih Berkas --</option>';
  items.forEach(b => {
    const label = `${b.smNoMemo || '(tanpa nomor)'} - ${(b.smUraian || '').slice(0, 40)}`;
    el.innerHTML += `<option value="${b.id}">${esc(label)}</option>`;
  });
  if (items.some(b => b.id === currentVal)) el.value = currentVal;
}

// ==========================================================================
// AUTHENTICATION & ROUTING
// ==========================================================================

firebase.auth().onAuthStateChanged(async (user) => {
  const isDashboardPage = !!document.getElementById('page-beranda');
  const userProfileSec = document.getElementById('user-profile-section');

  if (!user) {
    if (isDashboardPage) window.location.href = "index.html";
    return;
  }
  if (!isDashboardPage) { window.location.href = "dashboard.html"; return; }

  let roles = [];
  try {
    const ref = db.collection("users").doc(user.uid);
    let snap = await ref.get();
    if (!snap.exists) {
      // profil pertama kali: dibuat tanpa role (rules hanya mengizinkan role kosong)
      await ref.set({ nama: user.email.split('@')[0], email: user.email, role: [], status: 'aktif' });
      snap = await ref.get();
    }
    currentUserData = snap.data();

    if (currentUserData.status === "nonaktif") {
      alert("Akun Anda telah dinonaktifkan oleh Admin. Hubungi Operator MONEV.");
      await new Promise(r => setTimeout(r, 2500));
      await firebase.auth().signOut();
      window.location.href = "index.html";
      return;
    }
    roles = Array.isArray(currentUserData.role) ? currentUserData.role : [];

    if (userProfileSec) userProfileSec.classList.remove('hidden');
    const nameEl = document.getElementById('user-display-name');
    const roleEl = document.getElementById('user-display-role');
    if (nameEl) nameEl.innerText = currentUserData.nama || user.email;
    if (roleEl) roleEl.innerText = "Role: " + (roles.length ? roles.join(", ") : "Pegawai");
  } catch (err) {
    console.error("Error fetching user profile:", err);
    alert("Gagal memuat profil akun (cek Firestore rules). Menu dibatasi ke akses umum.");
  }

  applyRolePermissions(roles); // gagal = tanpa role (fail-closed)
  document.getElementById('btn-reset-spby')?.classList.toggle('hidden', !(roles.includes('Operator') || roles.includes('Super Admin')));
  startSubscriptions(roles);
});

async function handleLoginSubmit(e) {
  e.preventDefault();

  const emailInput = document.getElementById('login-email');
  const passInput = document.getElementById('login-password');
  const errDiv = document.getElementById('login-error-msg');
  const errText = document.getElementById('login-error-text');
  const btn = document.getElementById('btn-login-submit');

  if (!emailInput || !passInput) return;

  const email = emailInput.value.trim();
  const pass = passInput.value;

  if (errDiv) errDiv.classList.add('hidden');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>Memproses Login...</span>';
  }

  try {
    await firebase.auth().signInWithEmailAndPassword(email, pass);
    window.location.href = "dashboard.html";
  } catch (err) {
    console.error('Login error:', err.code, err.message);
    const map = {
      'auth/user-not-found': 'Email atau Kata Sandi yang Anda masukkan salah!',
      'auth/wrong-password': 'Email atau Kata Sandi yang Anda masukkan salah!',
      'auth/invalid-credential': 'Email atau Kata Sandi yang Anda masukkan salah!',
      'auth/operation-not-allowed': 'Metode Email/Password belum diaktifkan di Firebase Authentication.',
      'auth/unauthorized-domain': 'Domain ini belum ada di Authorized domains Firebase.',
      'auth/network-request-failed': 'Koneksi bermasalah atau diblokir (cek internet / API key restriction).',
      'auth/too-many-requests': 'Terlalu banyak percobaan. Tunggu beberapa menit.',
      'auth/user-disabled': 'Akun ini dinonaktifkan di Firebase.',
      'auth/api-key-not-valid.-please-pass-a-valid-api-key.': 'API key Firebase tidak valid.'
    };
    const errorMsg = (map[err.code] || 'Gagal login.') + ' [' + (err.code || 'unknown') + ']';
    if (errText) errText.innerText = errorMsg;
    if (errDiv) errDiv.classList.remove('hidden');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>Masuk ke Sistem</span> <i data-lucide="arrow-right" class="w-4 h-4"></i>';
      if (window.lucide) lucide.createIcons();
    }
  }
}

async function handleLogout() {
  if (await confirmModal("Keluar dari Sistem", "Apakah Anda yakin ingin keluar dari sistem?", "Ya, Keluar")) {
    await firebase.auth().signOut();
    window.location.href = "index.html";
  }
}

// ==========================================================================
// BADGE STATUS — mapping status teks -> class warna (hijau/oranye/merah/netral)
// Pakai: statusBadge('Disetujui') -> '<span class="status-badge status-done">Disetujui</span>'
// ==========================================================================
function statusBadge(label) {
  const s = String(label ?? '').trim();
  const low = s.toLowerCase();
  let cls = 'status-neutral';
  if (/tolak|reject|gagal|batal/.test(low)) cls = 'status-rejected';
  else if (/setuju|selesai|approved|berhasil|lunas|diterima/.test(low)) cls = 'status-done';
  else if (/tunggu|pending|proses|menunggu|diajukan|kembali/.test(low)) cls = 'status-pending';
  return `<span class="status-badge ${cls}">${esc(s || '-')}</span>`;
}

// ==========================================================================
// SISTEM ROLE & AKSES MENU
// ==========================================================================
const PAGE_ROLES = {
  'page-beranda': null,
  'page-dashboard-all': ['Operator', 'Super Admin'],
  'page-dokumentasi': null,
  'page-sm': ['Subject Matter', 'Operator', 'Super Admin'],
  'page-ppk': ['PPK', 'Operator', 'Super Admin'],
  'page-ppspm': ['PPSPM', 'Operator', 'Super Admin'],
  'page-operator': ['Operator', 'Super Admin'],
  'page-bendahara': ['Bendahara', 'Operator', 'Super Admin'],
  'page-pengajuan-lembur': null,
  'page-laporan-lembur': null,
  'page-rekam-spby': ['Bendahara', 'Operator', 'Super Admin'],
  'page-up': null,
  'page-arsip-sk': null,
  'page-arsip-kak': null,
  'page-arsip-spm': null,
};

const PAGE_TITLES = {
  'page-beranda': 'Selamat Datang di Sistem MONEV BPS',
  'page-dashboard-all': 'Dashboard Monitoring Input',
  'page-dokumentasi': 'Dokumentasi Kegiatan',
  'page-sm': 'Input Memo: Subject Matter',
  'page-ppk': 'Input Memo: PPK',
  'page-ppspm': 'Input Memo: PPSPM',
  'page-operator': 'Kelola Akun Karyawan',
  'page-bendahara': 'Input Memo: Bendahara',
  'page-pengajuan-lembur': 'Pengajuan Lembur',
  'page-laporan-lembur': 'Laporan Lembur',
  'page-rekam-spby': 'Rekam SPBY Bendahara',
  'page-up': 'Bukti Belanja UP',
  'page-arsip-sk': 'Arsip SK',
  'page-arsip-kak': 'Arsip KAK',
  'page-arsip-spm': 'Arsip SPM',
};

function applyRolePermissions(roles) {
  const isFullAccess = roles.includes('Operator') || roles.includes('Super Admin');

  document.querySelectorAll('[data-page]').forEach(btn => {
    const pageId = btn.getAttribute('data-page');
    const required = PAGE_ROLES[pageId];
    const allowed = isFullAccess || !required || required.some(r => roles.includes(r));
    btn.classList.toggle('hidden', !allowed);
  });

  document.querySelectorAll('[data-group]').forEach(group => {
    const buttons = group.querySelectorAll('[data-page]');
    const anyVisible = Array.from(buttons).some(b => !b.classList.contains('hidden'));
    group.classList.toggle('hidden', !anyVisible);
  });

  const activePage = document.querySelector('.page-view:not(.hidden)');
  if (activePage) {
    const btnForActive = document.querySelector(`[data-page="${activePage.id}"]`);
    if (btnForActive && btnForActive.classList.contains('hidden')) {
      navigateTo('page-beranda');
    }
  }
}

// ==========================================================================
// KELOLA AKUN KARYAWAN
// ==========================================================================
function getSecondaryAuth() {
  let secApp = firebase.apps.find(a => a.name === 'Secondary');
  if (!secApp) secApp = firebase.initializeApp(firebaseConfig, 'Secondary');
  return secApp.auth();
}

function getCheckedRoles() {
  return Array.from(document.querySelectorAll('input[name="akun-role"]:checked')).map(el => el.value);
}

function setCheckedRoles(roles) {
  document.querySelectorAll('input[name="akun-role"]').forEach(el => {
    el.checked = roles.includes(el.value);
  });
}

function startCreateAkunKaryawan() {
  const form = document.getElementById('form-akun-karyawan');
  form.reset();
  form.classList.remove('hidden');
  document.getElementById('akun-edit-uid').value = '';
  document.getElementById('akun-email').disabled = false;
  document.getElementById('akun-password-wrap').classList.remove('hidden');
  document.getElementById('akun-password').required = true;
  document.getElementById('btn-submit-akun').innerText = 'Buat Akun';
  form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (window.lucide) lucide.createIcons();
}

// Akun dibuat lewat app Firebase kedua supaya sesi Operator yang sedang login tidak tertimpa.
async function createAkunKaryawan(nama, email, password, roles) {
  const secAuth = getSecondaryAuth();
  const cred = await secAuth.createUserWithEmailAndPassword(email, password);
  const uid = cred.user.uid;
  await secAuth.signOut();
  try {
    await db.collection('users').doc(uid).set({ nama, email, role: roles, status: 'aktif' });
  } catch (err) {
    err.profileFailed = true;
    throw err;
  }
  return uid;
}

async function handleAkunKaryawanSubmit(e) {
  e.preventDefault();

  const editUid = document.getElementById('akun-edit-uid').value;
  const nama = document.getElementById('akun-nama').value;
  const email = document.getElementById('akun-email').value.trim();
  const password = document.getElementById('akun-password').value;
  const roles = getCheckedRoles();
  const btn = document.getElementById('btn-submit-akun');
  const idleLabel = editUid ? 'Simpan Perubahan' : 'Buat Akun';

  if (!nama) { alert('Pilih nama pegawai terlebih dahulu.'); return; }
  if (!editUid && password.length < 6) { alert('Password awal minimal 6 karakter.'); return; }

  if (roles.length === 0 && !confirm('Belum ada role dicentang, pegawai ini hanya bisa akses menu umum (Beranda/Lembur/Belanja UP/Arsip). Lanjutkan?')) {
    return;
  }

  btn.disabled = true;
  btn.innerText = 'Menyimpan...';

  try {
    if (editUid) {
      await db.collection('users').doc(editUid).set({ nama, email, role: roles }, { merge: true });
      alert('Role/data pegawai berhasil diperbarui.');
    } else {
      await createAkunKaryawan(nama, email, password, roles);
      alert(`Akun ${email} berhasil dibuat. Sampaikan password awal ke pegawai.`);
    }
    cancelEditAkunKaryawan();
  } catch (err) {
    console.error(err);
    const map = {
      'auth/email-already-in-use': 'Gagal: email sudah terdaftar. Cari di tabel Daftar Akun Pegawai lalu klik Edit Role. Jika belum tampil, minta pegawai login sekali.',
      'auth/invalid-email': 'Gagal: format email tidak valid.',
      'auth/weak-password': 'Gagal: password terlalu lemah, minimal 6 karakter.',
      'auth/operation-not-allowed': 'Gagal: metode Email/Password belum diaktifkan di Firebase Authentication.',
      'auth/network-request-failed': 'Gagal: koneksi bermasalah, coba lagi.'
    };
    if (err.profileFailed) {
      alert('Gagal menyimpan profil, tetapi akun login sudah dibuat. Minta pegawai login sekali, lalu atur role lewat Edit Role. (' + (err.message || '') + ')');
    } else {
      alert(map[err.code] || ('Gagal menyimpan akun. (' + (err.message || '') + ')'));
    }
  } finally {
    btn.disabled = false;
    btn.innerText = idleLabel;
  }
}

function startEditAkunKaryawan(uid) {
  const u = usersCache[uid] || {};
  const nama = u.nama || '', email = u.email || '', roles = u.role || [];
  const form = document.getElementById('form-akun-karyawan');
  form.classList.remove('hidden');
  document.getElementById('akun-edit-uid').value = uid;
  document.getElementById('akun-nama').value = nama;
  document.getElementById('akun-email').value = email;
  document.getElementById('akun-email').disabled = true;
  document.getElementById('akun-password-wrap').classList.add('hidden');
  document.getElementById('akun-password').required = false;
  setCheckedRoles(roles || []);
  document.getElementById('btn-submit-akun').innerText = 'Simpan Perubahan';
  form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (window.lucide) lucide.createIcons();
}

function cancelEditAkunKaryawan() {
  const form = document.getElementById('form-akun-karyawan');
  form.reset();
  document.getElementById('akun-edit-uid').value = '';
  document.getElementById('akun-email').disabled = false;
  document.getElementById('akun-password-wrap').classList.add('hidden');
  document.getElementById('akun-password').required = false;
  form.classList.add('hidden');
}

async function toggleUserStatus(uid, currentStatus) {
  const next = currentStatus === 'aktif' ? 'nonaktif' : 'aktif';
  const label = next === 'nonaktif' ? 'menonaktifkan' : 'mengaktifkan kembali';
  if (!confirm(`Yakin ingin ${label} akun ini?`)) return;
  try {
    await db.collection('users').doc(uid).set({ status: next }, { merge: true });
  } catch (err) {
    console.error(err);
    alert('Gagal mengubah status akun.');
  }
}

function subscribeUsersRealtime() {
  const tbody = document.getElementById('tbody-akun-karyawan');
  if (!tbody) return;

  db.collection('users').onSnapshot(snapshot => {
    if (snapshot.empty) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-slate-400">Belum ada akun pegawai.</td></tr>`;
      return;
    }

    tbody.innerHTML = '';
    snapshot.forEach(doc => {
      const u = doc.data();
      usersCache[doc.id] = u;
      const roles = u.role || [];
      const status = u.status || 'aktif';
      const rolesJson = JSON.stringify(roles).replace(/"/g, '&quot;');

      tbody.innerHTML += `
        <tr class="hover:bg-slate-50">
          <td class="px-3 py-2 font-semibold text-slate-800">${esc(u.nama || '-')}</td>
          <td class="px-3 py-2 font-mono">${esc(u.email || '-')}</td>
          <td class="px-3 py-2">${roles.length ? roles.map(r => `<span class="inline-block bg-blue-100 text-blue-900 px-1.5 py-0.5 rounded text-[10px] font-medium mr-1 mb-1">${esc(r)}</span>`).join('') : '<span class="text-slate-400">Umum</span>'}</td>
          <td class="px-3 py-2">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${status === 'aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}">${status === 'aktif' ? 'Aktif' : 'Nonaktif'}</span>
          </td>
          <td class="px-3 py-2 whitespace-nowrap">
            <button onclick="startEditAkunKaryawan('${doc.id}')" class="text-blue-600 hover:underline font-medium mr-2">Edit Role</button>
            <button onclick="toggleUserStatus('${doc.id}', '${status}')" class="text-red-600 hover:underline font-medium">${status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'}</button>
          </td>
        </tr>
      `;
    });
  }, err => {
    console.error('Gagal memuat daftar akun:', err);
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-400">Gagal memuat data (cek Firestore rules).</td></tr>`;
  });
}

// ==========================================================================
// INPUT MEMO: SUBJECT MATTER -> PPK -> PPSPM -> BENDAHARA
// ==========================================================================
async function handleSMSubmit(e) {
  e.preventDefault();
  const noMemoEl = document.getElementById('sm-no-memo');
  const pembuat = document.getElementById('sm-pembuat').value;
  const noMemo = noMemoEl.value.trim();
  const uraian = document.getElementById('sm-uraian').value.trim();
  const tglPenyerahan = document.getElementById('sm-tgl-penyerahan').value;
  const errEl = document.getElementById('sm-no-memo-error');
  const btn = e.target.querySelector('button[type="submit"]');

  if (errEl) errEl.classList.add('hidden');
  if (!pembuat) { alert('Pilih nama pembuat terlebih dahulu.'); return; }
  if (!noMemo) { alert('Nomor memo tidak boleh kosong.'); noMemoEl.focus(); return; }

  btn.disabled = true;
  btn.innerText = 'Mengecek nomor memo...';

  try {
    const dup = await db.collection('berkas_keuangan').where('smNoMemo', '==', noMemo).limit(1).get();
    if (!dup.empty) {
      if (errEl) errEl.classList.remove('hidden');
      noMemoEl.classList.add('border-red-400');
      noMemoEl.focus();
      return;
    }
    noMemoEl.classList.remove('border-red-400');

    btn.innerText = 'Menyimpan...';
    await db.collection('berkas_keuangan').add({
      smPembuat: pembuat,
      smNoMemo: noMemo,
      smUraian: uraian,
      smTglPenyerahan: tglPenyerahan,
      statusPosisi: 'SM',
      createdBy: firebase.auth().currentUser ? firebase.auth().currentUser.uid : null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert('Data Subject Matter berhasil disimpan.');
    e.target.reset();
  } catch (err) {
    console.error(err);
    alert('Gagal menyimpan data. Coba lagi. (' + (err.message || '') + ')');
  } finally {
    btn.disabled = false;
    btn.innerText = 'Simpan Subject Matter';
  }
}

async function handlePPKSubmit(e) {
  e.preventDefault();
  const berkasId = document.getElementById('ppk-select-berkas').value;
  const tglTerima = document.getElementById('ppk-tgl-terima').value;
  const penerima = document.getElementById('ppk-penerima').value;
  const status = document.getElementById('ppk-status').value;
  const catatan = document.getElementById('ppk-catatan').value.trim();
  const btn = e.target.querySelector('button[type="submit"]');

  if (!berkasId) { alert('Pilih berkas masuk terlebih dahulu.'); return; }

  btn.disabled = true;
  btn.innerText = 'Menyimpan...';
  try {
    await db.collection('berkas_keuangan').doc(berkasId).update({
      ppkTglTerima: tglTerima,
      ppkPenerima: penerima,
      ppkStatus: status,
      ppkCatatan: catatan,
      statusPosisi: status === 'Diteruskan' ? 'PPK' : 'Dikembalikan (PPK)'
    });
    alert('Verifikasi PPK berhasil disimpan.');
    e.target.reset();
  } catch (err) {
    console.error(err);
    alert('Gagal menyimpan. Kemungkinan berkas sudah diproses pihak lain. (' + (err.message || '') + ')');
  } finally {
    btn.disabled = false;
    btn.innerText = 'Simpan Verifikasi PPK';
  }
}

async function handlePPSPMSubmit(e) {
  e.preventDefault();
  const berkasId = document.getElementById('ppspm-select-berkas').value;
  const tglTerima = document.getElementById('ppspm-tgl-terima').value;
  const status = document.getElementById('ppspm-status').value;
  const catatan = document.getElementById('ppspm-catatan').value.trim();
  const btn = e.target.querySelector('button[type="submit"]');

  if (!berkasId) { alert('Pilih berkas masuk terlebih dahulu.'); return; }

  btn.disabled = true;
  btn.innerText = 'Menyimpan...';
  try {
    await db.collection('berkas_keuangan').doc(berkasId).update({
      ppspmTglTerima: tglTerima,
      ppspmStatus: status,
      ppspmCatatan: catatan,
      statusPosisi: status === 'Diteruskan' ? 'PPSPM' : 'Dikembalikan (PPSPM)'
    });
    alert('Pengujian PPSPM berhasil disimpan.');
    e.target.reset();
  } catch (err) {
    console.error(err);
    alert('Gagal menyimpan. Kemungkinan berkas sudah diproses pihak lain. (' + (err.message || '') + ')');
  } finally {
    btn.disabled = false;
    btn.innerText = 'Simpan Pengujian PPSPM';
  }
}

async function handleOperatorSubmit(e) {
  e.preventDefault();
  const berkasId = document.getElementById('operator-select-berkas').value;
  const tglTerima = document.getElementById('operator-tgl-terima').value;
  const status = document.getElementById('operator-status').value;
  const catatan = document.getElementById('operator-catatan').value.trim();
  const btn = e.target.querySelector('button[type="submit"]');
  if (!berkasId) { toast('Pilih berkas dari PPSPM terlebih dahulu.', 'warn'); return; }
  btn.disabled = true;
  btn.innerText = 'Menyimpan...';
  try {
    await db.collection('berkas_keuangan').doc(berkasId).update({
      operatorTglTerima: tglTerima, operatorStatus: status, operatorCatatan: catatan,
      statusPosisi: status === 'Diteruskan' ? 'Operator' : 'Dikembalikan (Operator)'
    });
    toast(status === 'Diteruskan' ? 'Berkas disetujui Operator dan diteruskan ke Bendahara.' : 'Berkas dikembalikan ke PPSPM.', status === 'Diteruskan' ? 'success' : 'warn');
    e.target.reset();
  } catch (err) {
    console.error(err);
    toast('Gagal menyimpan approval Operator. (' + (err.message || '') + ')', 'error');
  } finally {
    btn.disabled = false;
    btn.innerText = 'Simpan Approval Operator';
  }
}

async function handleBendaharaSubmit(e) {
  e.preventDefault();
  const berkasId = document.getElementById('bendahara-select-berkas').value;
  const pembuat = document.getElementById('bendahara-pembuat').value;
  const tglSp2d = document.getElementById('bendahara-tgl-sp2d').value;
  const tglTransfer = document.getElementById('bendahara-tgl-transfer').value;
  const btn = e.target.querySelector('button[type="submit"]');

  if (!berkasId) { alert('Pilih berkas teruji terlebih dahulu.'); return; }
  if (!pembuat) { alert('Pilih nama bendahara.'); return; }

  btn.disabled = true;
  btn.innerText = 'Menyimpan...';
  try {
    await db.collection('berkas_keuangan').doc(berkasId).update({
      bendaharaPembuat: pembuat,
      bendaharaTglSp2d: tglSp2d,
      bendaharaTglTransfer: tglTransfer,
      statusPosisi: 'Selesai'
    });
    alert('Pencairan Bendahara berhasil disimpan. Berkas selesai diproses.');
    e.target.reset();
  } catch (err) {
    console.error(err);
    alert('Gagal menyimpan. Kemungkinan berkas sudah diproses pihak lain. (' + (err.message || '') + ')');
  } finally {
    btn.disabled = false;
    btn.innerText = 'Simpan Pencairan Bendahara';
  }
}

// ==========================================================================
// LEMBUR: PENGAJUAN & LAPORAN
// ==========================================================================
async function handlePengajuanLemburSubmit(e) {
  e.preventDefault();
  const ketua = document.getElementById('lembur-ketua').value;
  const tglPengajuan = document.getElementById('lembur-tgl-pengajuan').value;
  const tglMulai = document.getElementById('lembur-tgl-mulai').value;
  const durasiHari = parseFloat(document.getElementById('lembur-durasi').value);
  const peserta = Array.from(document.querySelectorAll('input[name="chk-peserta-lembur"]:checked')).map(el => el.value);
  const btn = e.target.querySelector('button[type="submit"]');

  if (!ketua) { alert('Pilih nama ketua tim.'); return; }
  if (!durasiHari || durasiHari <= 0) { alert('Isi durasi lembur (hari) dengan benar.'); return; }

  btn.disabled = true;
  btn.innerText = 'Menyimpan...';
  try {
    await db.collection('pengajuan_lembur').add({
      ketua, tglPengajuan, tglMulai, durasiHari, peserta,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert('Pengajuan lembur berhasil disimpan.');
    e.target.reset();
  } catch (err) {
    console.error(err);
    alert('Gagal menyimpan pengajuan lembur. (' + (err.message || '') + ')');
  } finally {
    btn.disabled = false;
    btn.innerText = 'Simpan Pengajuan Lembur';
  }
}

async function handleLaporanLemburFirebase(e) {
  e.preventDefault();
  const nama = document.getElementById('lap-nama').value;
  const tgl = document.getElementById('lap-tgl').value;
  const durasiHari = parseFloat(document.getElementById('lap-durasi').value);
  const output = document.getElementById('lap-output').value.trim();
  const fotoFile = document.getElementById('lap-foto').files[0];
  const btn = document.getElementById('btn-submit-lembur');

  if (!nama) { alert('Pilih nama peserta.'); return; }
  if (!durasiHari || durasiHari <= 0) { alert('Isi durasi lembur (hari) dengan benar.'); return; }

  btn.disabled = true;
  btn.innerText = 'Memproses foto...';
  try {
    const fotoBase64 = await compressImageToBase64(fotoFile);
    if (fotoBase64 && fotoBase64.length > 700000) {
      throw new Error('Ukuran foto masih terlalu besar setelah dikompres. Coba pilih foto lain.');
    }

    btn.innerText = 'Menyimpan...';
    await db.collection('laporan_lembur').add({
      nama, tgl, durasiHari, output, foto: fotoBase64,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert('Laporan lembur berhasil disimpan.');
    e.target.reset();
  } catch (err) {
    console.error(err);
    alert('Gagal menyimpan laporan lembur. (' + (err.message || '') + ')');
  } finally {
    btn.disabled = false;
    btn.innerText = 'Simpan Laporan Lembur';
  }
}

// ==========================================================================
// BELANJA UP & KOMPRESI FOTO BASE64
// ==========================================================================
function compressImageToBase64(file, maxWidth = 900, quality = 0.6) {
  return new Promise((resolve, reject) => {
    if (!file) { resolve(null); return; }
    if (!file.type || !file.type.startsWith('image/')) {
      reject(new Error('File yang diupload harus berupa gambar (JPG/PNG).'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round(height * (maxWidth / width));
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Gagal memuat gambar. Coba file lain.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Gagal membaca file.'));
    reader.readAsDataURL(file);
  });
}

async function handleUPFirebase(e) {
  e.preventDefault();
  const tgl = document.getElementById('up-tgl').value;
  const jenis = document.getElementById('up-jenis').value;
  const toko = document.getElementById('up-toko').value.trim();
  const nominal = parseFloat(document.getElementById('up-nominal').value);
  const buktiFile = document.getElementById('up-bukti').files[0];
  const btn = document.getElementById('btn-submit-up');

  if (!toko || !nominal) { alert('Lengkapi nama toko dan nominal.'); return; }

  btn.disabled = true;
  btn.innerText = 'Memproses nota...';
  try {
    const buktiBase64 = await compressImageToBase64(buktiFile);
    if (buktiBase64 && buktiBase64.length > 700000) {
      throw new Error('Ukuran foto nota masih terlalu besar setelah dikompres. Coba pilih foto lain.');
    }

    btn.innerText = 'Menyimpan...';
    await db.collection('belanja_up').add({
      tgl, jenis, toko, nominal, bukti: buktiBase64,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert('Bukti belanja UP berhasil disimpan.');
    e.target.reset();
  } catch (err) {
    console.error(err);
    alert('Gagal menyimpan bukti belanja. (' + (err.message || '') + ')');
  } finally {
    btn.disabled = false;
    btn.innerText = 'Simpan Belanja UP';
  }
}

// ==========================================================================
// REKAM SPBY: UPLOAD EXCEL (DETEKSI HEADER FLEKSIBEL & UPDATE REALTIME CHART)
// ==========================================================================
function ymd(y, m, d) { return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }

function parseTanggal(v) {
  if (v instanceof Date) return ymd(v.getFullYear(), v.getMonth() + 1, v.getDate());
  if (typeof v === 'number' && v > 20000) {
    const p = XLSX.SSF.parse_date_code(v);
    return p ? ymd(p.y, p.m, p.d) : '';
  }
  const s = String(v ?? '').trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return ymd(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);
  if (m) return ymd(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1]);
  return '';
}

// Mendukung 1500000 | 1.500.000 | 1.500.000,50 | 1,500,000.50 | "Rp 1.500.000"
function parseNominal(v) {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  let s = String(v ?? '').replace(/[^0-9.,-]/g, '');
  if (!s) return 0;
  const ld = s.lastIndexOf('.'), lc = s.lastIndexOf(',');
  if (ld > -1 && lc > -1) s = lc > ld ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (lc > -1) s = /,\d{1,2}$/.test(s) ? s.replace(',', '.') : s.replace(/,/g, '');
  else if (ld > -1 && !(/\.\d{1,2}$/.test(s) && (s.match(/\./g) || []).length === 1)) s = s.replace(/\./g, '');
  return parseFloat(s) || 0;
}

function findSPBYHeader(rows) {
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const r = rows[i].map(c => String(c).toLowerCase().trim());
    const t = r.findIndex(c => c.includes('tanggal') || /^tgl/.test(c));
    const u = r.findIndex(c => /uraian|keterangan|rincian|deskripsi/.test(c));
    const n = r.findIndex(c => /nominal|jumlah|nilai|kredit|debet|^rp\b/.test(c));
    if (t > -1 && u > -1 && n > -1) return { headerIndex: i, t, u, n };
  }
  return null;
}

function hashId(str) {
  let h1 = 5381, h2 = 52711;
  for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); h1 = (h1 * 33) ^ c; h2 = (h2 * 31) ^ c; }
  return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36);
}

function handleUploadSPBYExcel() {
  const fileInput = document.getElementById('spby-excel-file');
  const statusEl = document.getElementById('spby-upload-status');
  const btn = document.getElementById('btn-upload-spby');
  const file = fileInput.files[0];

  if (!file) { alert('Pilih file Excel terlebih dahulu.'); return; }
  if (typeof XLSX === 'undefined') { alert('Library pembaca Excel belum termuat, coba refresh halaman.'); return; }
  if (!firebase.auth().currentUser) { alert('Sesi login habis, silakan login ulang.'); return; }

  btn.disabled = true;
  btn.innerText = 'Memproses...';
  statusEl.textContent = '';
  statusEl.className = 'text-xs font-medium';

  const reader = new FileReader();
  reader.onerror = () => { statusEl.textContent = 'Gagal membaca file.'; statusEl.classList.add('text-red-600'); btn.disabled = false; btn.innerText = 'Proses & Simpan Data Excel'; };
  reader.onload = async (evt) => {
    try {
      const wb = XLSX.read(new Uint8Array(evt.target.result), { type: 'array' });

      // baca SEMUA sheet (Januari, Februari, Februari KKP1, dst.)
      const BULAN_ID = ['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember'];
      const docsMap = new Map();
      const info = [];
      let skipped = 0, sheetOk = 0;

      for (const name of wb.SheetNames) {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' });
        const hdr = findSPBYHeader(rows);
        if (!hdr) { info.push(`${name} (tanpa header, dilewati)`); continue; }
        sheetOk++;
        const bulanIdx = BULAN_ID.findIndex(b => name.toLowerCase().includes(b));
        const seen = {};
        let n = 0;
        for (let i = hdr.headerIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row.length) continue;
          const uraian = String(row[hdr.u] ?? '').trim();
          const nominal = parseNominal(row[hdr.n]);
          if (!uraian || nominal === 0 || /^(sub\s*)?(total|jumlah)\b/i.test(uraian)) { skipped++; continue; }
          const tanggal = normalizeTanggal(parseTanggal(row[hdr.t]), bulanIdx);
          // ID deterministik: upload ulang / baris sama antar sheet tidak digandakan
          const key = `${tanggal}|${uraian}|${nominal}`;
          seen[key] = (seen[key] || 0) + 1;
          const id = hashId(key + '#' + seen[key]);
          if (!docsMap.has(id)) { docsMap.set(id, { tanggal, uraian, nominal, sheet: name }); n++; }
        }
        info.push(`${name}: ${n}`);
      }
      const docs = [...docsMap].map(([id, data]) => ({ id, data }));
      console.log('Ringkasan sheet SPBY:', info);
      if (!docs.length) throw new Error('Tidak ada baris valid. Pastikan tiap sheet punya kolom Tanggal, Uraian, dan Nominal.');

      // batas Firestore 500 operasi/batch -> dipecah 400
      for (let i = 0; i < docs.length; i += 400) {
        const batch = db.batch();
        docs.slice(i, i + 400).forEach(d => batch.set(db.collection('rekam_spby').doc(d.id), {
          ...d.data,
          uploadedBy: firebase.auth().currentUser.uid,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }));
        await batch.commit();
      }
      statusEl.textContent = `Berhasil menyimpan ${docs.length} baris dari ${sheetOk} sheet (${skipped} baris dilewati). ` + info.join(' | ');
      statusEl.classList.add('text-emerald-600');
      fileInput.value = '';
    } catch (err) {
      console.error(err);
      statusEl.textContent = err.code === 'permission-denied'
        ? 'Ditolak Firestore rules: akun ini belum punya role Bendahara/Operator/Super Admin.'
        : 'Gagal memproses file: ' + err.message;
      statusEl.classList.add('text-red-600');
    } finally {
      btn.disabled = false;
      btn.innerText = 'Proses & Simpan Data Excel';
    }
  };
  reader.readAsArrayBuffer(file);
}

const BULAN_PANJANG = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function updateSPBYSummary(total, bulanan, count) {
  const now = new Date();
  const tahunBerjalan = TAHUN_ANGGARAN === now.getFullYear();
  const mi = tahunBerjalan ? now.getMonth() : 11; // bulan terakhir yang dihitung
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('metric-realisasi-anggaran', rupiah(total));
  set('chart-header-realisasi', rupiah(total));
  set('metric-bulan-ini', rupiah(bulanan[mi]));
  set('metric-bulan-label', `${BULAN_PANJANG[mi]} ${TAHUN_ANGGARAN}`);
  set('metric-jumlah-trx', count.toLocaleString('id-ID'));
  set('metric-rata', rupiah(total / (mi + 1)));

  let acc = 0;
  const kum = bulanan.map((v, m) => { acc += v; return (tahunBerjalan && m > mi) ? null : acc; });
  if (window.chartBulananInstance) {
    window.chartBulananInstance.data.datasets[0].data = bulanan;
    window.chartBulananInstance.update();
  }
  if (window.chartKumulatifInstance) {
    window.chartKumulatifInstance.data.datasets[0].data = kum;
    window.chartKumulatifInstance.update();
  }
}

function subscribeRekamSPBY() {
  const tbodyPage = document.getElementById('tbody-rekam-spby');
  const tbodyBeranda = document.getElementById('tbody-beranda-spby');

  db.collection('rekam_spby').onSnapshot(snapshot => {
    const rows = [];
    let total = 0, count = 0;
    const bulanan = Array(12).fill(0);

    snapshot.forEach(doc => {
      const d = doc.data();
      const nom = Number(d.nominal || 0);
      rows.push(d);
      const m = /^(\d{4})-(\d{2})/.exec(d.tanggal || '');
      if (m && +m[1] === TAHUN_ANGGARAN) { bulanan[+m[2] - 1] += nom; total += nom; count++; }
    });
    spbyRows = rows;
    const cnt = document.getElementById('spby-count');
    if (cnt) cnt.textContent = `${rows.length} baris SPBY tersimpan · total TA ${TAHUN_ANGGARAN}: ${rupiah(total)}`;
    rows.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));

    const renderRow = d => `<tr><td class="px-3 py-2">${esc(d.tanggal || '-')}</td><td class="px-3 py-2">${esc(d.uraian || '-')}</td><td class="px-3 py-2 text-right font-mono">${rupiah(d.nominal)}</td></tr>`;
    if (tbodyPage) tbodyPage.innerHTML = rows.length ? rows.map(renderRow).join('') : `<tr><td colspan="3" class="text-center py-4 text-slate-400">Belum ada data.</td></tr>`;
    if (tbodyBeranda) tbodyBeranda.innerHTML = rows.length ? rows.slice(0, 10).map(renderRow).join('') : `<tr><td colspan="3" class="text-center py-4 text-slate-400">Belum ada data SPBY.</td></tr>`;
    updateSPBYSummary(total, bulanan, count);
  }, err => {
    console.error('Gagal memuat rekam_spby:', err);
    const msg = `<tr><td colspan="3" class="text-center py-4 text-red-400">Gagal memuat data (cek Firestore rules).</td></tr>`;
    if (tbodyPage) tbodyPage.innerHTML = msg;
    if (tbodyBeranda) tbodyBeranda.innerHTML = msg;
  });
}

function subscribeLembur() {
  const tb = document.getElementById('tbody-laporan-lembur');
  const gal = document.getElementById('beranda-galeri-lembur');
  db.collection('laporan_lembur').orderBy('createdAt', 'desc').limit(100).onSnapshot(s => {
    listLaporanLembur = s.docs.map(d => ({ id: d.id, ...d.data() }));
    if (tb) tb.innerHTML = listLaporanLembur.length ? listLaporanLembur.map(d => `<tr><td class="px-4 py-3">${esc(d.nama)}</td><td class="px-4 py-3">${esc(d.tgl)}</td><td class="px-4 py-3">${esc(d.output)}</td><td class="px-4 py-3">${safeImg(d.foto) ? `<img src="${safeImg(d.foto)}" class="w-12 h-12 object-cover rounded">` : '-'}</td></tr>`).join('') : `<tr><td colspan="4" class="text-center py-4 text-slate-400">Belum ada data.</td></tr>`;
    const imgs = listLaporanLembur.filter(d => safeImg(d.foto)).slice(0, 6);
    if (gal) gal.innerHTML = imgs.length ? imgs.map(d => `<img src="${safeImg(d.foto)}" onclick="openImageModal(this.src, '${esc(d.nama || '-')} · ${esc(d.tgl || '-')}', '${esc((d.output || '').replace(/'/g, '&#39;'))}')" class="w-full h-20 object-cover rounded-lg cursor-pointer hover:opacity-90 transition">`).join('') : '<p class="col-span-3">Belum ada foto. Lihat semua di menu Dokumentasi.</p>';
    renderDokumentasiLembur();
  }, err => console.error('Gagal memuat laporan_lembur:', err));
}

function subscribeBelanjaUP() {
  const tb = document.getElementById('tbody-belanja-up');
  const gal = document.getElementById('beranda-galeri-belanja');
  db.collection('belanja_up').orderBy('createdAt', 'desc').limit(100).onSnapshot(s => {
    listBelanjaUP = s.docs.map(d => ({ id: d.id, ...d.data() }));
    if (tb) tb.innerHTML = listBelanjaUP.length ? listBelanjaUP.map(d => `<tr><td class="px-4 py-3">${esc(d.tgl)}</td><td class="px-4 py-3">${esc(d.jenis)}</td><td class="px-4 py-3">${esc(d.toko)}</td><td class="px-4 py-3">${rupiah(d.nominal)}</td><td class="px-4 py-3">${safeImg(d.bukti) ? `<img src="${safeImg(d.bukti)}" class="w-12 h-12 object-cover rounded">` : '-'}</td></tr>`).join('') : `<tr><td colspan="5" class="text-center py-4 text-slate-400">Belum ada data.</td></tr>`;
    const imgs = listBelanjaUP.filter(d => safeImg(d.bukti)).slice(0, 6);
    if (gal) gal.innerHTML = imgs.length ? imgs.map(d => `<img src="${safeImg(d.bukti)}" onclick="openImageModal(this.src, '${esc(d.toko || '-')} · ${esc(d.tgl || '-')}', '${esc(d.jenis || '-')} · ${esc(rupiah(d.nominal))}')" class="w-full h-20 object-cover rounded-lg cursor-pointer hover:opacity-90 transition">`).join('') : '<p class="col-span-3">Belum ada foto. Lihat semua di menu Dokumentasi.</p>';
    renderDokumentasiBelanja();
  }, err => console.error('Gagal memuat belanja_up:', err));
}

window.chartBulananInstance = null;
window.chartKumulatifInstance = null;

const ringkasRp = v => v >= 1e9 ? (v / 1e9).toFixed(1).replace('.', ',') + ' M' : v >= 1e6 ? Math.round(v / 1e6) + ' jt' : String(v);

function initCharts() {
  if (typeof Chart === 'undefined') return;
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const opts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${rupiah(c.parsed.y)}` } } },
    scales: { y: { beginAtZero: true, ticks: { callback: ringkasRp } } }
  };
  const c1 = document.getElementById('chartBulanan')?.getContext('2d');
  if (c1) {
    window.chartBulananInstance = new Chart(c1, {
      type: 'bar',
      data: { labels, datasets: [{ data: Array(12).fill(0), backgroundColor: '#1e3a8a', borderRadius: 4 }] },
      options: opts
    });
  }
  const c2 = document.getElementById('chartKumulatif')?.getContext('2d');
  if (c2) {
    window.chartKumulatifInstance = new Chart(c2, {
      type: 'line',
      data: { labels, datasets: [{ data: Array(12).fill(0), borderColor: '#1e3a8a', backgroundColor: 'rgba(30,58,138,0.12)', fill: true, tension: 0.25 }] },
      options: opts
    });
  }
}

// ==========================================================================
// ARSIP: SK, KAK, SPM (upload & listing ada di bagian bawah file,
// lihat handleArsipUpload / loadArsipList)
// ==========================================================================

// ==========================================================================
// PERBAIKAN TANGGAL SPBY & RESET DATA
// ==========================================================================
// Bulan diambil dari nama sheet (paling andal). Tanggal Excel yang tertukar
// hari/bulan (07/01 vs 01/07) atau salah tahun (2028) dikoreksi.
function normalizeTanggal(tgl, mi) {
  if (mi < 0) return tgl;
  const target = mi + 1;
  if (!tgl) return ymd(TAHUN_ANGGARAN, target, 1);
  const [, m, d] = tgl.split('-').map(Number);
  if (m === target) return ymd(TAHUN_ANGGARAN, m, d);
  if (d === target && m <= 28) return ymd(TAHUN_ANGGARAN, target, m); // hari & bulan tertukar
  return ymd(TAHUN_ANGGARAN, target, Math.min(d, 28));
}

async function handleResetSPBY() {
  if (!await confirmModal('Hapus semua data SPBY?', 'Semua data SPBY tersimpan akan dihapus permanen. Setelah itu upload ulang file Excel. Tindakan ini tidak bisa dibatalkan.', 'Ya, hapus semua')) return;
  try {
    const snap = await db.collection('rekam_spby').get();
    for (let i = 0; i < snap.docs.length; i += 400) {
      const b = db.batch();
      snap.docs.slice(i, i + 400).forEach(d => b.delete(d.ref));
      await b.commit();
    }
    toast(`${snap.size} data SPBY dihapus. Silakan upload ulang Excel.`, 'success');
  } catch (err) {
    toast(err.code === 'permission-denied' ? 'Ditolak: hanya Operator/Super Admin yang boleh menghapus.' : 'Gagal menghapus data. (' + err.message + ')', 'error');
  }
}

// ==========================================================================
// ARSIP: UPLOAD LANGSUNG KE GOOGLE DRIVE (via Apps Script) + TAMPIL DI BERANDA
// Ganti ARSIP_API_URL di bawah dengan URL Web App hasil deploy arsip-drive.gs
// ==========================================================================
const ARSIP_API_URL = 'https://script.google.com/macros/s/AKfycbwrsGH6O1pBpnn1ffIfcNl3rKnmseXlaHflsCAtsvbY3Dy-NZruc9vnH69fgrnktSlz/exec';

async function loadArsipList(kat) {
  const box = document.getElementById('list-arsip-' + kat);
  if (!box) return;
  if (!ARSIP_API_URL) {
    box.innerHTML = '<p class="text-amber-600 col-span-full">Koneksi Google Drive belum dikonfigurasi (isi ARSIP_API_URL di script.js).</p>';
    return;
  }
  try {
    const r = await fetch(`${ARSIP_API_URL}?kategori=${kat}`);
    const text = await r.text();
    let j;
    try { j = JSON.parse(text); }
    catch { throw new Error('Respons Apps Script bukan JSON (kemungkinan deployment belum "Anyone" atau URL salah).'); }
    if (j.error) throw new Error(j.error);
    box.innerHTML = j.files.length ? j.files.map(f => `
      <div class="file-card">
        <div class="min-w-0">
          <p class="font-bold text-slate-800 truncate">${esc(f.name)}</p>
          <p class="text-[11px] text-slate-400">${esc((f.date || '').slice(0, 10))}</p>
        </div>
        <button data-id="${esc(f.id)}" data-name="${esc(f.name)}" onclick="openPdfModal(this.dataset.id, this.dataset.name)" class="file-open">Buka</button>
      </div>`).join('') : '<p class="text-slate-400 col-span-full">Belum ada file.</p>';
  } catch (err) {
    console.error('Gagal memuat arsip ' + kat, err);
    box.innerHTML = `<p class="text-red-500 col-span-full">Gagal memuat file dari Drive. (${esc(err.message)})</p>`;
  }
}

function openPdfModal(id, name) {
  const safe = encodeURIComponent(id);
  openModal(`<div class="flex items-center justify-between gap-3 mb-3">
      <h3 class="modal-title truncate">${esc(name)}</h3>
      <div class="flex gap-2 shrink-0"><a href="https://drive.google.com/file/d/${safe}/view" target="_blank" rel="noopener" class="btn-ghost">Tab baru</a><button data-modal-close class="btn-ghost">Tutup</button></div>
    </div>
    <iframe src="https://drive.google.com/file/d/${safe}/preview" class="w-full rounded-xl border border-slate-200" style="height:70vh"></iframe>`, true);
}

async function handleArsipUpload(e, kat) {
  e.preventDefault();
  const form = e.target;
  const file = form.querySelector('[data-f="file"]').files[0];
  const btn = form.querySelector('button[type="submit"]');
  if (!file) { toast('Pilih file terlebih dahulu.', 'warn'); return; }
  if (file.size > 10 * 1024 * 1024) { toast('Ukuran file maksimal 10 MB.', 'warn'); return; }
  if (!ARSIP_API_URL) { toast('ARSIP_API_URL belum diisi di script.js (lihat arsip-drive.gs).', 'error'); return; }
  btn.disabled = true;
  btn.innerText = 'Mengunggah ke Drive...';
  try {
    const dataUrl = await convertFileToBase64(file);
    const r = await fetch(ARSIP_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ kategori: kat, name: file.name, mime: file.type || 'application/octet-stream', data: dataUrl.split(',')[1] })
    });
    const text = await r.text();
    let j;
    try { j = JSON.parse(text); }
    catch { throw new Error('Respons Apps Script bukan JSON (kemungkinan deployment belum "Anyone" atau URL salah).'); }
    if (!j.ok) throw new Error(j.error || 'Upload ditolak');
    toast(`File ${kat} berhasil diunggah ke Google Drive.`, 'success');
    form.reset();
    loadArsipList(kat);
  } catch (err) {
    console.error(err);
    toast('Gagal mengunggah file. (' + err.message + ')', 'error');
  } finally {
    btn.disabled = false;
    btn.innerText = `Upload File ${kat}`;
  }
}