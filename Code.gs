// ============================================================
// FILE: Code.gs — Google Apps Script Nhận Dữ Liệu Chatbot Lead
// MỤC ĐÍCH: Nhận dữ liệu từ chatbot AI (name, phone, email, 
//           session, chat history) và ghi vào Google Sheets.
//           Nếu cùng session → CẬP NHẬT dòng cũ (gộp lại).
//           Nếu session mới → TẠO dòng mới.
// ============================================================
// HƯỚNG DẪN:
// 1. Mở Google Sheets "Chatbot Leads Database"
// 2. Tạo 7 cột tiêu đề dòng 1: Thời gian | Tên | SĐT | Email | Nguồn | Session ID | Lịch sử Chat
// 3. Lấy Spreadsheet ID từ URL (phần giữa /d/ và /edit)
// 4. Thay 'YOUR_SPREADSHEET_ID' bên dưới bằng ID thật
// 5. Vào Extensions → Apps Script → Dán code này
// 6. Deploy → New Deployment → Web App → Execute as Me → Anyone
// ============================================================

function doPost(e) {
  try {
    // ⚠️ THAY 'YOUR_SPREADSHEET_ID' BẰNG ID THẬT CỦA GOOGLE SHEETS
    var sheet = SpreadsheetApp.openById('YOUR_SPREADSHEET_ID').getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    var newTime = data.timestamp || new Date().toLocaleString('vi-VN');
    var newName = data.name || '';
    var newPhone = data.phone || '';
    var newEmail = data.email || '';
    var newSource = data.source || '';
    var newSessionId = data.sessionId || '';
    var newHistory = data.chatHistory || '';
    var newInterest = data.interest || '';
    var newIntentLevel = data.intent_level || '';

    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();
    var rowIndexToUpdate = -1;

    // Tìm dòng có cùng Session ID (cột F = index 5)
    if (newSessionId) {
      for (var i = values.length - 1; i > 0; i--) { 
        var rowSessionId = values[i][5] ? values[i][5].toString().trim() : '';
        if (rowSessionId === newSessionId) {
          rowIndexToUpdate = i + 1; // sheet row (1-indexed)
          break;
        }
      }
    }

    if (rowIndexToUpdate > -1) {
      // ============ CẬP NHẬT GỘP (Session đã tồn tại) ============
      var currentRow = values[rowIndexToUpdate - 1];
      
      // Chỉ ghi đè nếu thông tin cũ đang TRỐNG
      if (!currentRow[1] && newName) sheet.getRange(rowIndexToUpdate, 2).setValue(newName);
      if (!currentRow[2] && newPhone) sheet.getRange(rowIndexToUpdate, 3).setValue(newPhone);
      if (!currentRow[3] && newEmail) sheet.getRange(rowIndexToUpdate, 4).setValue(newEmail);
      
      // Cập nhật interest và intent_level
      if (newInterest) sheet.getRange(rowIndexToUpdate, 8).setValue(newInterest);
      if (newIntentLevel) sheet.getRange(rowIndexToUpdate, 9).setValue(newIntentLevel);
      
      // Ghi đè lịch sử chat = bản mới nhất (đầy đủ nhất)
      if (newHistory) sheet.getRange(rowIndexToUpdate, 7).setValue(newHistory);
      
      // Cập nhật thời gian tương tác mới nhất
      sheet.getRange(rowIndexToUpdate, 1).setValue(newTime);
    } else {
      // ============ TẠO DÒNG MỚI (Session chưa tồn tại) ============
      sheet.appendRow([newTime, newName, newPhone, newEmail, newSource, newSessionId, newHistory, newInterest, newIntentLevel]);
    }
    
    // ============ GỬI EMAIL CẢNH BÁO NẾU KHÁCH "HOT" ============
    // Gửi email bằng MailApp nếu intent_level là 'hot'
    var isHot = (newIntentLevel.trim().toLowerCase() === 'hot');
    var wasHot = (currentRow && currentRow.length > 8 && currentRow[8] && currentRow[8].toString().trim().toLowerCase() === 'hot');
    
    if (isHot && !wasHot) {
      // Đã gán cứng email nhận thông báo theo yêu cầu
      var emailRecipient = "nguyenductien4132@gmail.com"; 
      
      var subject = "📢 KHÁCH HÀNG NÓNG - CẦN LIÊN HỆ NGAY!";
      var body = "📢 KHÁCH HÀNG NÓNG - CẦN LIÊN HỆ NGAY!\n\n" +
                 "Tên: " + (newName || "[Chưa có]") + "\n" +
                 "SĐT: " + (newPhone || "[Chưa có]") + "\n" +
                 "Email: " + (newEmail || "[Chưa có]") + "\n" +
                 "Quan tâm: " + (newInterest || "[Chưa có]") + "\n" +
                 "Thời gian: " + newTime + "\n\n" +
                 "Vui lòng liên hệ khách hàng này trong vòng 30 phút!";
                 
      try {
        MailApp.sendEmail(emailRecipient, subject, body);
      } catch (err) {
        // Log báo lỗi vào sheet để bạn dễ xem (Ghi đè vào Lịch sử Chat để debug, bạn có thể xoá sau)
        sheet.getRange(rowIndexToUpdate > -1 ? rowIndexToUpdate : dataRange.getLastRow() + 1, 7).setValue(newHistory + "\n\n[LỖI GỬI EMAIL]: " + err.toString());
      }
    }
    
    return ContentService.createTextOutput(
      JSON.stringify({ status: 'success' })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: 'error', message: error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput(
    "API Chatbot Leads đang hoạt động ngon lành! ✅"
  );
}
