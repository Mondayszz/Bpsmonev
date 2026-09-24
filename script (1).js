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

window.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    lucide.createIcons();
  }
  populatePegawaiDropdowns();
  initCharts();
  subscribeRealtimeData();
  subscribeUsersRealtime();
  subscribeRekamSPBY();
  subscribeArsip('SK');
  subscribeArsip('KAK');
  subscribeArsip('SPM');
});

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
          <input type="checkbox" name="chk-peserta-lembur" value="${nama}" class="rounded text-orange-600 focus:ring-orange-500 w-4 h-4">
          <span class="text-slate-700 font-medium">${nama}</span>
        </label>
      `;
    });
  }
}

function navigateTo(pageId) {
  document.querySelectorAll('.page-view').forEach(p => p.classList.add('hidden'));
  const target = document.getElementById(pageId);
  if (target) {
    target.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function toggleSubmenu(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('hidden');
}

function convertFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

function initCharts() {
  const ctxKinerja = document.getElementById('chartKinerjaAnggaran')?.getContext('2d');
  if (ctxKinerja) {
    new Chart(ctxKinerja, {
      type: 'doughnut',
      data: {
        labels: ['Kinerja Perencanaan', 'Kinerja Pelaksanaan'],
        datasets: [{ data: [45, 55], backgroundColor: ['#3b82f6', '#4f46e5'], borderWidth: 2 }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  const ctxRealisasi = document.getElementById('chartPaguRealisasi')?.getContext('2d');
  if (ctxRealisasi) {
    new Chart(ctxRealisasi, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
        datasets: [
          { label: 'Pagu Anggaran', data: [1.2, 2.5, 3.8, 4.5, 5.0, 5.8, 6.2, 7.5, 8.2, 11.5, 9.8, 6.5], borderColor: '#3b82f6', fill: true },
          { label: 'Realisasi', data: [1.0, 2.2, 3.5, 4.1, 4.8, 5.2, 5.9, 7.0, 7.9, 11.0, 9.2, 5.8], borderColor: '#f59e0b', fill: true }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
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
              <td class="px-4 py-3 font-semibold text-slate-800">${b.smPembuat || '-'} <br><span class="text-xs text-slate-400 font-mono">${b.smNoMemo || '-'}</span></td>
              <td class="px-4 py-3">${b.smUraian || '-'}</td>
              <td class="px-4 py-3"><span class="px-2 py-0.5 bg-orange-100 text-orange-800 rounded text-xs font-medium">${b.statusPosisi || 'SM'}</span></td>
              <td class="px-4 py-3 text-xs">Penyerahan: ${b.smTglPenyerahan || '-'}</td>
              <td class="px-4 py-3 text-xs italic">${b.ppkCatatan || '-'}</td>
            </tr>
          `;
        }
      });
    }

    populateBerkasDropdown('ppk-select-berkas', listBerkas.filter(b => b.statusPosisi === 'SM'));
    populateBerkasDropdown('ppspm-select-berkas', listBerkas.filter(b => b.statusPosisi === 'PPK'));
    populateBerkasDropdown('bendahara-select-berkas', listBerkas.filter(b => b.statusPosisi === 'PPSPM'));
  });
}

// ISI DROPDOWN "PILIH BERKAS MASUK" SESUAI TAHAP MASING-MASING
function populateBerkasDropdown(selectId, items) {
  const el = document.getElementById(selectId);
  if (!el) return;
  const currentVal = el.value;
  el.innerHTML = '<option value="">-- Pilih Berkas --</option>';
  items.forEach(b => {
    const label = `${b.smNoMemo || '(tanpa nomor)'} - ${(b.smUraian || '').slice(0, 40)}`;
    el.innerHTML += `<option value="${b.id}">${label}</option>`;
  });
  if (items.some(b => b.id === currentVal)) el.value = currentVal;
}

// ==========================================================================
// AUTHENTICATION & ROUTING UNTUK OPSI 1
// (index.html = Halaman Login, dashboard.html = Halaman Utama/Dashboard)
// ==========================================================================

firebase.auth().onAuthStateChanged(async (user) => {
  const isDashboardPage = window.location.pathname.endsWith('dashboard.html');
  const userProfileSec = document.getElementById('user-profile-section');

  if (user) {
    // JIKA USER SUDAH LOGIN TAPI MASIH BUKA index.html (LOGIN PAGE)
    if (!isDashboardPage) {
      window.location.href = "dashboard.html";
      return;
    }

    // AMBIL DATA ROLE/PROFIL DARI FIRESTORE DARI DASHBOARD
    try {
      const userDoc = await db.collection("users").doc(user.uid).get();
      if (userDoc.exists) {
        currentUserData = userDoc.data();
      } else {
        currentUserData = {
          nama: user.email.split('@')[0],
          email: user.email,
          role: ["Pegawai"],
          status: "aktif"
        };
      }

      // AKUN DINONAKTIFKAN OLEH ADMIN -> PAKSA LOGOUT
      if (currentUserData.status === "nonaktif") {
        alert("Akun Anda telah dinonaktifkan oleh Admin. Hubungi Operator MONEV.");
        await firebase.auth().signOut();
        window.location.href = "index.html";
        return;
      }

      if (userProfileSec) userProfileSec.classList.remove('hidden');
      const nameEl = document.getElementById('user-display-name');
      const roleEl = document.getElementById('user-display-role');
      if (nameEl) nameEl.innerText = currentUserData.nama;
      if (roleEl) roleEl.innerText = "Role: " + (currentUserData.role ? currentUserData.role.join(", ") : "User");

      applyRolePermissions(currentUserData.role || []);

    } catch (err) {
      console.error("Error fetching user profile:", err);
    }
  } else {
    // JIKA USER BELUM LOGIN TAPI COBA BUKA dashboard.html
    if (isDashboardPage) {
      window.location.href = "index.html";
    }
  }
});

// FUNGSI SUBMIT LOGIN (DIPANGGIL DI index.html)
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
    // SETELAH BERHASIL LOGIN, REDIRECT KE DASHBOARD
    window.location.href = "dashboard.html";
  } catch (err) {
    let errorMsg = "Gagal login. Periksa email dan password Anda.";
    if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
      errorMsg = "Email atau Kata Sandi yang Anda masukkan salah!";
    }
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

// FUNGSI LOGOUT
async function handleLogout() {
  if (confirm("Apakah Anda yakin ingin keluar dari sistem?")) {
    await firebase.auth().signOut();
    window.location.href = "index.html";
  }
}

// ==========================================================================
// SISTEM ROLE & AKSES MENU
// null artinya semua pegawai yang login boleh akses (Beranda, Lembur,
// Bukti Belanja, Arsip). Role lain wajib punya salah satu tag berikut,
// kecuali role "Operator" / "Super Admin" yang selalu full akses.
// ==========================================================================
const PAGE_ROLES = {
  'page-beranda': null,
  'page-dashboard-all': ['Operator', 'Super Admin'],
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

function applyRolePermissions(roles) {
  const isFullAccess = roles.includes('Operator') || roles.includes('Super Admin');

  document.querySelectorAll('[data-page]').forEach(btn => {
    const pageId = btn.getAttribute('data-page');
    const required = PAGE_ROLES[pageId];
    const allowed = isFullAccess || !required || required.some(r => roles.includes(r));
    btn.classList.toggle('hidden', !allowed);
  });

  // Sembunyikan grup submenu (Input Memo, dst) kalau semua child-nya tersembunyi
  document.querySelectorAll('[data-group]').forEach(group => {
    const buttons = group.querySelectorAll('[data-page]');
    const anyVisible = Array.from(buttons).some(b => !b.classList.contains('hidden'));
    group.classList.toggle('hidden', !anyVisible);
  });

  // Kalau halaman yang sedang aktif ternyata tidak boleh diakses role ini, kembali ke Beranda
  const activePage = document.querySelector('.page-view:not(.hidden)');
  if (activePage) {
    const btnForActive = document.querySelector(`[data-page="${activePage.id}"]`);
    if (btnForActive && btnForActive.classList.contains('hidden')) {
      navigateTo('page-beranda');
    }
  }
}

// ==========================================================================
// KELOLA AKUN KARYAWAN (dibuat oleh role Operator / Super Admin)
// Menggunakan Firebase App kedua supaya sesi admin yang sedang login
// tidak ikut ter-logout saat membuat akun baru.
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

async function handleAkunKaryawanSubmit(e) {
  e.preventDefault();

  const editUid = document.getElementById('akun-edit-uid').value;
  const nama = document.getElementById('akun-nama').value;
  const email = document.getElementById('akun-email').value.trim();
  const pass = document.getElementById('akun-password').value;
  const roles = getCheckedRoles();
  const btn = document.getElementById('btn-submit-akun');

  if (!nama) { alert('Pilih nama pegawai terlebih dahulu.'); return; }

  if (!editUid) {
    alert('Pembuatan akun baru dari halaman ini sedang dinonaktifkan. Buat akun login lewat Firebase Console \u2192 Authentication terlebih dahulu, lalu klik "Edit Role" pada akun tersebut di tabel bawah untuk mengatur role-nya.');
    return;
  }

  if (roles.length === 0 && !confirm('Belum ada role dicentang, pegawai ini hanya bisa akses menu umum (Beranda/Lembur/Belanja UP/Arsip). Lanjutkan?')) {
    return;
  }

  btn.disabled = true;
  btn.innerText = 'Menyimpan...';

  try {
    // MODE EDIT: hanya update data role/nama di Firestore
    await db.collection('users').doc(editUid).set({
      nama, email, role: roles
    }, { merge: true });
    alert('Role/data pegawai berhasil diperbarui.');

    cancelEditAkunKaryawan();
  } catch (err) {
    console.error(err);
    alert('Gagal menyimpan perubahan role. (' + (err.message || '') + ')');
  } finally {
    btn.disabled = false;
    btn.innerText = 'Simpan Perubahan';
  }
}

function startEditAkunKaryawan(uid, nama, email, roles) {
  const form = document.getElementById('form-akun-karyawan');
  form.classList.remove('hidden');
  document.getElementById('akun-edit-uid').value = uid;
  document.getElementById('akun-nama').value = nama;
  document.getElementById('akun-email').value = email;
  document.getElementById('akun-email').disabled = true;
  document.getElementById('akun-password-wrap').classList.add('hidden');
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
      const roles = u.role || [];
      const status = u.status || 'aktif';
      const rolesJson = JSON.stringify(roles).replace(/"/g, '&quot;');

      tbody.innerHTML += `
        <tr class="hover:bg-slate-50">
          <td class="px-3 py-2 font-semibold text-slate-800">${u.nama || '-'}</td>
          <td class="px-3 py-2 font-mono">${u.email || '-'}</td>
          <td class="px-3 py-2">${roles.length ? roles.map(r => `<span class="inline-block bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[10px] font-medium mr-1 mb-1">${r}</span>`).join('') : '<span class="text-slate-400">Umum</span>'}</td>
          <td class="px-3 py-2">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${status === 'aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}">${status === 'aktif' ? 'Aktif' : 'Nonaktif'}</span>
          </td>
          <td class="px-3 py-2 whitespace-nowrap">
            <button onclick='startEditAkunKaryawan("${doc.id}", ${JSON.stringify(u.nama || '')}, ${JSON.stringify(u.email || '')}, ${rolesJson})' class="text-blue-600 hover:underline font-medium mr-2">Edit Role</button>
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
    // CEK NOMOR MEMO GANDA SEBELUM DISIMPAN
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
    generateNoMemoSM();
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
// LEMBUR: PENGAJUAN & LAPORAN (durasi dalam HARI)
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
// BELANJA UP: BUKTI BELANJA (foto dikompres lalu disimpan langsung di
// Firestore sebagai base64 - TIDAK PAKAI Firebase Storage supaya tetap
// gratis di plan Spark, tidak perlu upgrade Blaze/kartu kredit)
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
// REKAM SPBY: UPLOAD EXCEL -> FIRESTORE -> TAMPIL DI BERANDA
// ==========================================================================
function handleUploadSPBYExcel() {
  const fileInput = document.getElementById('spby-excel-file');
  const statusEl = document.getElementById('spby-upload-status');
  const btn = document.getElementById('btn-upload-spby');
  const file = fileInput.files[0];

  if (!file) { alert('Pilih file Excel terlebih dahulu.'); return; }
  if (typeof XLSX === 'undefined') { alert('Library pembaca Excel belum termuat, coba refresh halaman.'); return; }

  btn.disabled = true;
  btn.innerText = 'Memproses...';
  statusEl.textContent = '';
  statusEl.className = 'text-xs font-medium';

  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const data = new Uint8Array(evt.target.result);
      const wb = XLSX.read(data, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (!rows.length) throw new Error('File Excel kosong atau format tidak sesuai.');

      const batch = db.batch();
      let count = 0;
      rows.forEach(row => {
        const tanggalRaw = row['Tanggal'] ?? row['tanggal'] ?? row['TANGGAL'] ?? '';
        const uraian = row['Uraian'] ?? row['uraian'] ?? row['URAIAN'] ?? '';
        const nominalRaw = row['Nominal'] ?? row['nominal'] ?? row['NOMINAL'] ?? 0;
        const nominal = parseFloat(String(nominalRaw).replace(/[^0-9.-]/g, '')) || 0;
        if (!String(uraian).trim()) return;

        const ref = db.collection('rekam_spby').doc();
        batch.set(ref, {
          tanggal: String(tanggalRaw),
          uraian: String(uraian),
          nominal,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        count++;
      });

      if (count === 0) throw new Error('Tidak ada baris valid ditemukan. Pastikan ada kolom Tanggal, Uraian, Nominal.');

      await batch.commit();
      statusEl.textContent = `Berhasil menyimpan ${count} baris data dari Excel.`;
      statusEl.classList.add('text-emerald-600');
      fileInput.value = '';
    } catch (err) {
      console.error(err);
      statusEl.textContent = 'Gagal memproses file: ' + err.message;
      statusEl.classList.add('text-red-600');
    } finally {
      btn.disabled = false;
      btn.innerText = 'Proses & Simpan Data Excel';
    }
  };
  reader.readAsArrayBuffer(file);
}

function subscribeRekamSPBY() {
  const tbodyPage = document.getElementById('tbody-rekam-spby');
  const tbodyBeranda = document.getElementById('tbody-beranda-spby');
  const totalEl = document.getElementById('beranda-spby-total');
  if (!tbodyPage && !tbodyBeranda) return;

  db.collection('rekam_spby').onSnapshot(snapshot => {
    const rows = [];
    let total = 0;
    snapshot.forEach(doc => {
      const d = doc.data();
      total += (d.nominal || 0);
      rows.push(d);
    });
    rows.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));

    const renderRow = d => `<tr><td class="px-3 py-2">${d.tanggal || '-'}</td><td class="px-3 py-2">${d.uraian || '-'}</td><td class="px-3 py-2 text-right font-mono">Rp ${Number(d.nominal || 0).toLocaleString('id-ID')}</td></tr>`;

    if (tbodyPage) {
      tbodyPage.innerHTML = rows.length ? rows.map(renderRow).join('') : `<tr><td colspan="3" class="text-center py-4 text-slate-400">Belum ada data.</td></tr>`;
    }
    if (tbodyBeranda) {
      tbodyBeranda.innerHTML = rows.length ? rows.slice(0, 10).map(renderRow).join('') : `<tr><td colspan="3" class="text-center py-4 text-slate-400">Belum ada data SPBY.</td></tr>`;
    }
    if (totalEl) totalEl.textContent = 'Rp ' + total.toLocaleString('id-ID');
  }, err => console.error('Gagal memuat rekam_spby:', err));
}

// ==========================================================================
// ARSIP: SK, KAK, SPM (metadata + link Google Drive)
// ==========================================================================
async function handleArsipSubmit(e, kategori) {
  e.preventDefault();
  const form = e.target;
  const nama = form.querySelector('[data-f="nama"]').value.trim();
  const nomor = form.querySelector('[data-f="nomor"]').value.trim();
  const tanggal = form.querySelector('[data-f="tanggal"]').value;
  const link = form.querySelector('[data-f="link"]').value.trim();
  const btn = form.querySelector('button[type="submit"]');

  if (!link.includes('drive.google.com')) {
    alert('Link file harus berupa link Google Drive (upload dulu ke folder yang tersedia, lalu tempel link share-nya di sini).');
    return;
  }

  btn.disabled = true;
  btn.innerText = 'Menyimpan...';
  try {
    await db.collection('arsip').add({
      kategori, nama, nomor, tanggal, link,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert(`Data arsip ${kategori} berhasil disimpan.`);
    form.reset();
  } catch (err) {
    console.error(err);
    alert('Gagal menyimpan data arsip. (' + (err.message || '') + ')');
  } finally {
    btn.disabled = false;
    btn.innerText = `Simpan Data Arsip ${kategori}`;
  }
}

function subscribeArsip(kategori) {
  const tbody = document.getElementById('tbody-arsip-' + kategori);
  if (!tbody) return;

  db.collection('arsip').where('kategori', '==', kategori).onSnapshot(snapshot => {
    if (snapshot.empty) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-slate-400">Belum ada data.</td></tr>`;
      return;
    }
    const items = [];
    snapshot.forEach(doc => items.push(doc.data()));
    items.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));

    tbody.innerHTML = items.map(d => `
      <tr>
        <td class="px-3 py-2 font-medium text-slate-800">${d.nama || '-'}</td>
        <td class="px-3 py-2">${d.nomor || '-'}</td>
        <td class="px-3 py-2">${d.tanggal || '-'}</td>
        <td class="px-3 py-2"><a href="${d.link}" target="_blank" rel="noopener" class="text-blue-600 hover:underline font-medium">Buka File</a></td>
      </tr>
    `).join('');
  }, err => {
    console.error('Gagal memuat arsip ' + kategori, err);
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-red-400">Gagal memuat data.</td></tr>`;
  });
}
