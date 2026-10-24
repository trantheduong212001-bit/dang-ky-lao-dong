/* ============================================================
 * MỞ NGOÀI ZALO — dùng chung cho trang chủ + các trang có đăng nhập (bản 3.32 · trang chặn 3.36)
 * ============================================================
 * Dương báo 16/10/2026: mở link trong Zalo thì "rất hay bị" đợi đăng nhập lâu, đơ, văng lỗi; mở bằng
 * Chrome thì ít hơn. Trình duyệt bên trong Zalo giữ đăng nhập RIÊNG (tách khỏi trình duyệt của máy) và có thể xoá nó,
 * nên người dùng hay phải đăng nhập lại — tức thêm một lượt chờ dài trên sóng nghẽn.
 *
 * 3.36 (Dương 24/10/2026): dải nhắc bấm "Ẩn" được → TRANG CHẶN che cả màn:
 *   - Nút "Mở bằng trình duyệt": Android → intent:// KHÔNG gắn Chrome (máy dùng trình duyệt nào mở trình duyệt đó);
 *     iPhone → x-safari-https:// (Apple không có cách mở "trình duyệt mặc định", chỉ mở được Safari).
 *     Cả hai đều là MẸO, Zalo có thể chặn — nên luôn kèm đường tay: ⋯ → Mở bằng trình duyệt · Chép link.
 *   - Hướng dẫn bật một lần trong Zalo "Mở bằng trình duyệt web" — chắc nhất, từ đó mọi link tự ra ngoài.
 *   - Dòng phụ "Vẫn dùng trong Zalo" (Dương chốt giữ): gỡ trang chặn, nhớ trong phiên của tab.
 *   - Dương mở trên iPhone mà KHÔNG thấy nhắc → không dựa vào chữ "Zalo" trong user agent ở iPhone: trình duyệt
 *     nhúng trong ứng dụng (WKWebView) không có chữ "Safari/" như Safari, Chrome, Edge, Firefox trên iPhone đều có.
 *     Ứng dụng đã cài ra màn hình chính (navigator.standalone) cũng không có chữ đó — phải loại ra.
 *     Android cùng lý do: trình duyệt nhúng (WebView) luôn có dấu "; wv)" — Chrome và ứng dụng cài từ Chrome thì không.
 * Không đụng vào mã của trang. Thiếu tệp này thì trang vẫn chạy y như cũ, chỉ không bị chặn.
 * KHÔNG nạp ở trang đăng ký và trang đón (Dương 24/10/2026: không cần chặn hai trang này).
 */
(function () {
  var ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  var zalo = /Zalo/i.test(ua);
  var ios = /iPhone|iPad|iPod/i.test(ua);
  var android = /Android/i.test(ua);
  var nhungIOS = ios && !/Safari\//.test(ua) && !navigator.standalone;
  var nhungAndroid = android && /; wv\)/.test(ua);
  if (!zalo && !nhungIOS && !nhungAndroid) return;
  try { if (sessionStorage.getItem('an_nhac_zalo') === '1') return; } catch (e) {}

  var link = location.href.split('#')[0];
  var duong = location.host + location.pathname + location.search;
  var mo = ios ? 'x-safari-https://' + duong : (android ? 'intent://' + duong + '#Intent;scheme=https;end' : link);
  var noi = zalo ? 'Zalo' : 'Zalo hoặc ứng dụng khác';

  var d = document.createElement('div');
  d.id = 'chan_zalo';
  d.setAttribute('style', 'position:fixed;inset:0;z-index:2147483647;overflow:auto;background:#f4f6f8;color:#1f2933;' +
                          'font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;padding:28px 18px');
  var hop = 'max-width:440px;margin:0 auto';
  var nut = 'display:block;width:100%;box-sizing:border-box;margin:10px 0 0;padding:15px;border:0;border-radius:12px;' +
            'font:inherit;font-size:16.5px;font-weight:700;text-align:center;text-decoration:none;cursor:pointer;';
  var the = 'margin:16px 0 0;padding:13px 14px;border-radius:12px;background:#fff;border:1px solid #e6e9ed;font-size:14.5px';
  d.innerHTML = '<div style="' + hop + '">' +
    '<div style="font-size:19px;font-weight:800;text-align:center">Mở bằng trình duyệt để dùng</div>' +
    '<div style="margin-top:8px;text-align:center;color:#56606b;font-size:14.5px">Bạn đang mở trong ' + noi + ' — ở đây trang ' +
      'dễ chậm, đơ và hay bắt đăng nhập lại. Mở bằng trình duyệt của máy thì nhanh và nhớ đăng nhập.</div>' +
    '<a id="nz_mo" style="' + nut + 'margin-top:18px;background:#1f9d55;color:#fff" href="' + mo + '">Mở bằng trình duyệt</a>' +
    '<div style="' + the + '"><b>Bấm mà không chuyển?</b><br>Bấm <b>⋯</b> (hoặc biểu tượng trình duyệt) ở góc trên bên phải → ' +
      '<b>Mở bằng trình duyệt</b>. Hoặc chép link rồi dán vào trình duyệt.' +
      '<button type="button" id="nz_chep" style="' + nut + 'background:#eef1f4;color:#1f2933">Chép link</button></div>' +
    '<div style="' + the + '"><b>Làm một lần cho khỏi gặp lại</b><br>Trong Zalo: <b>Cá nhân</b> → <b>⚙ Cài đặt</b> → ' +
      '<b>Quyền riêng tư</b> → <b>Tiện ích</b> → tích <b>Mở bằng trình duyệt web</b>. Từ đó mọi link trong Zalo tự mở ' +
      'bằng trình duyệt.</div>' +
    '<div style="margin-top:22px;text-align:center"><a href="#" id="nz_van_dung" style="font-size:13.5px;color:#7b8794">' +
      'Vẫn dùng trong Zalo</a><div style="font-size:12px;color:#9aa3ad">(dễ chậm, hay phải đăng nhập lại)</div></div>' +
    '</div>';

  function gan() {
    document.body.insertBefore(d, document.body.firstChild);
    document.getElementById('nz_chep').addEventListener('click', function () {
      var b = this;
      function xong() { b.textContent = 'Đã chép — dán vào trình duyệt'; }
      // Trình duyệt trong Zalo có thể không cho chép tự động → hiện link cho người dùng tự chép.
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(xong, function () { prompt('Chép link này rồi dán vào trình duyệt:', link); });
      } else {
        prompt('Chép link này rồi dán vào trình duyệt:', link);
      }
    });
    document.getElementById('nz_van_dung').addEventListener('click', function (e) {
      if (e && e.preventDefault) e.preventDefault();
      try { sessionStorage.setItem('an_nhac_zalo', '1'); } catch (er) {}
      d.parentNode.removeChild(d);
    });
  }
  if (document.body) gan(); else document.addEventListener('DOMContentLoaded', gan);
})();
