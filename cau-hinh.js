/* ============================================================
 * CẤU HÌNH NỐI TRANG ↔ MÁY CHỦ
 * Tệp DUY NHẤT phải sửa khi dựng bộ trang cho một hệ khác (khách khác, dự án thử).
 * ============================================================
 * Cả 4 trang (index, doncong, danhsach, phancong) cùng đọc tệp này.
 * Mỗi bộ trang — mỗi kho GitHub — giữ MỘT bản riêng của tệp này.
 *
 *   URL_API   = link /exec của dự án Apps Script (Deploy → Manage deployments)
 *   TOKEN_API = mã bí mật — trong Sheet: ⚙ Hệ thống lao động → Xem mã bí mật API (token)
 *
 * ⚠️ Chép bộ trang sang kho khác mà KHÔNG sửa tệp này thì trang mới vẫn ghi vào Sheet của hệ
 *    cũ và bắn tin vào nhóm Zalo cũ — trông vẫn chạy bình thường, không báo lỗi gì.
 *    Máy chủ của hệ mới cũng phải khai ô dia_chi_trang (tab CAUHINH) trỏ về kho mới.
 *
 * Bản này thuộc hệ: https://cungungminhduc.github.io/dangky-lao-dong/
 */
var URL_API   = 'https://script.google.com/macros/s/AKfycbyTVKM348F35_JYjaQC_ZD9GzutpOQ5JeO2JZElgN90wPSEH4CAqqt84gOYhTi2Kw/exec';
var TOKEN_API = '0a56b54fe2ed44369c5e91db';
