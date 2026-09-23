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
});

// POPULATE DROPDOWNS & CHECKLIST PEGAWAI
function populatePegawaiDropdowns() {
  const singleSelectIds = ['sm-pembuat', 'ppk-penerima', 'bendahara-pembuat', 'lembur-ketua', 'lap-nama'];
  
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
      window.location.href = "Dashboard.html";
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
          role: ["Subject Matter", "Lembur", "Belanja UP"]
        };
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

// RESTRIKSI MENU NAVIGASI DARI ROLE
function applyRolePermissions(roles) {
  const isSuperAdmin = roles.includes("Operator") || roles.includes("Super Admin");
  const btnNavUsers = document.getElementById('btn-nav-users');
  if (btnNavUsers) {
    if (isSuperAdmin) btnNavUsers.classList.remove('hidden');
    else btnNavUsers.classList.add('hidden');
  }
}
