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
  });
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
  if (roles.length === 0 && !confirm('Belum ada role dicentang, pegawai ini hanya bisa akses menu umum (Beranda/Lembur/Belanja UP/Arsip). Lanjutkan?')) {
    return;
  }

  btn.disabled = true;
  btn.innerText = editUid ? 'Menyimpan...' : 'Membuat Akun...';

  try {
    if (editUid) {
      // MODE EDIT: hanya update data role/nama di Firestore
      await db.collection('users').doc(editUid).set({
        nama, email, role: roles
      }, { merge: true });
      alert('Role/data pegawai berhasil diperbarui.');
    } else {
      // MODE BUAT BARU: perlu password, dibuat lewat secondary auth
      if (!pass || pass.length < 6) {
        alert('Password minimal 6 karakter.');
        btn.disabled = false;
        btn.innerText = 'Buat Akun & Simpan Role';
        return;
      }
      const secondaryAuth = getSecondaryAuth();
      const cred = await secondaryAuth.createUserWithEmailAndPassword(email, pass);
      const uid = cred.user.uid;

      await db.collection('users').doc(uid).set({
        nama, email, role: roles, status: 'aktif',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      await secondaryAuth.signOut();
      alert('Akun berhasil dibuat. Sampaikan email & password awal ke pegawai bersangkutan.');
    }

    cancelEditAkunKaryawan();
  } catch (err) {
    console.error(err);
    let msg = 'Gagal menyimpan akun.';
    if (err.code === 'auth/email-already-in-use') msg = 'Email tersebut sudah terdaftar.';
    if (err.code === 'auth/invalid-email') msg = 'Format email tidak valid.';
    if (err.code === 'auth/weak-password') msg = 'Password terlalu lemah (minimal 6 karakter).';
    alert(msg);
  } finally {
    btn.disabled = false;
    btn.innerText = editUid ? 'Simpan Perubahan' : 'Buat Akun & Simpan Role';
  }
}

function startEditAkunKaryawan(uid, nama, email, roles) {
  document.getElementById('akun-edit-uid').value = uid;
  document.getElementById('akun-nama').value = nama;
  document.getElementById('akun-email').value = email;
  document.getElementById('akun-email').disabled = true;
  document.getElementById('akun-password-wrap').classList.add('hidden');
  setCheckedRoles(roles || []);
  document.getElementById('btn-submit-akun').innerText = 'Simpan Perubahan';
  document.getElementById('btn-batal-edit-akun').classList.remove('hidden');
  document.getElementById('form-akun-karyawan').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function cancelEditAkunKaryawan() {
  document.getElementById('form-akun-karyawan').reset();
  document.getElementById('akun-edit-uid').value = '';
  document.getElementById('akun-email').disabled = false;
  document.getElementById('akun-password-wrap').classList.remove('hidden');
  document.getElementById('btn-submit-akun').innerText = 'Buat Akun & Simpan Role';
  document.getElementById('btn-batal-edit-akun').classList.add('hidden');
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