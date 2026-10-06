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
 *   - CHỈ tự thử lại cú CHỈ ĐỌC, đúng MỘT lần. Cú GHI không bao giờ tự gửi lại: máy chủ có thể
 *     đã ghi xong, chỉ là câu trả lời không về tới. Luồng ghi có lưới riêng (cất phiếu, hàng chờ
 *     trang đón) và máy chủ soát trùng.
 *   - QUA_TAI không thử lại: trần tính theo phút, thử lại trong cùng phút chỉ đếm thêm.
 */
var GOI_CHI_DOC = ['danh_sach_cong_ty', 'kiem_tra', 'tra_cuu_don', 'cong_ty_cua_toi', 'danh_sach_don', 'pc_bang',
                   // 3.28 — trang báo quân số. qs_luu_nhap / qs_chot / qs_gui_lai là cú GHI: không thêm vào đây.
                   'qs_don_vi', 'qs_mo', 'qs_xem_truoc', 'qs_trang_thai_gui', 'qs_tong_hop'];

// Hạn chờ MỖI lượt. Cao hơn hẳn thời gian thường (2–5 giây; cú ghi có thể chờ khoá tới 20 giây)
// — chỉ để cắt những cú treo thật, không phải để giục máy chủ.
var GOI_HAN_MS = { doc: 40000, ghi: 90000, gui_anh: 120000 };
var GOI_CHO_THU_LAI_MS = 1500;

/** Lỗi có `.loai` để trang chọn câu báo: 'mang' · 'het_gio' · 'may_chu'. */
function loiGoi_(loai) {
  var e = new Error({
    mang: 'Không nối được máy chủ — sóng yếu hoặc máy chủ Google đang chập chờn.',
    het_gio: 'Máy chủ trả lời quá lâu.',
    may_chu: 'Máy chủ Google đang trục trặc.'
  }[loai]);
  e.loai = loai;
  return e;
}

/**
 * Gửi `body` lên máy chủ. Trả JSON máy chủ (kể cả ok:false — đó là câu trả lời thật, không phải
 * hỏng mạng); chỉ TỪ CHỐI khi không có câu trả lời đọc được.
 */
function goiMayChu_(body) {
  var viec = body && body.hanh_dong;
  var chiDoc = GOI_CHI_DOC.indexOf(viec) >= 0;
  var han = viec === 'gui_anh' ? GOI_HAN_MS.gui_anh : (chiDoc ? GOI_HAN_MS.doc : GOI_HAN_MS.ghi);
  var noi = JSON.stringify(body);

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

  function thu(conLai) {
    return motLuot().then(function (kq) {
      if (conLai > 0 && kq && kq.ma === 'LOI_HE_THONG') return doi().then(function () { return thu(conLai - 1); });
      return kq;
    }, function (e) {
      if (conLai > 0) return doi().then(function () { return thu(conLai - 1); });
      throw e;
    });
  }

  return thu(chiDoc ? 1 : 0);
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
