// ====== ẢNH THẺ CCCD — gửi kèm SAU khi đăng ký (bản 3.23) ======
/*
 * Chạy khi phiếu ĐÃ nằm trong Sheet. Không chặn màn hình: người dùng bỏ đi lúc nào cũng được,
 * phiếu không mất gì.
 *
 * Dương chốt 14/09/2026 sau lần thử thật: GHÉP 2 mặt thành MỘT ảnh xếp NGANG (trước trái, sau
 * phải), gửi MỘT tin nhắn. Bản trước gửi mỗi mặt một tin: chờ gấp đôi. Zalo Bot chính thức không có
 * cách gửi nhiều ảnh trong một tin, nên ghép ngay trên máy là đường duy nhất ra "một tin".
 *
 * Ba điều cố ý:
 *   - Ảnh chỉ giữ trong BIẾN của trang, không cất vào bộ nhớ trình duyệt: điện thoại dùng chung
 *     hay mất máy là lộ ảnh căn cước. Rời trang thì mất — đúng như mong muốn.
 *   - Ảnh ghép dài tối đa 2400 px (một mặt: 1600 px), JPEG 0.8 rồi hạ dần: mỗi mặt trong ảnh ghép
 *     vẫn phải ĐỌC ĐƯỢC chữ trên thẻ.
 *   - Khối này chỉ hiện khi máy chủ báo đã bật (anhCH.bat).
 */
var anhCH = typeof anhCH !== 'undefined' ? anhCH : { bat: false, toi_da_kb: 800 };   // máy chủ gửi kèm trong danh_sach_cong_ty
var anhMa = '', anhChon = { truoc: null, sau: null }, anhXem = { truoc: '', sau: '' }, anhDangGui = 0;

/** Mã lỗi mà gửi lại Y NGUYÊN ảnh cũ cũng không khá hơn — phải chọn ảnh khác hoặc báo quản trị. */
var LOI_KHONG_GUI_LAI = ['ANH_KHONG_HOP_LE', 'CHUA_KHAI_NHOM', 'PHIEU_DA_KET_THUC', 'KHONG_CO_PHIEU', 'THIEU_MA'];

function khoiAnhHTML() {
  function o(mat, nhan) {
    return '<button type="button" class="o-anh" data-mat="' + mat + '"><span class="xem" id="xem_anh_' + mat +
           '"></span><span class="nhan">📷 ' + nhan + '</span></button>';
  }
  return '<div class="anhthe"><b>Gửi ảnh thẻ căn cước</b> <span class="mo">(không bắt buộc)</span>' +
         '<div class="hai-o">' + o('truoc', 'Mặt trước') + o('sau', 'Mặt sau') + '</div>' +
         '<div class="dong-lk"><button type="button" class="lk-anh" id="nut_chon_hai">Chọn cả 2 ảnh từ thư viện</button>' +
         '<button type="button" class="lk-anh" id="nut_doi_cho">⇄ Đổi chỗ 2 mặt</button></div>' +
         '<button type="button" class="nut gui-anh" id="nut_gui_anh" disabled>Gửi ảnh</button>' +
         '<div class="tt-anh" id="tt_anh">Chụp hoặc chọn 2 mặt thẻ — máy ghép thành một ảnh, gửi một tin.</div>' +
         '<p class="mo">Bỏ qua cũng được — phiếu đã lưu xong.</p></div>';
}

function ganKhoiAnh(ma) {
  if (anhDangGui) return;
  anhMa = ma;
  datLaiAnh();
  Array.prototype.forEach.call(document.querySelectorAll('.anhthe .o-anh'), function (n) {
    n.addEventListener('click', function () { $('file_anh_' + n.getAttribute('data-mat')).click(); });
  });
  $('nut_chon_hai').addEventListener('click', function () { $('file_anh_ca_hai').click(); });
  $('nut_doi_cho').addEventListener('click', doiCho);
  $('nut_gui_anh').addEventListener('click', guiAnh);
  veOAnh();
}

/** Bỏ ảnh đã chọn khỏi bộ nhớ trang, thu hồi luôn link xem trước. */
function datLaiAnh() {
  ['truoc', 'sau'].forEach(function (m) {
    if (anhXem[m]) { try { URL.revokeObjectURL(anhXem[m]); } catch (e) {} }
    anhChon[m] = null;
    anhXem[m] = '';
  });
}

function veOAnh() {
  ['truoc', 'sau'].forEach(function (m) {
    var o = $('xem_anh_' + m);
    if (!o) return;
    o.style.backgroundImage = anhXem[m] ? 'url("' + anhXem[m] + '")' : '';
    o.parentNode.classList.toggle('co', !!anhChon[m]);
  });
  var nut = $('nut_gui_anh');
  if (!nut) return;
  var so = (anhChon.truoc ? 1 : 0) + (anhChon.sau ? 1 : 0);
  nut.disabled = !so || anhDangGui > 0;
  nut.textContent = anhDangGui ? 'Đang gửi…' : (so === 2 ? 'Gửi ảnh (ghép 2 mặt)' : (so === 1 ? 'Gửi 1 mặt' : 'Gửi ảnh'));
}

function ttAnh(lop, html) {
  var o = $('tt_anh');
  if (!o) return;
  o.className = 'tt-anh' + (lop ? ' ' + lop : '');
  o.innerHTML = html;
}

function chonAnh(mat, file) {
  if (!file || anhDangGui) return;
  if (anhXem[mat]) { try { URL.revokeObjectURL(anhXem[mat]); } catch (e) {} }
  anhChon[mat] = file;
  anhXem[mat] = URL.createObjectURL(file);
  var so = (anhChon.truoc ? 1 : 0) + (anhChon.sau ? 1 : 0);
  ttAnh('', so === 2 ? 'Đã có 2 mặt — xem đúng thứ tự rồi bấm Gửi.'
                     : 'Đã có 1 mặt. Chụp nốt mặt còn lại, hoặc gửi luôn 1 mặt.');
  veOAnh();
}

/** Thư viện ảnh không phải máy nào cũng trả đúng thứ tự bấm chọn — cho đổi chỗ bằng một chạm. */
function doiCho() {
  if (anhDangGui) return;
  var f = anhChon.truoc; anhChon.truoc = anhChon.sau; anhChon.sau = f;
  var u = anhXem.truoc; anhXem.truoc = anhXem.sau; anhXem.sau = u;
  veOAnh();
}

/** Số byte thật của chuỗi base64 — CÙNG phép tính với soatAnh_ ở máy chủ, để hai bên đếm như nhau. */
function soByteB64(s) {
  s = String(s || '');
  var bu = s.slice(-2) === '==' ? 2 : (s.slice(-1) === '=' ? 1 : 0);
  return Math.floor(s.length * 3 / 4) - bu;
}

/**
 * Vẽ các ảnh đã nạp lên MỘT canvas, xếp NGANG cùng một chiều cao (trước trái, sau phải), cách nhau
 * một khe trắng. Tổng bề ngang không quá canhToiDa; không phóng to ảnh nhỏ hơn.
 */
function veGhep(ds, canhToiDa) {
  var KHE = ds.length > 1 ? 12 : 0;
  var tongTiLe = ds.reduce(function (t, a) { return t + a.W / a.H; }, 0);
  var H = Math.floor((canhToiDa - KHE * (ds.length - 1)) / tongTiLe);
  H = Math.max(1, Math.min(H, canhToiDa, Math.min.apply(null, ds.map(function (a) { return a.H; }))));
  var ws = ds.map(function (a) { return Math.max(1, Math.round(a.W * H / a.H)); });
  var c = document.createElement('canvas');
  c.width = ws.reduce(function (t, w) { return t + w; }, 0) + KHE * (ds.length - 1);
  c.height = H;
  var x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);   // khe giữa + nền ảnh PNG trong suốt: trắng
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
  var trai = 0;
  ds.forEach(function (a, i) { x.drawImage(a.ve, trai, 0, ws[i], H); trai += ws[i] + KHE; });
  return c;
}

/**
 * Nén: ảnh ghép dài tối đa 2400 px (một mặt: 1600 px), JPEG 0.8. Vẫn quá trần thì hạ chất lượng
 * 0.7 → 0.6 TRƯỚC, rồi mới thu nhỏ — giữ chữ trên thẻ đọc được lâu nhất có thể.
 */
function nenGhep(files) {
  var tran = Math.floor((Number(anhCH.toi_da_kb) || 800) * 1024 * 0.95);   // chừa 5% cho chắc
  return Promise.all(files.map(napAnh_)).then(function (ds) {
    try {
      var canh = ds.length > 1 ? 2400 : 1600;
      for (var vong = 0; vong < 4; vong++) {
        var c = veGhep(ds, canh);
        var bac = [0.8, 0.7, 0.6];
        for (var i = 0; i < bac.length; i++) {
          var b64 = c.toDataURL('image/jpeg', bac[i]).replace(/^data:[^,]*,/, '');
          // Chuỗi quá ngắn = trình duyệt vẽ hỏng (ra "data:," trơn) — đừng gửi thứ đó đi
          if (b64.length > 200 && soByteB64(b64) <= tran) return b64;
        }
        canh = Math.round(canh * 0.75);
      }
      throw new Error('Ảnh vẫn quá lớn sau khi nén');
    } finally { ds.forEach(function (a) { a.dong(); }); }
  });
}

function guiAnh() {
  if (anhDangGui || !anhMa) return;
  var dongY = $('dong_y_anh');
  if (dongY && !dongY.checked) { ttAnh('loi', 'Cần xác nhận đồng ý gửi ảnh trước khi gửi.'); return; }
  var maGui = anhMa;
  var files = [];
  if (anhChon.truoc) files.push(anhChon.truoc);
  if (anhChon.sau) files.push(anhChon.sau);
  if (!files.length) return;
  var mat = files.length === 2 ? 'ca_hai' : (anhChon.truoc ? 'truoc' : 'sau');
  anhDangGui = 1;
  veOAnh();
  ttAnh('', files.length === 2 ? 'Đang ghép 2 mặt và nén…' : 'Đang nén ảnh…');
  nenGhep(files).then(function (b64) {
    var kb = Math.round(soByteB64(b64) / 1024);
    ttAnh('', 'Đang gửi… (' + kb + ' KB)');
    return goiAPI({ token: TOKEN_API, hanh_dong: 'gui_anh', ma_ld: maGui, mat: mat, anh_b64: b64 })
      .then(function (kq) {
        if (kq && kq.ok) {
          datLaiAnh();   // gửi xong thì bỏ ảnh khỏi bộ nhớ trang ngay
          ttAnh('xong', '✓ Đã gửi vào nhóm' + (mat === 'ca_hai' ? ' — 2 mặt trong một tin' : ''));
          return;
        }
        var guiLai = !(kq && LOI_KHONG_GUI_LAI.indexOf(kq.ma) >= 0);
        ttAnh('loi', thoat((kq && kq.loi) || 'Máy chủ không nhận ảnh') +
          (guiLai ? ' — bấm Gửi để thử lại.' : ''));
      }, function () {
        ttAnh('loi', 'Mất mạng, chưa gửi được — bấm Gửi để thử lại.');
      });
  }).catch(function () {
    ttAnh('loi', 'Không đọc được ảnh này. Chụp lại giúp nhé.');
  }).then(function () {
    anhDangGui = 0;
    veOAnh();
  });
}

['truoc', 'sau'].forEach(function (mat) {
  var o = $('file_anh_' + mat);
  if (o) o.addEventListener('change', function () {
    var f = this.files && this.files[0];
    this.value = '';
    chonAnh(mat, f);
  });
});

(function () {
  var o = $('file_anh_ca_hai');
  if (!o) return;
  o.addEventListener('change', function () {
    var ds = Array.prototype.slice.call(this.files || [], 0, 2);
    this.value = '';
    // Ảnh thứ nhất vào mặt trước, ảnh thứ hai vào mặt sau — sai thứ tự thì bấm "Đổi chỗ".
    if (ds[0]) chonAnh('truoc', ds[0]);
    if (ds[1]) chonAnh('sau', ds[1]);
  });
})();


// ====== HẾT ẢNH THẺ CCCD ======
