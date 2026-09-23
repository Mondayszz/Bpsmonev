// ==========================================================================
// SCRIPT.JS - Sistem MONEV BPS Kota Kotamobagu
// ==========================================================================

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

function switchSKTab(tabId) {
  document.querySelectorAll('.tab-sk-content').forEach(c => c.classList.add('hidden'));
  const target = document.getElementById(tabId);
  if (target) target.classList.remove('hidden');

  ['btn-tab-sk', 'btn-tab-kak', 'btn-tab-spm'].forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.className = 'px-4 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-orange-50 hover:text-orange-600 transition';
    }
  });

  const activeBtnMap = {
    'tab-sk': 'btn-tab-sk',
    'tab-kak': 'btn-tab-kak',
    'tab-spm': 'btn-tab-spm'
  };
  const activeBtn = document.getElementById(activeBtnMap[tabId]);
  if (activeBtn) {
    activeBtn.className = 'px-4 py-2 rounded-lg bg-orange-600 text-white transition';
  }
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
        datasets: [{
          data: [45, 55],
          backgroundColor: ['#3b82f6', '#4f46e5'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } },
        cutout: '70%'
      }
    });
  }

  const ctxRealisasi = document.getElementById('chartPaguRealisasi')?.getContext('2d');
  if (ctxRealisasi) {
    new Chart(ctxRealisasi, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
        datasets: [
          {
            label: 'Pagu Anggaran',
            data: [1.2, 2.5, 3.8, 4.5, 5.0, 5.8, 6.2, 7.5, 8.2, 11.5, 9.8, 6.5],
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.05)',
            tension: 0.3,
            fill: true
          },
          {
            label: 'Realisasi',
            data: [1.0, 2.2, 3.5, 4.1, 4.8, 5.2, 5.9, 7.0, 7.9, 11.0, 9.2, 5.8],
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.05)',
            tension: 0.3,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { boxWidth: 10, font: { size: 10 } } } },
        scales: {
          y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 9 } } },
          x: { grid: { display: false }, ticks: { font: { size: 9 } } }
        }
      }
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
    populateMemoDropdowns();
  });

  db.collection("pengajuan_lembur").orderBy("createdAt", "desc").onSnapshot(snapshot => {
    listPengajuanLembur = [];
  });

  db.collection("laporan_lembur").orderBy("createdAt", "desc").onSnapshot(snapshot => {
    listLaporanLembur = [];
    const tbody = document.getElementById('tbody-laporan-lembur');
    const galeriLembur = document.getElementById('beranda-galeri-lembur');

    if (tbody) tbody.innerHTML = '';
    if (galeriLembur) galeriLembur.innerHTML = '';

    if (snapshot.empty) {
      if (galeriLembur) galeriLembur.innerHTML = `<p class="col-span-3 text-slate-400">Belum ada foto lembur.</p>`;
    } else {
      let count = 0;
      snapshot.forEach(doc => {
        const d = doc.data();
        listLaporanLembur.push(d);
        const imgHtml = d.fotoUrl ? `<img src="${d.fotoUrl}" class="w-10 h-10 object-cover rounded border cursor-pointer" onclick="window.open('${d.fotoUrl}')">` : `-`;
        
        if (tbody) {
          tbody.innerHTML += `
            <tr class="hover:bg-slate-50 border-b border-slate-100">
              <td class="px-4 py-3 font-semibold">${d.nama}</td>
              <td class="px-4 py-3 text-xs">${d.tgl} (${d.jam})</td>
              <td class="px-4 py-3 text-xs">${d.output}</td>
              <td class="px-4 py-3">${imgHtml}</td>
            </tr>
          `;
        }

        if (galeriLembur && d.fotoUrl && count < 3) {
          galeriLembur.innerHTML += `
            <div class="space-y-1">
              <img src="${d.fotoUrl}" class="w-full h-16 object-cover rounded border hover:scale-105 transition cursor-pointer" onclick="window.open('${d.fotoUrl}')">
              <p class="text-[10px] text-slate-600 font-medium truncate">${d.nama}</p>
            </div>
          `;
          count++;
        }
      });
      if (galeriLembur && count === 0) {
        galeriLembur.innerHTML = `<p class="col-span-3 text-slate-400">Belum ada foto kegiatan.</p>`;
      }
    }
  });

  db.collection("belanja_up").orderBy("createdAt", "desc").onSnapshot(snapshot => {
    listBelanjaUP = [];
    const tbody = document.getElementById('tbody-belanja-up');
    const galeriBelanja = document.getElementById('beranda-galeri-belanja');

    if (tbody) tbody.innerHTML = '';
    if (galeriBelanja) galeriBelanja.innerHTML = '';

    if (snapshot.empty) {
      if (galeriBelanja) galeriBelanja.innerHTML = `<p class="col-span-3 text-slate-400">Belum ada nota belanja.</p>`;
    } else {
      let count = 0;
      snapshot.forEach(doc => {
        const d = doc.data();
        listBelanjaUP.push(d);
        const imgHtml = d.buktiUrl ? `<img src="${d.buktiUrl}" class="w-10 h-10 object-cover rounded border cursor-pointer" onclick="window.open('${d.buktiUrl}')">` : `-`;
        
        if (tbody) {
          tbody.innerHTML += `
            <tr class="hover:bg-slate-50 border-b border-slate-100">
              <td class="px-4 py-3 text-xs">${d.tgl}</td>
              <td class="px-4 py-3">${d.jenis}</td>
              <td class="px-4 py-3">${d.toko}</td>
              <td class="px-4 py-3 font-bold text-emerald-600">Rp ${Number(d.nominal).toLocaleString('id-ID')}</td>
              <td class="px-4 py-3">${imgHtml}</td>
            </tr>
          `;
        }

        if (galeriBelanja && d.buktiUrl && count < 3) {
          galeriBelanja.innerHTML += `
            <div class="space-y-1">
              <img src="${d.buktiUrl}" class="w-full h-16 object-cover rounded border hover:scale-105 transition cursor-pointer" onclick="window.open('${d.buktiUrl}')">
              <p class="text-[10px] text-slate-600 font-medium truncate">${d.toko}</p>
            </div>
          `;
          count++;
        }
      });
      if (galeriBelanja && count === 0) {
        galeriBelanja.innerHTML = `<p class="col-span-3 text-slate-400">Belum ada nota ter-upload.</p>`;
      }
    }
  });
}

function populateMemoDropdowns() {
  const ppkSelect = document.getElementById('ppk-select-berkas');
  const ppspmSelect = document.getElementById('ppspm-select-berkas');
  const bendaharaSelect = document.getElementById('bendahara-select-berkas');

  if (ppkSelect) ppkSelect.innerHTML = '<option value="">-- Pilih Berkas --</option>';
  if (ppspmSelect) ppspmSelect.innerHTML = '<option value="">-- Pilih Berkas --</option>';
  if (bendaharaSelect) bendaharaSelect.innerHTML = '<option value="">-- Pilih Berkas --</option>';

  listBerkas.forEach(b => {
    if (ppkSelect) ppkSelect.innerHTML += `<option value="${b.id}">${b.smNoMemo} - ${b.smPembuat}</option>`;
    if (ppspmSelect) ppspmSelect.innerHTML += `<option value="${b.id}">${b.smNoMemo}</option>`;
    if (bendaharaSelect) bendaharaSelect.innerHTML += `<option value="${b.id}">${b.smNoMemo}</option>`;
  });

  const smMemoInput = document.getElementById('sm-no-memo');
  if (smMemoInput) smMemoInput.value = `MEMO-SM/2026/00${listBerkas.length + 1}`;
}

async function handleSMSubmit(e) {
  e.preventDefault();
  try {
    await db.collection("berkas_keuangan").add({
      smNoMemo: document.getElementById('sm-no-memo').value,
      smPembuat: document.getElementById('sm-pembuat').value,
      smUraian: document.getElementById('sm-uraian').value,
      smTglPenyerahan: document.getElementById('sm-tgl-penyerahan').value,
      statusPosisi: 'PPK',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert("Subject Matter Berhasil Disimpan!");
    document.getElementById('form-sm').reset();
    navigateTo('page-beranda');
  } catch (err) { alert("Error: " + err.message); }
}

async function handlePPKSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('ppk-select-berkas').value;
  try {
    await db.collection("berkas_keuangan").doc(id).update({
      ppkNoMemo: `MEMO-PPK/2026/00${id.slice(-3)}`,
      ppkTglTerima: document.getElementById('ppk-tgl-terima').value,
      ppkPenerima: document.getElementById('ppk-penerima').value,
      ppkStatus: document.getElementById('ppk-status').value,
      ppkCatatan: document.getElementById('ppk-catatan').value,
      statusPosisi: 'PPSPM'
    });
    alert("Verifikasi PPK Disimpan!");
    navigateTo('page-beranda');
  } catch (err) { alert("Error: " + err.message); }
}

async function handlePPSPMSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('ppspm-select-berkas').value;
  try {
    await db.collection("berkas_keuangan").doc(id).update({
      ppspmNoMemo: `MEMO-SPM/2026/00${id.slice(-3)}`,
      ppspmTglTerima: document.getElementById('ppspm-tgl-terima').value,
      ppspmStatus: document.getElementById('ppspm-status').value,
      ppspmCatatan: document.getElementById('ppspm-catatan').value,
      statusPosisi: 'Bendahara'
    });
    alert("Pengujian PPSPM Disimpan!");
    navigateTo('page-beranda');
  } catch (err) { alert("Error: " + err.message); }
}

async function handleBendaharaSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('bendahara-select-berkas').value;
  try {
    await db.collection("berkas_keuangan").doc(id).update({
      bendaharaNoMemo: `MEMO-BND/2026/00${id.slice(-3)}`,
      bendaharaPembuat: document.getElementById('bendahara-pembuat').value,
      bendaharaTglSP2D: document.getElementById('bendahara-tgl-sp2d').value,
      bendaharaTglTransfer: document.getElementById('bendahara-tgl-transfer').value,
      statusPosisi: 'Selesai'
    });
    alert("Pencairan Bendahara Disimpan!");
    navigateTo('page-beranda');
  } catch (err) { alert("Error: " + err.message); }
}

async function handlePengajuanLemburSubmit(e) {
  e.preventDefault();
  const checkboxes = document.querySelectorAll('input[name="chk-peserta-lembur"]:checked');
  const selectedPeserta = Array.from(checkboxes).map(cb => cb.value);

  if (selectedPeserta.length === 0) {
    alert("Pilih minimal satu peserta lembur!");
    return;
  }

  try {
    await db.collection("pengajuan_lembur").add({
      ketua: document.getElementById('lembur-ketua').value,
      tglPengajuan: document.getElementById('lembur-tgl-pengajuan').value,
      tglMulai: document.getElementById('lembur-tgl-mulai').value,
      durasi: document.getElementById('lembur-durasi').value,
      peserta: selectedPeserta.join(", "),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert("Pengajuan Lembur Disimpan!");
    document.getElementById('form-pengajuan-lembur').reset();
    populatePegawaiDropdowns();
    navigateTo('page-beranda');
  } catch (err) { alert("Error: " + err.message); }
}

async function handleLaporanLemburFirebase(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-submit-lembur');
  btn.innerText = "Proses..."; btn.disabled = true;

  try {
    const file = document.getElementById('lap-foto').files[0];
    let fotoUrl = null;
    if (file) fotoUrl = await convertFileToBase64(file);

    await db.collection("laporan_lembur").add({
      nama: document.getElementById('lap-nama').value,
      tgl: document.getElementById('lap-tgl').value,
      jam: document.getElementById('lap-jam').value,
      output: document.getElementById('lap-output').value,
      fotoUrl: fotoUrl,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert("Laporan Lembur Disimpan!");
    document.getElementById('form-laporan-lembur').reset();
    navigateTo('page-beranda');
  } catch (err) {
    alert("Gagal menyimpan: " + err.message);
  } finally {
    btn.innerText = "Simpan Laporan Lembur"; btn.disabled = false;
  }
}

async function handleUPFirebase(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-submit-up');
  btn.innerText = "Proses..."; btn.disabled = true;

  try {
    const file = document.getElementById('up-bukti').files[0];
    let buktiUrl = null;
    if (file) buktiUrl = await convertFileToBase64(file);

    await db.collection("belanja_up").add({
      tgl: document.getElementById('up-tgl').value,
      jenis: document.getElementById('up-jenis').value,
      toko: document.getElementById('up-toko').value,
      nominal: document.getElementById('up-nominal').value,
      buktiUrl: buktiUrl,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert("Belanja UP Disimpan!");
    document.getElementById('form-up').reset();
    navigateTo('page-beranda');
  } catch (err) {
    alert("Gagal menyimpan: " + err.message);
  } finally {
    btn.innerText = "Simpan Belanja UP"; btn.disabled = false;
  }
}

function exportAllToExcel() {
  const workbook = XLSX.utils.book_new();
  if (listBerkas.length > 0) {
    const ws = XLSX.utils.json_to_sheet(listBerkas);
    XLSX.utils.book_append_sheet(workbook, ws, "Berkas");
  }
  XLSX.writeFile(workbook, `Rekap_MONEV_BPS.xlsx`);
}

// FIREBASE AUTH OBSERVER (UNTUK INDEX.HTML)
firebase.auth().onAuthStateChanged(async (user) => {
  const loginModal = document.getElementById('modal-login');
  const userProfileSec = document.getElementById('user-profile-section');

  if (user) {
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

      if (loginModal) loginModal.classList.add('hidden');
      applyRolePermissions(currentUserData.role || []);

    } catch (err) {
      console.error("Error profile:", err);
    }
  } else {
    currentUserData = null;
    if (userProfileSec) userProfileSec.classList.add('hidden');
    if (loginModal) loginModal.classList.remove('hidden');
  }
});

// HANDLER LOGIN MODAL (INDEX.HTML)
async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-password').value;
  const errDiv = document.getElementById('login-error-msg');
  const btn = document.getElementById('btn-login-submit');

  if (errDiv) errDiv.classList.add('hidden');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>Memproses Login...</span>';
  }

  try {
    await firebase.auth().signInWithEmailAndPassword(email, pass);
  } catch (err) {
    if (errDiv) {
      errDiv.innerText = "❌ GAGAL LOGIN: " + err.message;
      errDiv.classList.remove('hidden');
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>Masuk Sekarang</span> <i data-lucide="arrow-right" class="w-4 h-4"></i>';
      if (window.lucide) lucide.createIcons();
    }
  }
}

// HANDLER LOGIN STANDALONE (UNTUK LOGIN.HTML)
async function handleStandaloneLoginSubmit(e) {
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
    window.location.href = "index.html";
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

// LOGOUT HANDLER
async function handleLogout() {
  if (confirm("Apakah Anda yakin ingin keluar dari sistem?")) {
    await firebase.auth().signOut();
    if (window.location.pathname.endsWith('index.html')) {
      window.location.href = "login.html";
    }
  }
}

// RESTRIKSI SIDEBAR MENU BERDASARKAN ROLE
function applyRolePermissions(roles) {
  const isSuperAdmin = roles.includes("Operator") || roles.includes("Super Admin");
  const btnNavUsers = document.getElementById('btn-nav-users');
  if (btnNavUsers) {
    if (isSuperAdmin) btnNavUsers.classList.remove('hidden');
    else btnNavUsers.classList.add('hidden');
  }
}

// REDIRECT OTOMATIS JIKA SUDAH LOGIN SAAT MEMBUKA LOGIN.HTML
if (window.location.pathname.endsWith('login.html')) {
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      window.location.href = "index.html";
    }
  });
}