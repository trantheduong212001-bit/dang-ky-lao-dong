/* ============================================================
 * GÓI ĐẦU + BẢN NHỚ — dùng chung trang chủ và các trang có số (bản 3.36)
 * ============================================================
 * Nạp SAU goi-may-chu.js, TRƯỚC mã chính của trang. Đặc tả: .scratch/trang-chu-goi-dau-3.36/DAC-TA.md
 *
 * Vì sao có tệp này: mỗi lượt gọi máy chủ tốn ~3 giây cố định (đo 08/10/2026) và trần 40 lượt/phút là trần CHUNG
 * cả hệ. Trang chủ lấy MỘT gói cho nhiều mục; trang con mở ra dùng luôn gói đó nếu còn tươi, khỏi gọi lại.
 *
 * LUẬT — đừng nới:
 *   - Gói chỉ dùng được với ĐÚNG vé đã lấy nó. Máy dùng chung, người khác đăng nhập → không bao giờ thấy gói cũ.
 *   - Quá HAN_TUOI_MS thì vẫn được BÀY (mờ, ghi giờ) nhưng trang phải lấy lại; trong hạn mới được coi là số mới.
 *   - Mốc lưu lạ hoặc ở TƯƠNG LAI (đồng hồ máy bị chỉnh lùi) → coi như đã cũ, không bao giờ coi là tươi.
 *   - Ghi xong ở mục nào → boMucGoi_ mục đó: quay lại không được thấy số TRƯỚC khi ghi.
 *   - localStorage hỏng / đầy / bị chặn → mọi hàm im lặng trả "không có", trang tự lấy như chưa có tệp này.
 */
var KHOA_GOI = 'goi_dau_v1';
var HAN_TUOI_MS = 2 * 60 * 1000;   // Dương chốt 24/10/2026

// Bản nhớ DỮ LIỆU của các trang — đăng xuất / vé hết / đổi tài khoản là xoá hết. Đánh dấu chưa gửi của danh sách
// ('tuyendung_chua_gui_v1') cố ý KHÔNG nằm đây: đăng nhập lại là gửi tiếp được (bản 3.32).
var KHOA_NHO_PHAN_CONG = 'phancong_nho_v1';
var KHOA_NHO_QUAN_SO = 'quanso_nho_v1';
var KHOA_BAN_NHO = [KHOA_GOI, 'tuyendung_ds_v1', KHOA_NHO_PHAN_CONG, KHOA_NHO_QUAN_SO];

function docKhoa_(k) {
  try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; }
}
function ghiKhoa_(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}   // đầy bộ nhớ thì thôi, không đáng chặn việc
}

/** Tuổi (ms) của một mốc lưu. Mốc lạ hoặc ở tương lai → vô hạn (đã cũ). */
function tuoiMs_(luc, bayGio) {
  var n = Number(luc), t = bayGio == null ? Date.now() : bayGio;
  if (!n || n > t) return Infinity;
  return t - n;
}
function conTuoi_(luc, bayGio) { return tuoiMs_(luc, bayGio) < HAN_TUOI_MS; }

/** "07:12" — giờ máy của mốc lưu, để ghi "số lúc …" cạnh mọi con số lấy từ bản nhớ. */
function gioLuc_(luc) {
  var d = new Date(Number(luc)), hai = function (x) { return (x < 10 ? '0' : '') + x; };
  return hai(d.getHours()) + ':' + hai(d.getMinutes());
}

/** Cất gói vừa nhận, gắn với vé đã dùng để lấy nó. Gói hỏng (ok:false) không cất. */
function luuGoi_(phien, goi) {
  if (phien && goi && goi.ok) ghiKhoa_(KHOA_GOI, { phien: phien, luc: Date.now(), goi: goi });
}

/** { phien, luc, goi } của đúng vé đang có, hoặc null. */
function layGoi_(phien) {
  var v = docKhoa_(KHOA_GOI);
  return (v && phien && v.phien === phien && v.goi && v.goi.muc) ? v : null;
}

/**
 * Một mục trong gói: { luc, kq, tai_khoan } — chỉ khi mục đó đọc được. `ngay` cho danh sách (gói giữ theo từng ngày).
 * Mục hỏng / không có (nhân viên không có phân công) → null: trang tự lấy.
 */
function layMucGoi_(phien, muc, ngay) {
  var v = layGoi_(phien);
  if (!v) return null;
  var kq = v.goi.muc[muc];
  if (kq && ngay) kq = kq[ngay];
  if (!kq || !kq.ok) return null;
  return { luc: v.luc, kq: kq, tai_khoan: v.goi.tai_khoan };
}

/** Ghi xong ở mục nào → bỏ mục đó khỏi gói. Mục khác giữ nguyên. */
function boMucGoi_(muc) {
  var v = docKhoa_(KHOA_GOI);
  if (!v || !v.goi || !v.goi.muc || !(muc in v.goi.muc)) return;
  delete v.goi.muc[muc];
  ghiKhoa_(KHOA_GOI, v);
}

/** Bản nhớ riêng của một trang (phân công, quân số): số lần trước + tài khoản để vẽ trước khi máy chủ trả lời. */
function luuBanNho_(khoa, phien, ngay, kq, taiKhoan) {
  if (phien && kq && kq.ok) ghiKhoa_(khoa, { phien: phien, luc: Date.now(), ngay: ngay, kq: kq, tai_khoan: taiKhoan || null });
}
function layBanNho_(khoa, phien, ngay) {
  var v = docKhoa_(khoa);
  return (v && phien && v.phien === phien && v.ngay === ngay && v.kq) ? v : null;
}
/** Ghi xong → bản nhớ của trang đó là số TRƯỚC khi ghi: bỏ, để lần mở sau không bày lại như số đang đúng. */
function xoaBanNho_(khoa) {
  try { localStorage.removeItem(khoa); } catch (e) {}
}

/** Cái MỚI HƠN trong hai bản ({ luc, … } hoặc null). */
function moiHon_(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  return Number(b.luc) > Number(a.luc) ? b : a;
}

/** Đăng xuất / vé hết / đổi tài khoản: xoá gói + mọi bản nhớ dữ liệu. Không đụng vé, không đụng đánh dấu chưa gửi. */
function xoaHetBanNho_() {
  KHOA_BAN_NHO.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
}
