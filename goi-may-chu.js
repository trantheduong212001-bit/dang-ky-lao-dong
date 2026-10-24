/* ============================================================
 * GỌI MÁY CHỦ — dùng chung cho cả 4 trang (bản 3.27)
 * ============================================================
 * Nạp SAU cau-hinh.js (cần URL_API), TRƯỚC mã chính của trang.
 *
 * Vì sao có tệp này — đo thật 19/09/2026 (.scratch/lag-truy-cap/): máy chủ chậm ĐỀU 2–5 giây
 * mỗi cú nhưng không chết. Người dùng thấy "không vào được" là do cách trang đón trục trặc:
 *   - không có hết giờ: một cú treo trên sóng yếu là nút quay mãi;
 *   - không thử lại: Google chập một lần là trang báo "mất mạng";
 *   - lỗi của Apps Script về tới trình duyệt dạng trang HTML thiếu CORS → trông y như mất mạng.
 *
 * LUẬT — đừng nới:
 *   - CHỈ tự thử lại cú CHỈ ĐỌC (+ `dang_nhap`, xem GOI_GUI_LAI_DUOC), đúng MỘT lần. Cú GHI khác không bao giờ tự gửi lại: máy chủ có thể
 *     đã ghi xong, chỉ là câu trả lời không về tới. Luồng ghi có lưới riêng (cất phiếu, hàng chờ
 *     trang đón) và máy chủ soát trùng.
 *   - QUA_TAI không thử lại: trần tính theo phút, thử lại trong cùng phút chỉ đếm thêm.
 */
var GOI_CHI_DOC = ['danh_sach_cong_ty', 'kiem_tra', 'tra_cuu_don', 'cong_ty_cua_toi', 'danh_sach_don', 'pc_bang',
                   // 3.28 — trang báo quân số. qs_luu_nhap / qs_chot / qs_gui_lai là cú GHI: không thêm vào đây.
                   'qs_don_vi', 'qs_mo', 'qs_xem_truoc', 'qs_trang_thai_gui', 'qs_tong_hop',
                   // 3.33 — trang dữ liệu tuyển. dlt_dang_ky_lai là cú GHI, dlt_xuat ghi vết: không thêm vào đây.
                   'dlt_mo', 'dlt_kiem',
                   // 3.36 — gói đầu của trang chủ: chỉ đọc (lan_mo_cuoi là vết, ghi lại vô hại)
                   'goi_dau'];

// Cú GHI mà gửi lại vô hại (bản 3.32): `dang_nhap` chỉ ghi mốc "đăng nhập lần cuối" + một dòng nhật ký,
// vé mới thay vé cũ. Trước 3.32 nó bị tính là cú ghi: hạn 90 giây, không thử lại — Dương báo 16/10/2026
// bấm Đăng nhập lúc cao điểm ở khu công nghiệp là nút đứng im rồi văng lỗi. Đừng thêm cú ghi khác vào đây.
var GOI_GUI_LAI_DUOC = ['dang_nhap'];

// Hạn chờ MỖI lượt. Cú đọc (và đăng nhập): 20 giây lượt đầu, 30 giây lượt thử lại. Đo Executions
// 12–16/10/2026, 1.011 cú: máy chủ xử lý trung vị 3,1 giây, 99% dưới 16 giây, kể cả giờ cao điểm 7h. Cú nào
// quá 20 giây gần như luôn là kẹt trên đường SÓNG — bỏ kết nối đó, mở kết nối mới, thay vì chờ 40 giây như
// bản 3.27 (tới 81,5 giây mới báo lỗi). Cú ghi giữ 90 giây: máy chủ có thể đang chờ khoá tới 20 giây.
var GOI_HAN_MS = { doc: [20000, 30000], ghi: 90000, gui_anh: 120000 };
var GOI_CHO_THU_LAI_MS = 1500;

/* ĐO CHỜ PHÍA TRANG (bản 3.32). Executions chỉ cho biết MÁY CHỦ chạy bao lâu, không biết người dùng ngồi
 * chờ bao lâu trên sóng yếu. Cú nào chờ từ 8 giây trở lên hoặc hỏng thì ghi lại trong máy, cú sau mang
 * lên máy chủ (`do_cham`) để ghi một dòng NHATKY `cho_trang`. Không có dữ liệu cá nhân: chỉ tên việc,
 * số mili giây, số lượt, kết quả, có mở trong Zalo không. */
var KHOA_DO_CHAM = 'goi_do_cham_v1';
var DO_CHAM_TU_MS = 8000;

function trongZalo_() {
  return typeof navigator !== 'undefined' && /Zalo/i.test(navigator.userAgent || '');
}

function ghiDoCham_(viec, ms, lan, ketQua) {
  if (ketQua === 'ok' && ms < DO_CHAM_TU_MS) return;
  try {
    localStorage.setItem(KHOA_DO_CHAM, JSON.stringify({ viec: viec, ms: ms, lan: lan, kq: ketQua, zalo: trongZalo_() }));
  } catch (e) {}
}

/** LẤY RA số đo đang chờ (đọc rồi xoá ngay) — trang mở hay bắn 2 cú song song, đọc mà chưa xoá thì cả hai
 *  cùng mang một số đo và NHATKY ghi trùng (đo thật trên trình duyệt 16/10/2026). Cú mang nó đi mà hỏng thì
 *  chính cú đó ghi số đo mới hơn của nó. */
function layDoCham_() {
  try {
    var v = JSON.parse(localStorage.getItem(KHOA_DO_CHAM) || 'null');
    if (v) localStorage.removeItem(KHOA_DO_CHAM);
    return v;
  } catch (e) { return null; }
}

/** Lỗi có `.loai` để trang chọn câu báo: 'mang' · 'het_gio' · 'may_chu'. */
function loiGoi_(loai) {
  var e = new Error({
    mang: 'Không nối được máy chủ — sóng yếu hoặc máy chủ Google đang chập chờn.',
    het_gio: 'Chờ quá lâu — sóng yếu hoặc máy chủ chậm.',
    may_chu: 'Máy chủ Google đang trục trặc.'
  }[loai]);
  e.loai = loai;
  return e;
}

/**
 * Gửi `body` lên máy chủ. Trả JSON máy chủ (kể cả ok:false — đó là câu trả lời thật, không phải
 * hỏng mạng); chỉ TỪ CHỐI khi không có câu trả lời đọc được.
 *
 * `tuy.khiThuLai(lanThu)` (tuỳ chọn, 3.32): gọi ngay trước lượt thử lại, để trang nói "đang thử lần 2".
 */
function goiMayChu_(body, tuy) {
  var viec = body && body.hanh_dong;
  var thuLaiDuoc = GOI_CHI_DOC.indexOf(viec) >= 0 || GOI_GUI_LAI_DUOC.indexOf(viec) >= 0;
  var hanLuot = viec === 'gui_anh' ? [GOI_HAN_MS.gui_anh] : (thuLaiDuoc ? GOI_HAN_MS.doc : [GOI_HAN_MS.ghi]);
  var han = hanLuot[0];
  var doTruoc = layDoCham_();
  var gui = body;
  if (doTruoc && body) {
    gui = {};
    for (var k in body) if (Object.prototype.hasOwnProperty.call(body, k)) gui[k] = body[k];
    gui.do_cham = doTruoc;
  }
  var noi = JSON.stringify(gui);
  var t0 = Date.now(), lan = 1;

  function motLuot() {
    var dk = typeof AbortController === 'function' ? new AbortController() : null;
    var hen;
    var hetGio = new Promise(function (_, sai) {
      // Báo hết giờ TRƯỚC rồi mới huỷ fetch — để lỗi "hết giờ" thắng, không bị đọc thành "mất mạng".
      hen = setTimeout(function () { sai(loiGoi_('het_gio')); if (dk) dk.abort(); }, han);
    });
    var goi = fetch(URL_API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                               body: noi, signal: dk ? dk.signal : undefined })
      .then(function (r) { return r.text(); }, function () { throw loiGoi_('mang'); })
      .then(function (t) {
        try { return JSON.parse(t); } catch (e) { throw loiGoi_('may_chu'); }
      });
    return Promise.race([goi, hetGio]).then(
      function (kq) { clearTimeout(hen); return kq; },
      function (e) { clearTimeout(hen); throw (e && e.loai) ? e : loiGoi_('mang'); });
  }

  function doi() { return new Promise(function (ok) { setTimeout(ok, GOI_CHO_THU_LAI_MS); }); }

  function thuLai(conLai) {
    return doi().then(function () {
      lan++;
      han = hanLuot[Math.min(lan - 1, hanLuot.length - 1)];
      if (tuy && typeof tuy.khiThuLai === 'function') { try { tuy.khiThuLai(lan); } catch (e) {} }
      return thu(conLai - 1);
    });
  }

  function thu(conLai) {
    return motLuot().then(function (kq) {
      if (conLai > 0 && kq && kq.ma === 'LOI_HE_THONG') return thuLai(conLai);
      return kq;
    }, function (e) {
      if (conLai > 0) return thuLai(conLai);
      throw e;
    });
  }

  return thu(thuLaiDuoc ? 1 : 0).then(function (kq) {
    ghiDoCham_(viec, Date.now() - t0, lan, 'ok');
    return kq;
  }, function (e) {
    ghiDoCham_(viec, Date.now() - t0, lan, (e && e.loai) || 'mang');
    throw e;
  });
}

/* ------------------------------------------------------------
 * DANH SÁCH NHÀ MÁY — hiện NGAY từ bản nhớ, lấy bản mới ngầm (bản 3.27)
 * ------------------------------------------------------------
 * Trang đăng ký từng mở ra trắng tinh 2–3 giây mỗi lần chỉ để chờ danh sách này (đo 19/09/2026).
 * Trang đăng ký và trang đón dùng CHUNG một bản nhớ.
 *
 *   khiCo(kq, lucNho) — lucNho > 0: bản nhớ (mốc lưu) · 0: bản mới của máy chủ. Có thể gọi 2 lần.
 *   khiLoi(loi, coNho) — không lấy được bản mới; `loi` là Error của goiMayChu_ hoặc JSON ok:false.
 */
var KHOA_DS_CT = 'ds_cong_ty_v1';

function napDsCongTy_(khiCo, khiLoi) {
  var nho = null;
  try { nho = JSON.parse(localStorage.getItem(KHOA_DS_CT) || 'null'); } catch (e) { nho = null; }
  var coNho = !!(nho && nho.kq && nho.kq.ok && nho.kq.danh_sach);
  // Áp bản nhớ SAU khi mã trang chạy xong (microtask), không áp ngay: trang gọi hàm này giữa chừng
  // mã khởi động, biến khai phía dưới lời gọi (vd `var dsCa = []`) sẽ đè mất thứ vừa áp.
  if (coNho) Promise.resolve().then(function () { khiCo(nho.kq, Number(nho.luc) || 1); });
  goiMayChu_({ token: TOKEN_API, hanh_dong: 'danh_sach_cong_ty' }).then(function (kq) {
    if (!(kq && kq.ok)) { khiLoi(kq, coNho); return; }
    try { localStorage.setItem(KHOA_DS_CT, JSON.stringify({ luc: Date.now(), kq: kq })); } catch (e) {}
    khiCo(kq, 0);
  }, function (e) { khiLoi(e, coNho); });
}
