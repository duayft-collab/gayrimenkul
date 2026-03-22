const FBCFG = {
  apiKey: "AIzaSyB5eValPPkRuPtJIgDnB7jRWOt2zythuRI",
  authDomain: "companyplatform-9e1a8.firebaseapp.com",
  projectId: "companyplatform-9e1a8",
  storageBucket: "companyplatform-9e1a8.firebasestorage.app",
  messagingSenderId: "526343866340",
  appId: "1:526343866340:web:31f9c04b85e284eac7e9f1"
};

firebase.initializeApp(FBCFG);
var auth = firebase.auth();
var db = firebase.firestore();

auth.onAuthStateChanged(function(user) {
  if (!user) {
    showLogin();
  } else {
    document.getElementById("app").innerHTML = getShell();
    document.getElementById("user-email").textContent = user.email;
    showDashboard();
  }
});

function showLogin() {
  document.getElementById("app").innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f5f5f3;font-family:-apple-system,sans-serif"><div style="background:#fff;border-radius:16px;border:1px solid #e0e0e0;padding:40px;width:380px;max-width:95vw"><div style="font-size:22px;font-weight:600;margin-bottom:6px">TradeOS</div><div style="font-size:13px;color:#666;margin-bottom:28px">Uluslararasi Ticaret Yonetim Sistemi</div><div id="lerr" style="background:#fee;color:#c00;padding:10px;border-radius:8px;font-size:12px;margin-bottom:14px;display:none"></div><div style="margin-bottom:14px"><label style="font-size:12px;color:#666;display:block;margin-bottom:5px">E-posta</label><input id="lem" type="email" placeholder="admin@firma.com" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid #ddd;font-size:14px;font-family:inherit"></div><div style="margin-bottom:20px"><label style="font-size:12px;color:#666;display:block;margin-bottom:5px">Sifre</label><input id="lpw" type="password" placeholder="..." style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid #ddd;font-size:14px;font-family:inherit" onkeydown="if(event.key===\'Enter\')doLogin()"></div><button onclick="doLogin()" style="width:100%;padding:11px;border-radius:8px;background:#1a1a1a;color:#fff;font-size:14px;border:none;cursor:pointer;font-family:inherit">Giris Yap</button></div></div>';
}

function doLogin() {
  var email = document.getElementById("lem").value;
  var pass = document.getElementById("lpw").value;
  var err = document.getElementById("lerr");
  err.style.display = "none";
  auth.signInWithEmailAndPassword(email, pass).catch(function(e) {
    err.style.display = "block";
    err.textContent = e.code === "auth/wrong-password" ? "Sifre hatali" : e.code === "auth/user-not-found" ? "Kullanici bulunamadi" : e.message;
  });
}

function logout() {
  auth.signOut();
}

function getShell() {
  return '<div style="display:flex;height:100vh;overflow:hidden"><div style="width:220px;background:#fff;border-right:1px solid #e0e0e0;display:flex;flex-direction:column;flex-shrink:0;overflow-y:auto"><div style="padding:20px 16px 14px;border-bottom:1px solid #e0e0e0"><div style="font-size:15px;font-weight:600">TradeOS</div><div style="font-size:11px;color:#999;margin-top:2px">Uluslararasi Ticaret</div></div><nav style="padding:10px 8px;flex:1"><div style="font-size:10px;color:#bbb;padding:10px 10px 4px;letter-spacing:.05em;text-transform:uppercase">Ana Moduller</div><div class="ni" onclick="showDashboard()">Dashboard</div><div class="ni" onclick="showCRM()">CRM</div><div class="ni" onclick="showPage(\'Siparisler\')">Siparisler</div><div class="ni" onclick="showPage(\'Dokumanlar\')">Dokumanlar</div><div class="ni" onclick="showPage(\'Finans\')">Finans ve Metaller</div><div style="font-size:10px;color:#bbb;padding:10px 10px 4px;letter-spacing:.05em;text-transform:uppercase">Urun ve Lojistik</div><div class="ni" onclick="showPage(\'Numune Arsivi\')">Numune Arsivi</div><div class="ni" onclick="showPage(\'Navlun Kargo\')">Navlun ve Kargo</div><div style="font-size:10px;color:#bbb;padding:10px 10px 4px;letter-spacing:.05em;text-transform:uppercase">Sirket</div><div class="ni" onclick="showPage(\'Duyurular\')">Duyurular</div><div class="ni" onclick="showPage(\'Takvim\')">Takvim</div><div class="ni" onclick="showPage(\'Yapilacaklar\')">Yapilacaklar</div><div class="ni" onclick="showPage(\'IK Hub\')">IK Hub</div><div class="ni" onclick="showPage(\'Prim Yonetimi\')">Prim Yonetimi</div><div class="ni" onclick="showPage(\'Puantaj\')">Puantaj</div><div class="ni" onclick="showPage(\'Kullanicilar\')">Kullanicilar</div></nav><div style="padding:12px 14px;border-top:1px solid #e0e0e0;display:flex;align-items:center;gap:8px"><div style="width:28px;height:28px;border-radius:50%;background:#e3f0ff;color:#1a5fb4;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600">A</div><div id="user-email" style="font-size:11px;color:#666;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></div><button onclick="logout()" style="background:none;border:none;cursor:pointer;color:#999;font-size:14px;padding:4px" title="Cikis">x</button></div></div><div style="flex:1;overflow-y:auto"><div id="pc"></div></div></div>';
}

function setPage(html) {
  var el = document.getElementById("pc");
  if (el) el.innerHTML = html;
  document.querySelectorAll(".ni").forEach(function(x) { x.style.background = ""; x.style.fontWeight = ""; x.style.color = "#666"; });
}

function showPage(title) {
  setPage('<div style="padding:40px;text-align:center"><div style="font-size:36px;margin-bottom:16px">🚧</div><div style="font-size:18px;font-weight:600;margin-bottom:8px">' + title + '</div><div style="font-size:14px;color:#999">Bu modul yakinlarda aktif olacak</div></div>');
}

function showDashboard() {
  setPage('<div style="padding:24px"><div style="font-size:20px;font-weight:600;margin-bottom:20px">Hos geldiniz</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px"><div onclick="showCRM()" style="background:#fff;border-radius:12px;border:1px solid #e0e0e0;padding:18px;cursor:pointer"><div style="font-size:26px;margin-bottom:10px">👥</div><div style="font-size:14px;font-weight:500">CRM</div><div style="font-size:12px;color:#999">Musteri ve Tedarikci</div></div><div onclick="showPage(\'Siparisler\')" style="background:#fff;border-radius:12px;border:1px solid #e0e0e0;padding:18px;cursor:pointer"><div style="font-size:26px;margin-bottom:10px">📦</div><div style="font-size:14px;font-weight:500">Siparisler</div><div style="font-size:12px;color:#999">Siparis ve Sevkiyat</div></div><div onclick="showPage(\'Finans\')" style="background:#fff;border-radius:12px;border:1px solid #e0e0e0;padding:18px;cursor:pointer"><div style="font-size:26px;margin-bottom:10px">💰</div><div style="font-size:14px;font-weight:500">Finans</div><div style="font-size:12px;color:#999">Alacak ve Metaller</div></div><div onclick="showPage(\'IK Hub\')" style="background:#fff;border-radius:12px;border:1px solid #e0e0e0;padding:18px;cursor:pointer"><div style="font-size:26px;margin-bottom:10px">👤</div><div style="font-size:14px;font-weight:500">IK Hub</div><div style="font-size:12px;color:#999">Personel yonetimi</div></div><div onclick="showPage(\'Navlun Kargo\')" style="background:#fff;border-radius:12px;border:1px solid #e0e0e0;padding:18px;cursor:pointer"><div style="font-size:26px;margin-bottom:10px">🚢</div><div style="font-size:14px;font-weight:500">Navlun</div><div style="font-size:12px;color:#999">Kargo ve Lojistik</div></div><div onclick="showPage(\'Duyurular\')" style="background:#fff;border-radius:12px;border:1px solid #e0e0e0;padding:18px;cursor:pointer"><div style="font-size:26px;margin-bottom:10px">📢</div><div style="font-size:14px;font-weight:500">Duyurular</div><div style="font-size:12px;color:#999">Sirket duyurulari</div></div></div></div>');
}

var _firms = [];
var _fFilter = "tumu";
var _fEdit = null;

function showCRM() {
  setPage('<div style="padding:20px 24px"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px"><div style="font-size:18px;font-weight:600">CRM</div><button onclick="crmNewModal()" style="padding:8px 16px;border-radius:8px;background:#1a1a1a;color:#fff;border:none;cursor:pointer;font-size:13px">+ Yeni Firma</button></div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px"><div style="background:#fff;border-radius:10px;border:1px solid #e0e0e0;padding:14px"><div style="font-size:11px;color:#999">Toplam</div><div style="font-size:20px;font-weight:500" id="cs1">-</div></div><div style="background:#fff;border-radius:10px;border:1px solid #e0e0e0;padding:14px"><div style="font-size:11px;color:#999">Musteri</div><div style="font-size:20px;font-weight:500" id="cs2">-</div></div><div style="background:#fff;border-radius:10px;border:1px solid #e0e0e0;padding:14px"><div style="font-size:11px;color:#999">Tedarikci</div><div style="font-size:20px;font-weight:500" id="cs3">-</div></div><div style="background:#fff;border-radius:10px;border:1px solid #e0e0e0;padding:14px"><div style="font-size:11px;color:#999">Aktif</div><div style="font-size:20px;font-weight:500" id="cs4">-</div></div></div><div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap"><input id="csrch" placeholder="Ara..." oninput="crmRender()" style="flex:1;max-width:260px;padding:8px 12px;border-radius:8px;border:1px solid #ddd;font-size:13px;font-family:inherit"><button onclick="crmSetF(\'tumu\',this)" style="padding:5px 12px;border-radius:20px;border:1px solid #1a1a1a;background:#1a1a1a;color:#fff;font-size:12px;cursor:pointer">Tumu</button><button onclick="crmSetF(\'musteri\',this)" style="padding:5px 12px;border-radius:20px;border:1px solid #ddd;background:transparent;color:#666;font-size:12px;cursor:pointer">Musteri</button><button onclick="crmSetF(\'tedarikci\',this)" style="padding:5px 12px;border-radius:20px;border:1px solid #ddd;background:transparent;color:#666;font-size:12px;cursor:pointer">Tedarikci</button></div><div style="background:#fff;border-radius:12px;border:1px solid #e0e0e0;overflow:hidden"><table style="width:100%;border-collapse:collapse"><thead><tr style="border-bottom:1px solid #e0e0e0;background:#fafafa"><th style="padding:10px 14px;font-size:11px;color:#999;text-align:left;font-weight:500">Firma</th><th style="padding:10px 14px;font-size:11px;color:#999;text-align:left;font-weight:500">Tur</th><th style="padding:10px 14px;font-size:11px;color:#999;text-align:left;font-weight:500">Ulke</th><th style="padding:10px 14px;font-size:11px;color:#999;text-align:left;font-weight:500">Ilgili Kisi</th><th style="padding:10px 14px;font-size:11px;color:#999;text-align:left;font-weight:500">Durum</th><th style="padding:10px 14px;font-size:11px;color:#999;text-align:left;font-weight:500"></th></tr></thead><tbody id="ctbody"><tr><td colspan="6" style="text-align:center;padding:40px;color:#999">Yukleniyor...</td></tr></tbody></table></div><div id="cmodal" style="position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:200;display:none;align-items:flex-start;justify-content:center;padding-top:60px"><div style="background:#fff;border-radius:14px;padding:24px;width:500px;max-width:95vw;max-height:80vh;overflow-y:auto"><div style="font-size:16px;font-weight:600;margin-bottom:18px" id="cmtitle">Yeni Firma</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:11px"><div><label style="font-size:12px;color:#666;display:block;margin-bottom:4px">Firma Adi</label><input id="cfn" style="width:100%;padding:9px;border-radius:8px;border:1px solid #ddd;font-size:13px;font-family:inherit"></div><div><label style="font-size:12px;color:#666;display:block;margin-bottom:4px">Tur</label><select id="cft" style="width:100%;padding:9px;border-radius:8px;border:1px solid #ddd;font-size:13px;font-family:inherit"><option value="musteri">Musteri</option><option value="tedarikci">Tedarikci</option><option value="ikisi">Her Ikisi</option></select></div><div><label style="font-size:12px;color:#666;display:block;margin-bottom:4px">Ulke</label><input id="cfc" style="width:100%;padding:9px;border-radius:8px;border:1px solid #ddd;font-size:13px;font-family:inherit"></div><div><label style="font-size:12px;color:#666;display:block;margin-bottom:4px">Bolge</label><select id="cfr" style="width:100%;padding:9px;border-radius:8px;border:1px solid #ddd;font-size:13px;font-family:inherit"><option value="avrupa">Avrupa</option><option value="asya">Asya</option><option value="ortadogu">Orta Dogu</option><option value="amerika">Amerika</option></select></div><div><label style="font-size:12px;color:#666;display:block;margin-bottom:4px">Ilgili Kisi</label><input id="cfk" style="width:100%;padding:9px;border-radius:8px;border:1px solid #ddd;font-size:13px;font-family:inherit"></div><div><label style="font-size:12px;color:#666;display:block;margin-bottom:4px">E-posta</label><input id="cfe" style="width:100%;padding:9px;border-radius:8px;border:1px solid #ddd;font-size:13px;font-family:inherit"></div><div><label style="font-size:12px;color:#666;display:block;margin-bottom:4px">Telefon</label><input id="cfp" style="width:100%;padding:9px;border-radius:8px;border:1px solid #ddd;font-size:13px;font-family:inherit"></div><div><label style="font-size:12px;color:#666;display:block;margin-bottom:4px">Durum</label><select id="cfs" style="width:100%;padding:9px;border-radius:8px;border:1px solid #ddd;font-size:13px;font-family:inherit"><option value="active">Aktif</option><option value="new">Yeni</option><option value="passive">Pasif</option></select></div></div><div style="margin-top:12px"><label style="font-size:12px;color:#666;display:block;margin-bottom:4px">Not</label><textarea id="cfnot" style="width:100%;padding:9px;border-radius:8px;border:1px solid #ddd;font-size:13px;font-family:inherit;resize:vertical;min-height:60px"></textarea></div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px"><button onclick="crmClose()" style="padding:8px 16px;border-radius:8px;border:1px solid #ddd;background:transparent;font-size:13px;cursor:pointer">Iptal</button><button onclick="crmSave()" style="padding:8px 16px;border-radius:8px;background:#1a1a1a;color:#fff;border:none;font-size:13px;cursor:pointer">Kaydet</button></div></div></div></div>');
  crmLoad();
}

function crmLoad() {
  db.collection("to_firms").orderBy("createdAt","desc").get().then(function(snap) {
    _firms = snap.docs.map(function(d) { return Object.assign({id: d.id}, d.data()); });
    var s1 = document.getElementById("cs1");
    var s2 = document.getElementById("cs2");
    var s3 = document.getElementById("cs3");
    var s4 = document.getElementById("cs4");
    if(s1) s1.textContent = _firms.length;
    if(s2) s2.textContent = _firms.filter(function(f){return f.type==="musteri"||f.type==="ikisi";}).length;
    if(s3) s3.textContent = _firms.filter(function(f){return f.type==="tedarikci"||f.type==="ikisi";}).length;
    if(s4) s4.textContent = _firms.filter(function(f){return f.status==="active";}).length;
    crmRender();
  });
}

function crmRender() {
  var q = (document.getElementById("csrch") ? document.getElementById("csrch").value : "").toLowerCase();
  var list = _firms.filter(function(f) {
    var mF = _fFilter === "tumu" || f.type === _fFilter;
    var mQ = !q || (f.name + f.contact + f.country + "").toLowerCase().indexOf(q) > -1;
    return mF && mQ;
  });
  var ST = {active:"Aktif", new:"Yeni", passive:"Pasif", risk:"Riskli"};
  var TP = {musteri:"Musteri", tedarikci:"Tedarikci", ikisi:"Her Ikisi"};
  var tbody = document.getElementById("ctbody");
  if (!tbody) return;
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#999">Kayit bulunamadi</td></tr>'; return; }
  tbody.innerHTML = list.map(function(f) {
    var ini = (f.name || "?").split(" ").map(function(w){return w[0];}).join("").slice(0,2).toUpperCase();
    var sl = ST[f.status] || "—";
    return '<tr style="border-bottom:1px solid #f0f0f0" onmouseover="this.style.background=\'#f9f9f9\'" onmouseout="this.style.background=\'\'"><td style="padding:12px 14px"><div style="display:flex;align-items:center;gap:10px"><div style="width:34px;height:34px;border-radius:50%;background:#e3f0ff;color:#1a5fb4;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;flex-shrink:0">' + ini + '</div><div><div style="font-weight:500;font-size:13px">' + (f.name||"—") + '</div><div style="font-size:11px;color:#999">' + (f.email||"") + '</div></div></div></td><td style="padding:12px 14px;font-size:12px">' + (TP[f.type]||"—") + '</td><td style="padding:12px 14px;font-size:12px;color:#666">' + (f.country||"—") + '</td><td style="padding:12px 14px;font-size:12px">' + (f.contact||"—") + '</td><td style="padding:12px 14px"><span style="display:inline-flex;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:500;background:#e6f4ea;color:#1e6e2e">' + sl + '</span></td><td style="padding:12px 14px"><button onclick="crmEdit(\'' + f.id + '\')" style="background:none;border:none;cursor:pointer;color:#999;font-size:14px;margin-right:6px">✎</button><button onclick="crmDel(\'' + f.id + '\')" style="background:none;border:none;cursor:pointer;color:#c62828;font-size:14px">🗑</button></td></tr>';
  }).join("");
}

function crmSetF(f, el) {
  _fFilter = f;
  crmRender();
}

function crmNewModal() {
  _fEdit = null;
  document.getElementById("cmtitle").textContent = "Yeni Firma";
  ["cfn","cfc","cfk","cfe","cfp","cfnot"].forEach(function(id){ var el=document.getElementById(id); if(el) el.value=""; });
  document.getElementById("cmodal").style.display = "flex";
}

function crmEdit(id) {
  var f = _firms.find(function(x){return x.id===id;}); if(!f) return;
  _fEdit = id;
  document.getElementById("cmtitle").textContent = "Firma Duzenle";
  document.getElementById("cfn").value = f.name||"";
  document.getElementById("cft").value = f.type||"musteri";
  document.getElementById("cfc").value = f.country||"";
  document.getElementById("cfr").value = f.region||"avrupa";
  document.getElementById("cfk").value = f.contact||"";
  document.getElementById("cfe").value = f.email||"";
  document.getElementById("cfp").value = f.phone||"";
  document.getElementById("cfs").value = f.status||"active";
  document.getElementById("cfnot").value = f.note||"";
  document.getElementById("cmodal").style.display = "flex";
}

function crmClose() { document.getElementById("cmodal").style.display = "none"; }

function crmSave() {
  var name = document.getElementById("cfn").value.trim();
  if (!name) { alert("Firma adi zorunlu"); return; }
  var data = {
    name: name,
    type: document.getElementById("cft").value,
    country: document.getElementById("cfc").value.trim(),
    region: document.getElementById("cfr").value,
    contact: document.getElementById("cfk").value.trim(),
    email: document.getElementById("cfe").value.trim(),
    phone: document.getElementById("cfp").value.trim(),
    status: document.getElementById("cfs").value,
    note: document.getElementById("cfnot").value.trim(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  var promise;
  if (_fEdit) {
    promise = db.collection("to_firms").doc(_fEdit).update(data);
  } else {
    data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    promise = db.collection("to_firms").add(data);
  }
  promise.then(function() { crmClose(); crmLoad(); });
}

function crmDel(id) {
  if (!confirm("Silmek istediginize emin misiniz?")) return;
  db.collection("to_firms").doc(id).delete().then(function() { crmLoad(); });
}
