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
  subscribePengajuanLembur();
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
  renderDokGrid('dok-grid-lembur', listLaporanLembur, d => d.foto, d => `${d.nama || '-'} · ${d.tgl || '-'}`,
    d => (d.jamLembur ? `${d.jamLembur} jam (${d.jenisHari || '-'}) — ` : '') + (d.output || ''));
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
  XLSX.writeFile(wb, 'KIBATA_Export.xlsx');
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

let currentRoles = [];
function hasPageAccess(pageId, roles) {
  const required = PAGE_ROLES[pageId];
  return !required || roles.includes('Operator') || roles.includes('Super Admin') || required.some(r => roles.includes(r));
}

// Klik profil di kanan atas -> menu Operator (hanya Operator / Super Admin)
function openOperatorMenu() {
  if (!hasPageAccess('page-operator', currentRoles)) return;
  navigateTo('page-operator');
}

function navigateTo(pageId) {
  if (!hasPageAccess(pageId, currentRoles)) { toast('Anda tidak memiliki akses ke halaman ini.', 'warn'); return; }
  document.querySelectorAll('.page-view').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('[data-page]').forEach(b => b.classList.toggle('nav-active', b.getAttribute('data-page') === pageId));
  const target = document.getElementById(pageId);
  if (target) {
    const ht = document.getElementById('header-title');
    if (ht && PAGE_TITLES[pageId]) ht.textContent = PAGE_TITLES[pageId];
    target.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  closeSidebar(); // di HP, menu otomatis tertutup setelah pindah halaman
}

// ==========================================================================
// SIDEBAR MOBILE: buka/tutup drawer (hamburger di header, overlay gelap, tombol X)
// ==========================================================================
function openSidebar() {
  document.getElementById('main-sidebar')?.classList.remove('-translate-x-full');
  document.getElementById('main-sidebar')?.classList.add('translate-x-0');
  const ov = document.getElementById('sidebar-overlay');
  if (ov) { ov.classList.remove('opacity-0', 'pointer-events-none'); ov.classList.add('opacity-100'); }
  document.body.classList.add('overflow-hidden', 'lg:overflow-auto');
}

function closeSidebar() {
  document.getElementById('main-sidebar')?.classList.add('-translate-x-full');
  document.getElementById('main-sidebar')?.classList.remove('translate-x-0');
  const ov = document.getElementById('sidebar-overlay');
  if (ov) { ov.classList.add('opacity-0', 'pointer-events-none'); ov.classList.remove('opacity-100'); }
  document.body.classList.remove('overflow-hidden');
}

// Kalau layar diresize/rotasi ke ukuran desktop saat drawer kebuka di HP, rapikan kembali
window.addEventListener('resize', () => { if (window.innerWidth >= 1024) closeSidebar(); });

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
    renderArsiparisTable();
  }, err => console.error('Gagal memuat berkas_keuangan:', err));
}

// ==========================================================================
// INPUT MEMO: ARSIPARIS (setelah Bendahara simpan pencairan -> tahap arsip akhir)
// ==========================================================================
let arsiparisTab = 'siap';

function switchArsiparisTab(tab) {
  arsiparisTab = tab;
  const map = { siap: 'btn-arsiparis-siap', selesai: 'btn-arsiparis-selesai' };
  Object.entries(map).forEach(([k, id]) => {
    const b = document.getElementById(id);
    if (!b) return;
    if (k === tab) { b.className = b.className.replace('bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-800', 'bg-blue-800 text-white'); }
    else { b.className = b.className.replace('bg-blue-800 text-white', 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-800'); }
  });
  renderArsiparisTable();
}

function renderArsiparisTable() {
  const tbody = document.getElementById('tbody-arsiparis');
  if (!tbody) return; // halaman belum aktif, skip render

  const siap = listBerkas.filter(b => b.statusPosisi === 'Bendahara');
  const selesai = listBerkas.filter(b => b.statusPosisi === 'Arsip');
  const cSiap = document.getElementById('arsiparis-count-siap');
  const cSelesai = document.getElementById('arsiparis-count-selesai');
  if (cSiap) cSiap.textContent = siap.length;
  if (cSelesai) cSelesai.textContent = selesai.length;

  const rows = arsiparisTab === 'siap' ? siap : selesai;
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="11" class="text-center py-6 text-slate-400">${arsiparisTab === 'siap' ? 'Belum ada berkas yang siap diarsipkan.' : 'Belum ada berkas yang sudah diarsipkan.'}</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((b, i) => {
    if (arsiparisTab === 'siap') {
      return `
        <tr>
          <td class="spby-td text-center">${i + 1}</td>
          <td class="spby-td font-mono">${esc(b.smNoMemo || '-')}</td>
          <td class="spby-td">${esc(b.smUraian || '-')}</td>
          <td class="spby-td">${esc(b.smPembuat || '-')}</td>
          <td class="spby-td">${esc(b.bendaharaTglSp2d || '-')}</td>
          <td class="spby-td">${esc(b.bendaharaTglTransfer || '-')}</td>
          <td class="spby-td">${esc(b.bendaharaTglRekap || '-')}</td>
          <td class="spby-td"><input type="date" id="arsiparis-tgl-${b.id}" class="spby-in"></td>
          <td class="spby-td"><input type="text" id="arsiparis-ket-${b.id}" placeholder="Keterangan / lokasi arsip" class="spby-in"></td>
          <td class="spby-td text-center">${statusBadge('Siap Diarsipkan')}</td>
          <td class="spby-td text-center no-print"><button type="button" onclick="handleArsipkanBerkas('${b.id}')" class="bg-blue-800 hover:bg-blue-900 text-white text-[11px] px-3 py-1.5 rounded-lg font-bold transition">Arsipkan</button></td>
        </tr>`;
    }
    return `
      <tr>
        <td class="spby-td text-center">${i + 1}</td>
        <td class="spby-td font-mono">${esc(b.smNoMemo || '-')}</td>
        <td class="spby-td">${esc(b.smUraian || '-')}</td>
        <td class="spby-td">${esc(b.smPembuat || '-')}</td>
        <td class="spby-td">${esc(b.bendaharaTglSp2d || '-')}</td>
        <td class="spby-td">${esc(b.bendaharaTglTransfer || '-')}</td>
          <td class="spby-td">${esc(b.bendaharaTglRekap || '-')}</td>
        <td class="spby-td">${esc(b.arsipTglArsip || '-')}</td>
        <td class="spby-td">${esc(b.arsipKeterangan || '-')}</td>
        <td class="spby-td text-center">${statusBadge('Sudah Diarsipkan')}</td>
        <td class="spby-td text-center no-print"><button type="button" onclick="openEditArsip('${b.id}')" class="btn-ghost !px-3 !py-1.5 text-[11px]">Edit</button></td>
      </tr>`;
  }).join('');
  if (window.lucide) lucide.createIcons();
}

async function handleArsipkanBerkas(id) {
  const tglEl = document.getElementById(`arsiparis-tgl-${id}`);
  const ketEl = document.getElementById(`arsiparis-ket-${id}`);
  const tgl = tglEl ? tglEl.value : '';
  const ket = ketEl ? ketEl.value.trim() : '';
  if (!tgl) { toast('Isi Tanggal Arsip terlebih dahulu.', 'warn'); if (tglEl) tglEl.focus(); return; }

  try {
    await db.collection('berkas_keuangan').doc(id).update({
      arsipTglArsip: tgl,
      arsipKeterangan: ket,
      arsipPembuat: currentUserData ? (currentUserData.nama || '') : '',
      statusPosisi: 'Arsip'
    });
    toast('Berkas berhasil diarsipkan.', 'success');
  } catch (err) {
    console.error(err);
    toast('Gagal mengarsipkan berkas. (' + (err.message || '') + ')', 'error');
  }
}


// Edit berkas yang sudah diarsipkan: ubah data, atau batalkan status arsip bila keliru
function openEditArsip(id) {
  const b = listBerkas.find(x => x.id === id);
  if (!b) return;
  const inCls = 'w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 outline-none transition';
  const o = openModal(`
    <h3 class="modal-title">Edit Arsip</h3>
    <p class="modal-text font-mono">${esc(b.smNoMemo || '-')}</p>
    <p class="text-xs text-slate-500">${esc(b.smUraian || '-')}</p>
    <div class="space-y-3 mt-4 text-sm">
      <div><label class="block text-xs font-semibold mb-1 text-slate-600">Tanggal Arsip</label><input type="date" id="edit-arsip-tgl" value="${esc(b.arsipTglArsip || '')}" class="${inCls}"></div>
      <div><label class="block text-xs font-semibold mb-1 text-slate-600">Keterangan Arsip</label><input type="text" id="edit-arsip-ket" value="${esc(b.arsipKeterangan || '')}" class="${inCls}"></div>
    </div>
    <div class="flex flex-wrap gap-2 justify-between mt-5">
      <button type="button" id="btn-batal-arsip" class="btn-danger">Batalkan Status Arsip</button>
      <div class="flex gap-2"><button data-modal-close class="btn-ghost">Tutup</button><button type="button" id="btn-simpan-edit-arsip" class="bg-blue-800 hover:bg-blue-900 text-white text-xs px-4 py-2 rounded-xl font-bold">Simpan Perubahan</button></div>
    </div>`);
  o.querySelector('#btn-simpan-edit-arsip').onclick = () => simpanEditArsip(id);
  o.querySelector('#btn-batal-arsip').onclick = () => batalkanArsip(id);
}

async function simpanEditArsip(id) {
  const tgl = document.getElementById('edit-arsip-tgl').value;
  const ket = document.getElementById('edit-arsip-ket').value.trim();
  if (!tgl) { toast('Isi Tanggal Arsip terlebih dahulu.', 'warn'); return; }
  try {
    await db.collection('berkas_keuangan').doc(id).update({ arsipTglArsip: tgl, arsipKeterangan: ket });
    closeModal();
    toast('Data arsip berhasil diperbarui.', 'success');
  } catch (err) { console.error(err); toast('Gagal memperbarui arsip. (' + (err.message || '') + ')', 'error'); }
}

async function batalkanArsip(id) {
  if (!await confirmModal('Batalkan status arsip?', 'Berkas dikembalikan ke tab "Siap Diarsipkan" dan data tanggal/keterangan arsip dihapus.', 'Ya, batalkan')) { openEditArsip(id); return; }
  const del = firebase.firestore.FieldValue.delete();
  try {
    await db.collection('berkas_keuangan').doc(id).update({ statusPosisi: 'Bendahara', arsipTglArsip: del, arsipKeterangan: del, arsipPembuat: del });
    toast('Status arsip dibatalkan. Berkas kembali ke "Siap Diarsipkan".', 'warn');
  } catch (err) { console.error(err); toast('Gagal membatalkan arsip. (' + (err.message || '') + ')', 'error'); }
}

function exportArsiparisExcel() {
  if (typeof XLSX === 'undefined') { toast('Library Excel belum termuat, coba refresh halaman.', 'error'); return; }
  const siap = listBerkas.filter(b => b.statusPosisi === 'Bendahara');
  const selesai = listBerkas.filter(b => b.statusPosisi === 'Arsip');
  if (!siap.length && !selesai.length) { toast('Belum ada data arsip untuk diexport.', 'warn'); return; }
  const head = ['No', 'No. Memo SM', 'Uraian', 'Pembuat', 'Tgl SP2D', 'Tgl Transfer', 'Tgl Rekap Bendahara', 'Tanggal Arsip', 'Keterangan Arsip', 'Status'];
  const sheet = (rows, status) => {
    const ws = XLSX.utils.aoa_to_sheet([head, ...rows.map((b, i) => [i + 1, b.smNoMemo || '', b.smUraian || '', b.smPembuat || '', b.bendaharaTglSp2d || '', b.bendaharaTglTransfer || '', b.bendaharaTglRekap || '', b.arsipTglArsip || '', b.arsipKeterangan || '', status])]);
    ws['!cols'] = [5, 30, 48, 28, 12, 12, 18, 13, 30, 18].map(wch => ({ wch }));
    return ws;
  };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet(selesai, 'Sudah Diarsipkan'), 'Sudah Diarsipkan');
  XLSX.utils.book_append_sheet(wb, sheet(siap, 'Siap Diarsipkan'), 'Siap Diarsipkan');
  const d = new Date();
  const fn = `KIBATA_Arsip_Berkas_${ymd(d.getFullYear(), d.getMonth() + 1, d.getDate())}.xlsx`;
  XLSX.writeFile(wb, fn);
  toast(`File ${fn} berhasil diunduh (${selesai.length} diarsipkan, ${siap.length} siap diarsipkan).`, 'success');
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
      alert("Akun Anda telah dinonaktifkan oleh Admin. Hubungi Operator KIBATA.");
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
  else if (/setuju|selesai|approved|berhasil|lunas|diterima|^sudah/.test(low)) cls = 'status-done';
  else if (/tunggu|pending|proses|menunggu|diajukan|kembali|^belum|^siap/.test(low)) cls = 'status-pending';
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
  'page-operator-approval': ['Operator', 'Super Admin'],
  'page-operator': ['Operator', 'Super Admin'],
  'page-bendahara': ['Bendahara', 'Operator', 'Super Admin'],
  'page-arsiparis': ['Arsiparis', 'Bendahara', 'Operator', 'Super Admin'],
  'page-pengajuan-lembur': null,
  'page-laporan-lembur': null,
  'page-rekam-spby': ['Bendahara', 'Operator', 'Super Admin'],
  'page-up': null,
  'page-arsip-sk': null,
  'page-arsip-kak': null,
  'page-arsip-spm': null,
};

const PAGE_TITLES = {
  'page-beranda': 'Selamat Datang di KIBATA',
  'page-dashboard-all': 'Dashboard Monitoring Input',
  'page-dokumentasi': 'Dokumentasi Kegiatan',
  'page-sm': 'Input Memo: Subject Matter',
  'page-ppk': 'Input Memo: PPK',
  'page-ppspm': 'Input Memo: PPSPM',
  'page-operator-approval': 'Input Memo: Operator',
  'page-operator': 'Kelola Akun Karyawan',
  'page-bendahara': 'Input Memo: Bendahara',
  'page-arsiparis': 'Input Memo: Arsiparis',
  'page-pengajuan-lembur': 'Pengajuan Lembur',
  'page-laporan-lembur': 'Laporan Lembur',
  'page-rekam-spby': 'Rekam SPBY Bendahara',
  'page-up': 'Bukti Belanja UP',
  'page-arsip-sk': 'Arsip SK',
  'page-arsip-kak': 'Arsip KAK',
  'page-arsip-spm': 'Arsip SPM',
};

function applyRolePermissions(roles) {
  currentRoles = roles;
  const isFullAccess = roles.includes('Operator') || roles.includes('Super Admin');

  // profil kanan atas: hanya Operator/Super Admin yang bisa diklik
  const pBtn = document.getElementById('btn-profile-menu');
  if (pBtn) {
    pBtn.classList.toggle('cursor-default', !isFullAccess);
    pBtn.classList.toggle('cursor-pointer', isFullAccess);
    pBtn.classList.toggle('profile-clickable', isFullAccess);
    pBtn.title = isFullAccess ? 'Buka Menu Operator' : '';
  }
  document.getElementById('profile-operator-badge')?.classList.toggle('hidden', !isFullAccess);

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
    if (!hasPageAccess(activePage.id, roles) || (btnForActive && btnForActive.classList.contains('hidden'))) {
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
const SM_MEMO_PREFIX = `FP-${TAHUN_ANGGARAN}-682317-92800-`;

async function handleSMSubmit(e) {
  e.preventDefault();
  const noMemoEl = document.getElementById('sm-no-memo-suffix');
  const pembuat = document.getElementById('sm-pembuat').value;
  const suffix = noMemoEl.value.trim();
  const noMemo = suffix ? SM_MEMO_PREFIX + suffix : '';
  const uraian = document.getElementById('sm-uraian').value.trim();
  const tglPenyerahan = document.getElementById('sm-tgl-penyerahan').value;
  const errEl = document.getElementById('sm-no-memo-error');
  const btn = e.target.querySelector('button[type="submit"]');

  if (errEl) errEl.classList.add('hidden');
  if (!pembuat) { alert('Pilih nama pembuat terlebih dahulu.'); return; }
  if (!suffix) { alert('Nomor urut memo tidak boleh kosong.'); noMemoEl.focus(); return; }

  btn.disabled = true;
  btn.innerText = 'Mengecek nomor memo...';

  try {
    const wrapEl = document.getElementById('sm-no-memo-wrap');
    const dup = await db.collection('berkas_keuangan').where('smNoMemo', '==', noMemo).limit(1).get();
    if (!dup.empty) {
      if (errEl) errEl.classList.remove('hidden');
      if (wrapEl) wrapEl.classList.add('ring-2', 'ring-red-400', 'border-red-400');
      noMemoEl.focus();
      return;
    }
    if (wrapEl) wrapEl.classList.remove('ring-2', 'ring-red-400', 'border-red-400');

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
  const tglRekap = document.getElementById('bendahara-tgl-rekap').value;
  const btn = e.target.querySelector('button[type="submit"]');

  if (!berkasId) { alert('Pilih berkas teruji terlebih dahulu.'); return; }
  if (!pembuat) { alert('Pilih nama bendahara.'); return; }
  if (!tglRekap) { alert('Isi Tgl Rekap Bendahara.'); return; }

  btn.disabled = true;
  btn.innerText = 'Menyimpan...';
  try {
    await db.collection('berkas_keuangan').doc(berkasId).update({
      bendaharaPembuat: pembuat,
      bendaharaTglSp2d: tglSp2d,
      bendaharaTglTransfer: tglTransfer,
      bendaharaTglRekap: tglRekap,
      statusPosisi: 'Bendahara'
    });
    alert('Pencairan Bendahara berhasil disimpan. Berkas diteruskan ke Arsiparis.');
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
  const noSpkl = document.getElementById('lembur-no-spkl').value.trim();
  const ketua = document.getElementById('lembur-ketua').value;
  const perihal = document.getElementById('lembur-perihal').value.trim();
  const tglPengajuan = document.getElementById('lembur-tgl-pengajuan').value;
  const tglMulai = document.getElementById('lembur-tgl-mulai').value;
  const durasiHari = parseFloat(document.getElementById('lembur-durasi').value);
  const peserta = Array.from(document.querySelectorAll('input[name="chk-peserta-lembur"]:checked')).map(el => el.value);
  const btn = e.target.querySelector('button[type="submit"]');

  if (!noSpkl) { toast('Isi No. SPKL.', 'warn'); return; }
  if (!ketua) { alert('Pilih nama ketua tim.'); return; }
  if (!perihal) { alert('Isi perihal lembur.'); return; }
  if (!durasiHari || durasiHari <= 0) { alert('Isi durasi lembur (hari) dengan benar.'); return; }

  btn.disabled = true;
  btn.innerText = 'Menyimpan...';
  try {
    const dup = await db.collection('pengajuan_lembur').where('noSpkl', '==', noSpkl).limit(1).get();
    if (!dup.empty) { toast('No. SPKL ' + noSpkl + ' sudah pernah dipakai. Gunakan nomor lain.', 'warn'); return; }
    await db.collection('pengajuan_lembur').add({
      noSpkl, ketua, perihal, tglPengajuan, tglMulai, durasiHari, peserta,
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

// Batas jam lembur: HK (Hari Kerja) maks 4 jam, HL (Hari Libur) maks 8 jam
const JAM_LEMBUR_MAX = { HK: 4, HL: 8 };
const JAM_LEMBUR_LABEL = { HK: 'Hari Kerja (HK)', HL: 'Hari Libur (HL)' };

function validateJamLembur() {
  const jenisEl = document.getElementById('lap-jenis-hari');
  const jamEl = document.getElementById('lap-jam');
  const warnEl = document.getElementById('lap-jam-warning');
  if (!jenisEl || !jamEl || !warnEl) return true;

  const jenis = jenisEl.value;
  const max = JAM_LEMBUR_MAX[jenis] || 4;
  const jam = parseFloat(jamEl.value);

  if (jam && jam > max) {
    jamEl.value = max;
    warnEl.querySelector('span').textContent = `Jam lembur melebihi batas maksimal untuk ${JAM_LEMBUR_LABEL[jenis]}. Otomatis disesuaikan ke maksimal ${max} jam.`;
    warnEl.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
    return false;
  }
  warnEl.classList.add('hidden');
  return true;
}

const LAP_LABEL = { 'lap-nama': 'Nama Peserta', 'lap-spkl': 'No. SPKL', 'lap-tgl': 'Tanggal', 'lap-jenis-hari': 'Jenis Hari', 'lap-jam': 'Jam Lembur', 'lap-output': 'Output Pekerjaan', 'lap-foto': 'Foto' };

function setFieldError(id, msg) {
  const el = document.getElementById(id), p = document.getElementById('err-' + id);
  if (el) el.classList.toggle('input-error', !!msg);
  if (p) { p.textContent = msg || ''; p.classList.toggle('hidden', !msg); }
}

// Periode berlaku SPKL (tgl mulai s/d tgl mulai + durasi hari, pembulatan ke atas)
function lemburRange(p) {
  const start = p.tglMulai || '';
  const d = new Date(start + 'T00:00:00');
  if (!start || isNaN(d.getTime())) return { start, end: start };
  d.setDate(d.getDate() + Math.max(0, Math.ceil(Number(p.durasiHari) || 1) - 1));
  return { start, end: ymd(d.getFullYear(), d.getMonth() + 1, d.getDate()) };
}

// SPKL yang memuat pegawai ini (sebagai ketua atau peserta)
function pengajuanUntukPegawai(nama) {
  return nama ? listPengajuanLembur.filter(p => p.ketua === nama || (Array.isArray(p.peserta) && p.peserta.includes(nama))) : [];
}

function refreshLaporanSpklOptions() {
  const sel = document.getElementById('lap-spkl');
  if (!sel) return;
  const nama = document.getElementById('lap-nama')?.value;
  const prev = sel.value;
  const items = pengajuanUntukPegawai(nama);
  if (!nama) sel.innerHTML = '<option value="">-- Pilih nama peserta dulu --</option>';
  else if (!items.length) sel.innerHTML = '<option value="">-- Pegawai ini belum terdaftar di SPKL mana pun --</option>';
  else sel.innerHTML = '<option value="">-- Pilih No. SPKL --</option>' + items.map(p =>
    `<option value="${esc(p.id)}">${esc(p.noSpkl || 'Tanpa No. SPKL')} — ${esc((p.perihal || '').slice(0, 45))} (${esc(p.tglMulai || '-')})</option>`).join('');
  if (items.some(p => p.id === prev)) sel.value = prev;
  else if (items.length === 1) sel.value = items[0].id;
  setFieldError('lap-spkl', '');
}

function validateLaporanLembur() {
  const v = id => document.getElementById(id)?.value ?? '';
  const errs = {};
  const nama = v('lap-nama'), pid = v('lap-spkl'), tgl = v('lap-tgl'), jam = parseFloat(v('lap-jam'));
  if (!nama) errs['lap-nama'] = 'Nama peserta wajib dipilih.';
  if (!pid) errs['lap-spkl'] = nama ? 'No. SPKL wajib dipilih.' : 'Pilih nama peserta dulu, lalu pilih No. SPKL.';
  if (!tgl) errs['lap-tgl'] = 'Tanggal wajib diisi.';
  if (!v('lap-jenis-hari')) errs['lap-jenis-hari'] = 'Jenis hari wajib dipilih.';
  if (!jam || jam <= 0) errs['lap-jam'] = 'Jam lembur wajib diisi (minimal 0,5 jam).';
  if (!v('lap-output').trim()) errs['lap-output'] = 'Output pekerjaan wajib diisi.';
  if (!document.getElementById('lap-foto')?.files[0]) errs['lap-foto'] = 'Foto kegiatan wajib diunggah.';
  if (pid && tgl) {
    const p = listPengajuanLembur.find(x => x.id === pid);
    const r = p && lemburRange(p);
    if (r && r.start && (tgl < r.start || tgl > r.end)) errs['lap-tgl'] = `Tanggal di luar periode SPKL ini (${r.start} s/d ${r.end}).`;
  }
  return errs;
}

function showLaporanErrors(errs) {
  Object.keys(LAP_LABEL).forEach(id => setFieldError(id, errs[id] || ''));
  const keys = Object.keys(errs);
  const box = document.getElementById('lap-form-warning');
  if (box) {
    box.classList.toggle('hidden', !keys.length);
    const t = document.getElementById('lap-form-warning-text');
    if (t) t.textContent = keys.length ? 'Laporan belum bisa dikirim. Lengkapi/perbaiki: ' + keys.map(k => LAP_LABEL[k] || k).join(', ') + '.' : '';
  }
  if (keys.length) { toast('Semua data wajib diisi sebelum laporan dikirim.', 'warn'); document.getElementById(keys[0])?.focus(); }
  return !keys.length;
}

window.addEventListener('DOMContentLoaded', () => {
  const f = document.getElementById('form-laporan-lembur');
  if (!f) return;
  const clear = e => { if (e.target.id) setFieldError(e.target.id, ''); };
  f.addEventListener('input', clear);
  f.addEventListener('change', clear);
});

async function handleLaporanLemburFirebase(e) {
  e.preventDefault();
  if (!showLaporanErrors(validateLaporanLembur())) return;
  const nama = document.getElementById('lap-nama').value;
  const pid = document.getElementById('lap-spkl').value;
  const tgl = document.getElementById('lap-tgl').value;
  const jenisHari = document.getElementById('lap-jenis-hari').value;
  const jamLembur = parseFloat(document.getElementById('lap-jam').value);
  const output = document.getElementById('lap-output').value.trim();
  const fotoFile = document.getElementById('lap-foto').files[0];
  const btn = document.getElementById('btn-submit-lembur');
  const p = listPengajuanLembur.find(x => x.id === pid) || {};
  const max = JAM_LEMBUR_MAX[jenisHari] || 4;
  if (jamLembur > max) { validateJamLembur(); setFieldError('lap-jam', `Jam lembur melebihi batas maksimal ${max} jam untuk ${JAM_LEMBUR_LABEL[jenisHari]}.`); return; }

  btn.disabled = true;
  btn.innerText = 'Memeriksa data...';
  try {
    // Anti input ganda (cek ke server): SPKL + pegawai + tanggal yang sama, dan total jam per hari lintas SPKL
    const snap = await db.collection('laporan_lembur').where('nama', '==', nama).where('tgl', '==', tgl).get();
    const ada = snap.docs.map(d => d.data());
    if (ada.some(l => l.pengajuanId === pid)) {
      setFieldError('lap-tgl', 'Laporan untuk pegawai, SPKL, dan tanggal ini sudah pernah diinput.');
      toast('Laporan ganda: data untuk SPKL & tanggal ini sudah ada.', 'warn'); return;
    }
    const terpakai = ada.reduce((a, l) => a + Number(l.jamLembur || 0), 0);
    if (terpakai + jamLembur > max) {
      setFieldError('lap-jam', `Pada tanggal ini sudah tercatat ${terpakai} jam (SPKL lain). Sisa kuota ${Math.max(0, max - terpakai)} jam.`);
      toast('Total jam lembur pada tanggal ini melebihi batas maksimal.', 'warn'); return;
    }

    btn.innerText = 'Memproses foto...';
    const fotoBase64 = await compressImageToBase64(fotoFile);
    if (fotoBase64 && fotoBase64.length > 700000) {
      throw new Error('Ukuran foto masih terlalu besar setelah dikompres. Coba pilih foto lain.');
    }

    btn.innerText = 'Menyimpan...';
    await db.collection('laporan_lembur').add({
      nama, tgl, jenisHari, jamLembur, output, foto: fotoBase64,
      pengajuanId: pid, noSpkl: p.noSpkl || '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert('Laporan lembur berhasil disimpan.');
    e.target.reset();
    document.getElementById('lap-jam-warning')?.classList.add('hidden');
    refreshLaporanSpklOptions();
    showLaporanErrors({});
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
// REKAM SPBY: TABEL LANDSCAPE, EDIT LANGSUNG (SIMPAN OTOMATIS KE FIRESTORE)
// Koleksi 'rekam_spby'. Field tanggal / uraian / nominal tetap dipakai
// untuk metrik & grafik di Beranda.
// ==========================================================================
function ymd(y, m, d) { return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }

const BULAN_PANJANG = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
let spbyDirty = false;
let spbyFilterSpm = ''; // '' = semua, '__none__' = tanpa SPM, selain itu = nomor SPM

function getSPBYView() {
  if (!spbyFilterSpm) return spbyRows;
  if (spbyFilterSpm === '__none__') return spbyRows.filter(r => !(r.spm || '').trim());
  return spbyRows.filter(r => (r.spm || '').trim() === spbyFilterSpm);
}

function refreshSPBYFilterOptions() {
  const list = [...new Set(spbyRows.map(r => (r.spm || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
  const hasNone = spbyRows.some(r => !(r.spm || '').trim());
  if (spbyFilterSpm && spbyFilterSpm !== '__none__' && !list.includes(spbyFilterSpm)) spbyFilterSpm = '';
  const sel = document.getElementById('spby-filter-spm');
  if (sel) {
    const cnt = v => spbyRows.filter(r => (r.spm || '').trim() === v).length;
    sel.innerHTML = `<option value="">Semua No. SPM (${spbyRows.length})</option>` +
      list.map(v => `<option value="${esc(v)}">${esc(v)} (${cnt(v)})</option>`).join('') +
      (hasNone ? `<option value="__none__">Tanpa No. SPM (${spbyRows.filter(r => !(r.spm || '').trim()).length})</option>` : '');
    sel.value = spbyFilterSpm;
  }
  const dl = document.getElementById('spby-spm-list');
  if (dl) dl.innerHTML = list.map(v => `<option value="${esc(v)}"></option>`).join('');
}

function setSPBYFilter(v) {
  spbyFilterSpm = v;
  renderSPBYTable();
  updateSPBYFooter();
}

function spbyText(id, f, val, ph, list) {
  return `<input type="text" data-id="${id}" data-f="${f}" data-t="text" value="${esc(val)}" ${ph ? `placeholder="${ph}"` : ''} ${list ? `list="${list}"` : ''} class="spby-in">`;
}
function spbyNum(id, f, val) {
  return `<input type="number" min="0" step="any" inputmode="decimal" data-id="${id}" data-f="${f}" data-t="num" value="${val ? Number(val) : ''}" placeholder="0" class="spby-in text-right font-mono">`;
}
function spbyDate(id, val, f = 'tanggal') {
  return `<input type="date" data-id="${id}" data-f="${f}" data-t="text" value="${esc(val)}" class="spby-in">`;
}
// Kolom dokumen (Form Permintaan, dst.) kini isian teks manual; nilai boolean lama ditampilkan sebagai "Ya" / kosong
function spbyDocVal(v) { return v === true ? 'Ya' : (v === false || v == null ? '' : String(v)); }

function spbyCheck(id, f, val) {
  return `<input type="checkbox" data-id="${id}" data-f="${f}" data-t="bool" ${val ? 'checked' : ''} class="spby-chk">`;
}

let spbySel = new Set();
function updateSpbySelUI() {
  const b = document.getElementById('btn-pilih-spm');
  if (!b) return;
  b.classList.toggle('hidden', !spbySel.size); b.classList.toggle('flex', !!spbySel.size);
  document.getElementById('spby-sel-count').textContent = spbySel.size;
}
function spbyPick(id, on) { on ? spbySel.add(id) : spbySel.delete(id); updateSpbySelUI(); }
function spbyPickAll(on) {
  getSPBYView().filter(r => !(r.spm || '').trim()).forEach(r => on ? spbySel.add(r.id) : spbySel.delete(r.id));
  renderSPBYTable();
}

function renderSPBYTable() {
  const tbody = document.getElementById('tbody-rekam-spby');
  if (!tbody) return;
  spbyDirty = false;
  const view = getSPBYView();
  if (!view.length) {
    tbody.innerHTML = spbyFilterSpm
      ? '<tr><td colspan="20" class="text-center py-6 text-slate-400">Tidak ada baris untuk filter No. SPM ini.</td></tr>'
      : '<tr><td colspan="20" class="text-center py-6 text-slate-400">Belum ada data. Klik <b>Tambah Baris</b> untuk mulai mengisi.</td></tr>';
    return;
  }
  [...spbySel].forEach(x => { const r = spbyRows.find(y => y.id === x); if (!r || (r.spm || '').trim()) spbySel.delete(x); });
  tbody.innerHTML = view.map((d, i) => {
    const id = d.id;
    const canPick = !(d.spm || '').trim();
    return `<tr>
      <td class="spby-td text-center no-print">${canPick ? `<input type="checkbox" class="spby-chk" ${spbySel.has(id) ? 'checked' : ''} onchange="spbyPick('${id}', this.checked)">` : ''}</td>
      <td class="spby-td text-center text-slate-400 font-semibold">${i + 1}</td>
      <td class="spby-td">${spbyText(id, 'uraian', d.uraian, 'Uraian belanja')}</td>
      <td class="spby-td text-center">${spbyCheck(id, 'spby', d.spby)}</td>
      <td class="spby-td">${spbyText(id, 'spm', d.spm, 'No. SPM', 'spby-spm-list')}</td>
      <td class="spby-td">${spbyDate(id, d.spmTgl, 'spmTgl')}</td>
      <td class="spby-td">${spbyNum(id, 'nominal', d.nominal)}</td>
      <td class="spby-td">${spbyDate(id, d.tanggal)}</td>
      <td class="spby-td">${spbyText(id, 'penyedia', d.penyedia)}</td>
      <td class="spby-td">${spbyNum(id, 'pph', d.pph)}</td>
      <td class="spby-td">${spbyNum(id, 'ppn', d.ppn)}</td>
      <td class="spby-td">${spbyText(id, 'kode', d.kode)}</td>
      <td class="spby-td">${spbyText(id, 'uraianAkun', d.uraianAkun)}</td>
      <td class="spby-td">${spbyText(id, 'npwp', d.npwp)}</td>
      <td class="spby-td">${spbyText(id, 'formPermintaan', spbyDocVal(d.formPermintaan))}</td>
      <td class="spby-td">${spbyText(id, 'inputRealisasiBos', spbyDocVal(d.inputRealisasiBos))}</td>
      <td class="spby-td">${spbyText(id, 'rekapBendaharaBos', spbyDocVal(d.rekapBendaharaBos))}</td>
      <td class="spby-td">${spbyText(id, 'kak', spbyDocVal(d.kak))}</td>
      <td class="spby-td">${spbyText(id, 'keterangan', d.keterangan)}</td>
      <td class="spby-td text-center no-print"><button type="button" data-del="${id}" title="Hapus baris" class="spby-del"><i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i></button></td>
    </tr>`;
  }).join('');
  updateSpbySelUI();
  if (window.lucide) lucide.createIcons();
}

function updateSPBYFooter() {
  const view = getSPBYView();
  const sum = f => view.reduce((a, r) => a + Number(r[f] || 0), 0);
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('spby-total-nominal', rupiah(sum('nominal')));
  set('spby-total-pph', rupiah(sum('pph')));
  set('spby-total-ppn', rupiah(sum('ppn')));
  const done = view.filter(r => r.spby).length;
  const filt = spbyFilterSpm ? ` (dari ${spbyRows.length} baris total)` : '';
  set('spby-count', `${view.length} baris${filt} · ${done} SPBY tercentang`);
}

async function saveSPBYField(id, field, value) {
  const row = spbyRows.find(r => r.id === id);
  if (row) row[field] = value; // cerminkan ke data lokal agar total langsung terhitung
  updateSPBYFooter();
  if (field === 'spm') refreshSPBYFilterOptions();
  try {
    if (row && field === 'spmTgl' && row.spm) { // satu No. SPM = satu Tgl SPM
      const b = db.batch(), ch = spbyRows.filter(r => r.id !== id && (r.spm || '').trim().toLowerCase() === row.spm.trim().toLowerCase() && r.spmTgl !== value);
      ch.forEach(r => { b.set(db.collection('rekam_spby').doc(r.id), { spmTgl: value }, { merge: true }); r.spmTgl = value; });
      if (ch.length) { await b.commit(); renderSPBYTable(); }
    }
    if (row && field === 'spm' && value && !row.spmTgl) {
      const t = spbyRows.find(r => r.id !== id && (r.spm || '').trim().toLowerCase() === value.toLowerCase() && r.spmTgl)?.spmTgl;
      if (t) { row.spmTgl = t; await db.collection('rekam_spby').doc(id).set({ spmTgl: t }, { merge: true }); }
    }
    if (field === 'spm') renderSPBYTable();
  } catch (err) { console.error(err); }
  try {
    await db.collection('rekam_spby').doc(id).set({ [field]: value }, { merge: true });
  } catch (err) {
    console.error(err);
    toast(err.code === 'permission-denied'
      ? 'Ditolak Firestore rules: hanya Bendahara/Operator/Super Admin yang boleh mengubah data SPBY.'
      : 'Gagal menyimpan perubahan. (' + err.message + ')', 'error');
  }
}

const MI = 'w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 outline-none transition';
const modalField = (label, id, input, req) => `<div><label class="block text-xs font-semibold mb-1 text-slate-600">${label}${req ? ' <span class="text-red-500">*</span>' : ''}</label>${input}<p id="err-${id}" class="field-error hidden"></p></div>`;
// Nama file rekap per SPM: "{No SPM}_{bulan}_{tahun}" (bulan/tahun dari Tgl SPM) mis. "25_september_2026".
// Isi file = SEMUA baris ber-No. SPM sama, walau tanggal nota berbeda / lintas bulan.
function spmFileLabel(no, tgl) {
  const m = /^(\d{4})-(\d{2})/.exec(tgl || '');
  return m ? `${no}_${BULAN_PANJANG[+m[2] - 1].toLowerCase()}_${m[1]}` : String(no);
}

// ---------- Tambah Baris (popup) ----------
function openTambahBarisSPBY() {
  const n = new Date(), today = ymd(n.getFullYear(), n.getMonth() + 1, n.getDate());
  const inp = (id, type = 'text', x = '') => `<input type="${type}" id="${id}" ${x} class="${MI}">`;
  const num = id => inp(id, 'number', 'min="0" step="any" placeholder="0"');
  openModal(`<h3 class="modal-title">Tambah Baris SPBY</h3>
    <p class="modal-text">Isi data dasar baris baru. Kolom dokumen (Form Permintaan, KAK, dst.) bisa dilengkapi langsung di tabel.</p>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
      <div class="sm:col-span-2">${modalField('Uraian', 'tb-uraian', inp('tb-uraian', 'text', 'placeholder="Uraian belanja"'), true)}</div>
      ${modalField('No. SPM', 'tb-spm', inp('tb-spm', 'text', 'list="spby-spm-list" placeholder="Boleh dikosongkan" onchange="tbSpmChanged()"'))}
      ${modalField('Tanggal SPM', 'tb-spm-tgl', inp('tb-spm-tgl', 'date'))}
      ${modalField('Tanggal Nota', 'tb-tanggal', inp('tb-tanggal', 'date', `value="${today}"`), true)}
      ${modalField('Nominal (Rp)', 'tb-nominal', num('tb-nominal'))}
      ${modalField('Penyedia', 'tb-penyedia', inp('tb-penyedia'))}
      ${modalField('NPWP', 'tb-npwp', inp('tb-npwp'))}
      ${modalField('PPh (Rp)', 'tb-pph', num('tb-pph'))}
      ${modalField('PPN (Rp)', 'tb-ppn', num('tb-ppn'))}
      <div class="sm:col-span-2">${modalField('Kode Program / Output / Komponen / Akun', 'tb-kode', inp('tb-kode'))}</div>
      ${modalField('Uraian Akun', 'tb-uraianAkun', inp('tb-uraianAkun'))}
      ${modalField('Keterangan', 'tb-keterangan', inp('tb-keterangan'))}
      <label class="sm:col-span-2 flex items-center gap-2 text-xs text-slate-600 cursor-pointer"><input type="checkbox" id="tb-spby" class="spby-chk"> SPBY sudah ada</label>
    </div>
    <div class="flex gap-2 justify-end mt-5"><button data-modal-close class="btn-ghost">Batal</button><button type="button" onclick="simpanBarisSPBY()" class="bg-blue-800 hover:bg-blue-900 text-white text-xs px-4 py-2 rounded-xl font-bold">Simpan Baris</button></div>`, true);
  setTimeout(() => document.getElementById('tb-uraian')?.focus(), 80);
}

function tbSpmChanged() {
  const no = document.getElementById('tb-spm').value.trim().toLowerCase();
  const t = spbyRows.find(r => no && (r.spm || '').trim().toLowerCase() === no && r.spmTgl)?.spmTgl;
  const el = document.getElementById('tb-spm-tgl');
  if (t && el && !el.value) el.value = t;
}

async function simpanBarisSPBY() {
  const user = firebase.auth().currentUser;
  if (!user) { toast('Sesi login habis, silakan login ulang.', 'warn'); return; }
  const g = id => document.getElementById(id).value.trim();
  const n = id => Number(document.getElementById(id).value) || 0;
  const spm = g('tb-spm'), spmTgl = g('tb-spm-tgl');
  const errs = {};
  if (!g('tb-uraian')) errs['tb-uraian'] = 'Uraian wajib diisi.';
  if (!g('tb-tanggal')) errs['tb-tanggal'] = 'Tanggal nota wajib diisi.';
  if (spm && !spmTgl) errs['tb-spm-tgl'] = 'Tanggal SPM wajib diisi jika No. SPM terisi.';
  ['tb-uraian', 'tb-tanggal', 'tb-spm-tgl'].forEach(id => setFieldError(id, errs[id] || ''));
  if (Object.keys(errs).length) { toast('Lengkapi data yang wajib diisi.', 'warn'); return; }
  try {
    if (spm) {
      const b = db.batch(), ch = spbyRows.filter(r => (r.spm || '').trim().toLowerCase() === spm.toLowerCase() && r.spmTgl !== spmTgl);
      ch.forEach(r => b.set(db.collection('rekam_spby').doc(r.id), { spmTgl }, { merge: true }));
      if (ch.length) { await b.commit(); ch.forEach(r => { r.spmTgl = spmTgl; }); }
    }
    await db.collection('rekam_spby').doc().set({
      uraian: g('tb-uraian'), nominal: n('tb-nominal'), tanggal: g('tb-tanggal'),
      spby: document.getElementById('tb-spby').checked, spm, spmTgl: spm ? spmTgl : '',
      penyedia: g('tb-penyedia'), pph: n('tb-pph'), ppn: n('tb-ppn'), kode: g('tb-kode'), uraianAkun: g('tb-uraianAkun'), npwp: g('tb-npwp'),
      formPermintaan: '', inputRealisasiBos: '', rekapBendaharaBos: '', kak: '', keterangan: g('tb-keterangan'),
      urut: Date.now(), uploadedBy: user.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    closeModal();
    toast('Baris SPBY berhasil ditambahkan.', 'success');
  } catch (err) {
    console.error(err);
    toast(err.code === 'permission-denied'
      ? 'Ditolak Firestore rules: akun ini belum punya role Bendahara/Operator/Super Admin.'
      : 'Gagal menambah baris. (' + err.message + ')', 'error');
  }
}

// ---------- Input SPM: centang banyak uraian/nota dalam 1 No. SPM + 1 tanggal ----------
let ispmSel = new Set();
function ispmCtx() {
  const no = (document.getElementById('ispm-no')?.value || '').trim();
  const tgl = document.getElementById('ispm-tgl')?.value || '';
  const q = (document.getElementById('ispm-cari')?.value || '').toLowerCase();
  const elig = r => { const x = (r.spm || '').trim().toLowerCase(); return !x || x === no.toLowerCase(); };
  const rows = spbyRows.filter(r => !q || `${r.uraian} ${r.penyedia} ${r.spm}`.toLowerCase().includes(q)).sort((a, b) => (elig(a) ? 0 : 1) - (elig(b) ? 0 : 1));
  return { no, tgl, q, elig, rows };
}

function openInputSPM(fromSel) {
  if (fromSel && !spbySel.size) { toast('Centang dulu baris yang mau dimasukkan ke SPM.', 'warn'); return; }
  ispmSel = new Set(fromSel ? [...spbySel] : []);
  openModal(`<h3 class="modal-title">Input SPM</h3>
    <p class="modal-text">Isi No. SPM &amp; tanggal SPM, lalu centang uraian/nota yang masuk ke SPM ini (tanggal nota boleh berbeda, lintas bulan pun bisa). Nama file rekap: <span class="font-mono font-semibold text-slate-700" id="ispm-file">-</span></p>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
      ${modalField('No. SPM', 'ispm-no', `<input type="text" id="ispm-no" list="spby-spm-list" placeholder="Nomor SPM" oninput="renderInputSPM()" onchange="ispmNoChanged()" class="${MI}">`, true)}
      ${modalField('Tanggal SPM', 'ispm-tgl', `<input type="date" id="ispm-tgl" oninput="renderInputSPM()" class="${MI}">`, true)}
    </div>
    <div class="flex items-center gap-2 mt-4">
      <input type="text" id="ispm-cari" placeholder="Cari uraian / penyedia..." oninput="renderInputSPM()" class="${MI}">
      <button type="button" class="btn-ghost whitespace-nowrap" onclick="ispmToggleAll()">Pilih / lepas semua</button>
    </div>
    <p id="err-ispm-rows" class="field-error hidden"></p>
    <div id="ispm-list" class="mt-2 max-h-[42vh] overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100"></div>
    <p id="ispm-sum" class="text-xs text-slate-500 mt-2"></p>
    <div class="flex gap-2 justify-end mt-4"><button data-modal-close class="btn-ghost">Batal</button><button type="button" onclick="simpanInputSPM()" class="bg-blue-800 hover:bg-blue-900 text-white text-xs px-4 py-2 rounded-xl font-bold">Simpan SPM</button></div>`, true);
  renderInputSPM();
}

function renderInputSPM() {
  const box = document.getElementById('ispm-list');
  if (!box) return;
  const { no, tgl, elig, rows } = ispmCtx();
  const f = document.getElementById('ispm-file'); if (f) f.textContent = no ? spmFileLabel(no, tgl) : '-';
  [...ispmSel].forEach(id => { const r = spbyRows.find(x => x.id === id); if (!r || !elig(r)) ispmSel.delete(id); });
  box.innerHTML = rows.length ? rows.map(r => { const ok = elig(r); return `
    <label class="flex items-start gap-3 px-3 py-2 text-xs ${ok ? 'cursor-pointer hover:bg-slate-50' : 'opacity-50'}">
      <input type="checkbox" class="spby-chk mt-0.5" ${ok ? '' : 'disabled'} ${ispmSel.has(r.id) ? 'checked' : ''} onchange="ispmToggle('${r.id}', this.checked)">
      <span class="min-w-0 flex-1"><span class="block font-semibold text-slate-800">${esc(r.uraian || '(tanpa uraian)')}</span><span class="block text-slate-400">${esc(r.tanggal || '-')} · ${esc(r.penyedia || '-')} · ${rupiah(r.nominal)}</span></span>
      ${r.spm ? `<span class="status-badge ${ok ? 'status-done' : 'status-neutral'} shrink-0">SPM ${esc(r.spm)}</span>` : ''}
    </label>`; }).join('') : '<p class="text-center text-slate-400 py-6 text-xs">Tidak ada baris.</p>';
  const tot = spbyRows.filter(r => ispmSel.has(r.id)).reduce((a, r) => a + Number(r.nominal || 0), 0);
  document.getElementById('ispm-sum').textContent = `${ispmSel.size} baris dipilih · total ${rupiah(tot)}. Baris yang sudah masuk SPM lain tidak bisa dipilih.`;
}

function ispmNoChanged() { // No. SPM sudah ada -> muat baris & tanggalnya agar bisa diedit
  const { no } = ispmCtx();
  const same = no ? spbyRows.filter(r => (r.spm || '').trim().toLowerCase() === no.toLowerCase()) : [];
  ispmSel = new Set(same.map(r => r.id));
  const t = same.find(r => r.spmTgl)?.spmTgl, el = document.getElementById('ispm-tgl');
  if (t && el) el.value = t;
  renderInputSPM();
}
function ispmToggle(id, on) { on ? ispmSel.add(id) : ispmSel.delete(id); renderInputSPM(); }
function ispmToggleAll() {
  const { elig, rows } = ispmCtx();
  const vis = rows.filter(elig);
  const all = vis.length && vis.every(r => ispmSel.has(r.id));
  vis.forEach(r => all ? ispmSel.delete(r.id) : ispmSel.add(r.id));
  renderInputSPM();
}

async function simpanInputSPM() {
  const { no, tgl } = ispmCtx();
  const errs = { 'ispm-no': no ? '' : 'No. SPM wajib diisi.', 'ispm-tgl': tgl ? '' : 'Tanggal SPM wajib dipilih.', 'ispm-rows': ispmSel.size ? '' : 'Centang minimal satu uraian/nota.' };
  Object.entries(errs).forEach(([k, m]) => setFieldError(k, m));
  if (Object.values(errs).some(Boolean)) { toast('Lengkapi No. SPM, tanggal, dan pilih uraian/nota.', 'warn'); return; }
  const batch = db.batch(), changes = [];
  spbyRows.forEach(r => {
    const ref = db.collection('rekam_spby').doc(r.id);
    if (ispmSel.has(r.id)) { batch.set(ref, { spm: no, spmTgl: tgl }, { merge: true }); changes.push([r, no, tgl]); }
    else if ((r.spm || '').trim().toLowerCase() === no.toLowerCase()) { batch.set(ref, { spm: '', spmTgl: '' }, { merge: true }); changes.push([r, '', '']); }
  });
  try {
    await batch.commit();
    changes.forEach(([r, a, b]) => { r.spm = a; r.spmTgl = b; });
    closeModal();
    spbySel = new Set();
    refreshSPBYFilterOptions(); renderSPBYTable(); updateSPBYFooter();
    toast(`SPM ${no} tersimpan (${ispmSel.size} baris). File rekap: ${spmFileLabel(no, tgl)}`, 'success');
  } catch (err) {
    console.error(err);
    toast(err.code === 'permission-denied' ? 'Ditolak Firestore rules: hanya Bendahara/Operator/Super Admin yang boleh mengubah data SPBY.' : 'Gagal menyimpan SPM. (' + err.message + ')', 'error');
  }
}

async function deleteSPBYRow(id) {
  if (!await confirmModal('Hapus baris SPBY?', 'Baris ini akan dihapus permanen dan tidak ikut dihitung di Beranda.', 'Ya, hapus')) return;
  try {
    await db.collection('rekam_spby').doc(id).delete();
    toast('Baris SPBY dihapus.', 'success');
  } catch (err) {
    toast(err.code === 'permission-denied' ? 'Ditolak: akun ini tidak diizinkan menghapus baris.' : 'Gagal menghapus baris. (' + err.message + ')', 'error');
  }
}

// Tombol "Simpan Data": pastikan semua isian (termasuk yang masih diketik) terkirim & terkonfirmasi server
async function simpanDataSPBY() {
  const btn = document.getElementById('btn-simpan-spby');
  const label = btn ? btn.querySelector('span') : null;
  if (btn) btn.disabled = true;
  if (label) label.textContent = 'Menyimpan...';
  try {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); // memicu simpan isian terakhir
    await new Promise(r => setTimeout(r, 150));
    await Promise.race([
      db.waitForPendingWrites(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000))
    ]);
    toast(`Data SPBY berhasil disimpan (${spbyRows.length} baris).`, 'success');
  } catch (err) {
    toast(err.message === 'timeout'
      ? 'Penyimpanan belum terkonfirmasi server, periksa koneksi internet lalu coba lagi.'
      : 'Gagal menyimpan data. (' + err.message + ')', 'error');
  } finally {
    if (btn) btn.disabled = false;
    if (label) label.textContent = 'Simpan Data';
  }
}

function printSPBY() {
  document.body.classList.add('printing-spby');
  const done = () => { document.body.classList.remove('printing-spby'); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  window.print();
}

// Delegasi event tabel (dipasang sekali)
window.addEventListener('DOMContentLoaded', () => {
  const tbody = document.getElementById('tbody-rekam-spby');
  if (!tbody) return;
  tbody.addEventListener('change', e => {
    const el = e.target.closest('[data-f]');
    if (!el) return;
    let v;
    if (el.dataset.t === 'bool') v = el.checked;
    else if (el.dataset.t === 'num') v = el.value === '' ? 0 : Number(el.value) || 0;
    else v = el.value.trim();
    saveSPBYField(el.dataset.id, el.dataset.f, v);
  });
  tbody.addEventListener('click', e => {
    const b = e.target.closest('[data-del]');
    if (b) deleteSPBYRow(b.dataset.del);
  });
  tbody.addEventListener('focusout', () => {
    setTimeout(() => { if (spbyDirty && !tbody.contains(document.activeElement)) renderSPBYTable(); }, 50);
  });
});

// ==========================================================================
// EXPORT EXCEL REKAP BULANAN SPBY (pilih bulan -> unduh .xlsx)
// ==========================================================================
function spbyRowsByMonth(mi) { // mi: 0-11, atau -1 untuk semua bulan
  const prefix = mi >= 0 ? `${TAHUN_ANGGARAN}-${String(mi + 1).padStart(2, '0')}` : `${TAHUN_ANGGARAN}-`;
  return spbyRows.filter(r => (r.tanggal || '').startsWith(prefix))
    .sort((a, b) => (a.tanggal || '').localeCompare(b.tanggal || '') || (a._urut - b._urut));
}

// Kelompokkan baris SPBY per No. SPM (satu SPM = satu file, tanggal nota boleh beda-beda).
// Bulan/tahun file = Tgl SPM yang paling sering dipakai; data lama tanpa Tgl SPM memakai bulan nota paling awal.
function spbySpmMonthGroups() {
  const groups = {};
  spbyRows.forEach(r => {
    const spm = (r.spm || '').trim();
    if (!spm) return;
    (groups[spm.toLowerCase()] = groups[spm.toLowerCase()] || { spm, rows: [] }).rows.push(r);
  });
  return Object.values(groups).map(g => {
    const cnt = {};
    g.rows.forEach(r => { if (/^\d{4}-\d{2}/.test(r.spmTgl || '')) cnt[r.spmTgl] = (cnt[r.spmTgl] || 0) + 1; });
    let tgl = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a] || b.localeCompare(a))[0];
    if (!tgl) tgl = g.rows.map(r => r.tanggal || '').filter(t => /^\d{4}-\d{2}/.test(t)).sort()[0];
    if (!tgl) return null;
    g.year = +tgl.slice(0, 4); g.mi = +tgl.slice(5, 7) - 1; g.tgl = tgl;
    g.rows.sort((a, b) => (a.tanggal || '').localeCompare(b.tanggal || '') || (a._urut - b._urut));
    return g;
  }).filter(Boolean).sort((a, b) => (b.year - a.year) || (b.mi - a.mi) || a.spm.localeCompare(b.spm, 'id', { numeric: true }));
}

function spbyGroupFileLabel(g) { return spmFileLabel(g.spm, g.tgl); }

function openExportSPBY() {
  if (typeof XLSX === 'undefined') { toast('Library Excel belum termuat, coba refresh halaman.', 'error'); return; }
  const groups = spbySpmMonthGroups();
  const groupOpts = groups.map((g, i) =>
    `<option value="spm:${i}">${esc(spbyGroupFileLabel(g))}  —  ${g.rows.length} baris</option>`
  ).join('');

  const now = new Date();
  const defMi = now.getFullYear() === TAHUN_ANGGARAN ? now.getMonth() : 0;
  const monthOpts = BULAN_PANJANG.map((b, i) => `<option value="month:${i}" ${i === defMi ? 'selected' : ''}>${b} ${TAHUN_ANGGARAN} — semua baris (${spbyRowsByMonth(i).length} baris)</option>`).join('');

  openModal(`
    <h3 class="modal-title">Export Excel SPBY</h3>
    <p class="modal-text">Pilih file yang mau diunduh. Nama file mengikuti No. SPM &amp; Tgl SPM, misalnya <span class="font-mono">25_september_2026</span> (atur lewat tombol <b>Input SPM</b>); satu file berisi semua nota ber-SPM sama walau tanggalnya berbeda. Hanya baris yang sudah diisi No. SPM yang muncul di daftar ini.</p>
    <select id="export-spby-pilihan" class="w-full mt-4 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 outline-none transition">
      ${groups.length ? `<optgroup label="Per No. SPM (nama file otomatis)">${groupOpts}</optgroup>` : ''}
      <optgroup label="Rekap bulanan penuh (semua baris, termasuk tanpa No. SPM)">${monthOpts}
        <option value="month:-1">Semua bulan ${TAHUN_ANGGARAN} (${spbyRowsByMonth(-1).length} baris)</option>
      </optgroup>
    </select>
    ${!groups.length ? '<p class="text-[11px] text-slate-400 mt-2">Belum ada baris dengan No. SPM terisi, jadi baru tersedia rekap bulanan penuh.</p>' : ''}
    <div class="flex gap-2 justify-end mt-5">
      <button data-modal-close class="btn-ghost">Batal</button>
      <button type="button" onclick="doExportSPBY()" class="bg-blue-800 hover:bg-blue-900 text-white text-xs px-4 py-2 rounded-xl font-bold">Export Excel</button>
    </div>`);
}

function buildSPBYSheet(rows, title) {
  const yn = v => v ? 'Ya' : '-';
  const sum = (arr, f) => arr.reduce((a, r) => a + Number(r[f] || 0), 0);
  const head = ['No', 'Uraian', 'SPBY', 'No. SPM', 'Tgl SPM', 'Nominal', 'Tanggal', 'Penyedia', 'PPh', 'PPN',
    'Kode Program/Output/Komponen/Akun', 'Uraian Akun', 'NPWP', 'Form Permintaan', 'Input Realisasi BOS',
    'Rekap Bendahara BOS', 'KAK', 'Keterangan'];
  const aoa = [
    [title],
    ['BPS Kota Kotamobagu'],
    [],
    head,
    ...rows.map((r, i) => [i + 1, r.uraian || '', yn(r.spby), r.spm || '', r.spmTgl || '', Number(r.nominal || 0), r.tanggal || '',
      r.penyedia || '', Number(r.pph || 0), Number(r.ppn || 0), r.kode || '', r.uraianAkun || '', r.npwp || '',
      spbyDocVal(r.formPermintaan), spbyDocVal(r.inputRealisasiBos), spbyDocVal(r.rekapBendaharaBos), spbyDocVal(r.kak), r.keterangan || '']),
    ['', 'TOTAL', '', '', '', sum(rows, 'nominal'), '', '', sum(rows, 'pph'), sum(rows, 'ppn')]
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: head.length - 1 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: head.length - 1 } }];
  ws['!cols'] = [6, 42, 7, 18, 13, 16, 12, 24, 14, 14, 34, 28, 22, 12, 12, 12, 7, 28].map(wch => ({ wch }));
  const last = aoa.length - 1;
  for (let r = 4; r <= last; r++) [5, 8, 9].forEach(c => {
    const cell = ws[XLSX.utils.encode_cell({ r, c })];
    if (cell) cell.z = '#,##0';
  });
  return ws;
}

function doExportSPBY() {
  const val = document.getElementById('export-spby-pilihan').value;
  const wb = XLSX.utils.book_new();

  if (val.startsWith('spm:')) {
    // -------- Export per No. SPM + bulan (nama file: {spm}_{bulan}_{tahun}) --------
    const g = spbySpmMonthGroups()[Number(val.slice(4))];
    if (!g || !g.rows.length) { toast('Data untuk pilihan ini tidak ditemukan.', 'warn'); return; }
    const periode = `${BULAN_PANJANG[g.mi]} ${g.year}`;
    const ws = buildSPBYSheet(g.rows, `SPBY NO. SPM ${g.spm} - ${periode.toUpperCase()}`);
    XLSX.utils.book_append_sheet(wb, ws, 'Rincian SPBY');
    const filename = `${spbyGroupFileLabel(g).replace(/[\\/:*?"<>|]+/g, '-')}.xlsx`;
    XLSX.writeFile(wb, filename);
    closeModal();
    toast(`File ${filename} berhasil diunduh (${g.rows.length} baris).`, 'success');
    return;
  }

  // -------- Rekap bulanan penuh (semua baris, cara lama) --------
  const mi = Number(val.slice(6));
  const rows = spbyRowsByMonth(mi);
  if (!rows.length) { toast('Tidak ada data SPBY pada periode yang dipilih.', 'warn'); return; }
  const periode = mi >= 0 ? `${BULAN_PANJANG[mi]} ${TAHUN_ANGGARAN}` : `Tahun ${TAHUN_ANGGARAN}`;
  const sum = (arr, f) => arr.reduce((a, r) => a + Number(r[f] || 0), 0);
  const ws = buildSPBYSheet(rows, `REKAP SPBY BENDAHARA - ${periode.toUpperCase()}`);
  XLSX.utils.book_append_sheet(wb, ws, 'Rincian SPBY');

  const groups = {};
  rows.forEach(r => { const k = (r.spm || '').trim() || '(Tanpa No. SPM)'; (groups[k] = groups[k] || []).push(r); });
  const keys = Object.keys(groups).sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
  const aoa2 = [[`REKAP PER NO. SPM - ${periode.toUpperCase()}`], [],
    ['No', 'No. SPM', 'Jumlah Baris', 'SPBY Tercentang', 'Total Nominal', 'Total PPh', 'Total PPN'],
    ...keys.map((k, i) => [i + 1, k, groups[k].length, groups[k].filter(r => r.spby).length, sum(groups[k], 'nominal'), sum(groups[k], 'pph'), sum(groups[k], 'ppn')]),
    ['', 'TOTAL', rows.length, rows.filter(r => r.spby).length, sum(rows, 'nominal'), sum(rows, 'pph'), sum(rows, 'ppn')]
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(aoa2);
  ws2['!cols'] = [6, 26, 14, 16, 18, 16, 16].map(wch => ({ wch }));
  for (let r = 3; r < aoa2.length; r++) [4, 5, 6].forEach(c => {
    const cell = ws2[XLSX.utils.encode_cell({ r, c })];
    if (cell) cell.z = '#,##0';
  });
  XLSX.utils.book_append_sheet(wb, ws2, 'Rekap per SPM');
  const filename = `KIBATA_Rekap_SPBY_${periode.replace(/\s+/g, '_')}.xlsx`;
  XLSX.writeFile(wb, filename);
  closeModal();
  toast(`Rekap SPBY ${periode} berhasil diunduh (${rows.length} baris).`, 'success');
}

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
  const tbody = document.getElementById('tbody-rekam-spby');

  db.collection('rekam_spby').onSnapshot(snapshot => {
    const rows = [];
    let total = 0, count = 0;
    const bulanan = Array(12).fill(0);

    snapshot.forEach(doc => {
      const d = doc.data();
      d.id = doc.id;
      const nom = Number(d.nominal || 0);
      const ts = d.createdAt && d.createdAt.toMillis ? d.createdAt.toMillis() : 0;
      d._urut = typeof d.urut === 'number' ? d.urut : ts;
      rows.push(d);
      const m = /^(\d{4})-(\d{2})/.exec(d.tanggal || '');
      if (m && +m[1] === TAHUN_ANGGARAN) { bulanan[+m[2] - 1] += nom; total += nom; if (nom > 0) count++; }
    });
    // urutan tetap sesuai waktu input (data lama tanpa 'urut' memakai waktu simpan, lalu tanggal)
    rows.sort((a, b) => (a._urut - b._urut) || (a.tanggal || '').localeCompare(b.tanggal || ''));
    spbyRows = rows;
    refreshSPBYFilterOptions();
    updateSPBYFooter();
    updateSPBYSummary(total, bulanan, count);

    // Jangan render ulang saat pengguna sedang mengetik / gema dari tulisan sendiri,
    // kecuali ada baris yang ditambah atau dihapus.
    const structural = snapshot.docChanges().some(c => c.type !== 'modified');
    const typing = tbody && tbody.contains(document.activeElement);
    if (!structural && (snapshot.metadata.hasPendingWrites || typing)) {
      if (typing && !snapshot.metadata.hasPendingWrites) spbyDirty = true;
      return;
    }
    renderSPBYTable();
  }, err => {
    console.error('Gagal memuat rekam_spby:', err);
    if (tbody) tbody.innerHTML = '<tr><td colspan="20" class="text-center py-6 text-red-400">Gagal memuat data (cek Firestore rules).</td></tr>';
  });
}

function subscribeLembur() {
  const gal = document.getElementById('beranda-galeri-lembur');
  db.collection('laporan_lembur').orderBy('createdAt', 'desc').limit(100).onSnapshot(s => {
    listLaporanLembur = s.docs.map(d => ({ id: d.id, ...d.data() }));
    const imgs = listLaporanLembur.filter(d => safeImg(d.foto)).slice(0, 6);
    if (gal) gal.innerHTML = imgs.length ? imgs.map(d => `<img src="${safeImg(d.foto)}" onclick="openImageModal(this.src, '${esc(d.nama || '-')} · ${esc(d.tgl || '-')}', '${esc((d.jamLembur ? d.jamLembur + ' jam (' + (d.jenisHari || '-') + ') — ' : '') + (d.output || '')).replace(/'/g, '&#39;')}')" class="w-full h-20 object-cover rounded-lg cursor-pointer hover:opacity-90 transition">`).join('') : '<p class="col-span-3">Belum ada foto. Lihat semua di menu Dokumentasi.</p>';
    renderDokumentasiLembur();
    renderMonitoringLembur();
  }, err => console.error('Gagal memuat laporan_lembur:', err));
}

function subscribePengajuanLembur() {
  db.collection('pengajuan_lembur').orderBy('createdAt', 'desc').limit(100).onSnapshot(s => {
    listPengajuanLembur = s.docs.map(d => ({ id: d.id, ...d.data() }));
    renderMonitoringLembur();
    refreshLaporanSpklOptions();
  }, err => console.error('Gagal memuat pengajuan_lembur:', err));
}

// Cocokkan laporan realisasi untuk satu peserta dalam rentang tanggal pengajuan
// (tglMulai s/d tglMulai + durasiHari dibulatkan ke atas, dikurangi 1 hari)
function cariLaporanUntukPeserta(nama, p) {
  if (!nama || !p) return null;
  const { start, end } = lemburRange(p);
  // laporan baru terikat ke SPKL (pengajuanId); laporan lama dicocokkan lewat rentang tanggal
  return listLaporanLembur.find(l => l.nama === nama && (l.pengajuanId ? l.pengajuanId === p.id : (!start || (l.tgl >= start && l.tgl <= end)))) || null;
}

function renderMonitoringLembur() {
  const tbody = document.getElementById('tbody-monitoring-lembur');
  if (!tbody) return; // halaman belum aktif, skip render

  if (!listPengajuanLembur.length) {
    tbody.innerHTML = '<tr><td colspan="10" class="text-center py-6 text-slate-400">Belum ada pengajuan lembur.</td></tr>';
    const belumEl = document.getElementById('monitoring-lembur-belum');
    if (belumEl) belumEl.textContent = '0';
    return;
  }

  let no = 0, belumCount = 0;
  const html = [];
  listPengajuanLembur.forEach(p => {
    const pesertaSet = Array.from(new Set([p.ketua, ...(Array.isArray(p.peserta) ? p.peserta : [])].filter(Boolean)));
    if (!pesertaSet.length) pesertaSet.push('(tanpa peserta)');
    pesertaSet.forEach((nama, idx) => {
      no++;
      const lap = cariLaporanUntukPeserta(nama, p);
      const sudah = !!lap;
      if (!sudah) belumCount++;
      html.push(`
        <tr class="hover:bg-slate-50">
          <td class="px-3 py-2 text-center">${no}</td>
          ${idx === 0 ? `
          <td class="px-3 py-2 font-mono text-[11px]" rowspan="${pesertaSet.length}">${esc(p.noSpkl || '-')}</td>
          <td class="px-3 py-2 font-semibold text-slate-800" rowspan="${pesertaSet.length}">${esc(p.ketua || '-')}</td>
          <td class="px-3 py-2" rowspan="${pesertaSet.length}">${esc(p.tglMulai || '-')}</td>
          <td class="px-3 py-2" rowspan="${pesertaSet.length}">${esc(p.perihal || '-')}</td>` : ''}
          <td class="px-3 py-2">${esc(nama)}</td>
          <td class="px-3 py-2">${esc(lap?.tgl || '-')}</td>
          <td class="px-3 py-2">${lap?.jamLembur ? esc(lap.jamLembur) + ' jam (' + esc(lap.jenisHari || '-') + ')' : '-'}</td>
          <td class="px-3 py-2 max-w-[16rem] truncate" title="${esc(lap?.output || '')}">${esc(lap?.output || '-')}</td>
          <td class="px-3 py-2 text-center">${safeImg(lap?.foto) ? `<img src="${safeImg(lap.foto)}" onclick="openImageModal(this.src, '${esc(nama)} · ${esc(lap.tgl || '-')}', '${esc((lap.jamLembur ? lap.jamLembur + ' jam (' + (lap.jenisHari || '-') + ') — ' : '') + (lap.output || '')).replace(/'/g, '&#39;')}')" class="w-10 h-10 object-cover rounded cursor-pointer hover:opacity-80 transition mx-auto">` : '-'}</td>
          <td class="px-3 py-2 text-center">${statusBadge(sudah ? 'Sudah Lapor' : 'Belum Lapor')}</td>
        </tr>
      `);
    });
  });
  tbody.innerHTML = html.join('');
  const belumEl = document.getElementById('monitoring-lembur-belum');
  if (belumEl) belumEl.textContent = belumCount;
  if (window.lucide) lucide.createIcons();
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
async function handleResetSPBY() {
  if (!await confirmModal('Hapus semua data SPBY?', 'Semua data SPBY tersimpan akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.', 'Ya, hapus semua')) return;
  try {
    const snap = await db.collection('rekam_spby').get();
    for (let i = 0; i < snap.docs.length; i += 400) {
      const b = db.batch();
      snap.docs.slice(i, i + 400).forEach(d => b.delete(d.ref));
      await b.commit();
    }
    toast(`${snap.size} data SPBY dihapus.`, 'success');
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
  const boxContoh = document.getElementById('contoh-arsip-' + kat);
  const info = html => { if (box) box.innerHTML = html; if (boxContoh) boxContoh.innerHTML = html; };
  if (!box && !boxContoh) return;
  if (!ARSIP_API_URL) { info('<p class="text-amber-600 col-span-full">Koneksi Google Drive belum dikonfigurasi (isi ARSIP_API_URL di script.js).</p>'); return; }
  try {
    const r = await fetch(`${ARSIP_API_URL}?kategori=${kat}`);
    const text = await r.text();
    let j;
    try { j = JSON.parse(text); }
    catch { throw new Error('Respons Apps Script bukan JSON (kemungkinan deployment belum "Anyone" atau URL salah).'); }
    if (j.error) throw new Error(j.error);
    // File berawalan "CONTOH_" = contoh file (ditandai lewat checkbox saat upload)
    const isContoh = f => /^contoh[\s_-]/i.test(f.name || '');
    const card = (f, dl) => `
      <div class="file-card">
        <div class="min-w-0">
          <p class="font-bold text-slate-800 truncate">${esc(f.name.replace(/^contoh[\s_-]+/i, dl ? '' : ''))}</p>
          <p class="text-[11px] text-slate-400">${esc((f.date || '').slice(0, 10))}</p>
        </div>
        <div class="flex gap-2 shrink-0">
          ${dl ? `<a href="https://drive.google.com/uc?export=download&id=${encodeURIComponent(f.id)}" target="_blank" rel="noopener" class="btn-ghost">Unduh</a>` : ''}
          <button data-id="${esc(f.id)}" data-name="${esc(f.name)}" onclick="openPdfModal(this.dataset.id, this.dataset.name)" class="file-open">Buka</button>
        </div>
      </div>`;
    const biasa = j.files.filter(f => !isContoh(f)), contoh = j.files.filter(isContoh);
    if (box) box.innerHTML = biasa.length ? biasa.map(f => card(f, false)).join('') : '<p class="text-slate-400 col-span-full">Belum ada file.</p>';
    if (boxContoh) boxContoh.innerHTML = contoh.length ? contoh.map(f => card(f, true)).join('') : '<p class="text-xs text-slate-400">Belum ada contoh file. Upload file lalu centang <b>Jadikan contoh file</b>.</p>';
  } catch (err) {
    console.error('Gagal memuat arsip ' + kat, err);
    info(`<p class="text-red-500 col-span-full">Gagal memuat file dari Drive. (${esc(err.message)})</p>`);
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
    const asContoh = form.querySelector('[data-f="contoh"]')?.checked;
    const uploadName = asContoh && !/^contoh[\s_-]/i.test(file.name) ? 'CONTOH_' + file.name : file.name;
    const r = await fetch(ARSIP_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ kategori: kat, name: uploadName, mime: file.type || 'application/octet-stream', data: dataUrl.split(',')[1] })
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