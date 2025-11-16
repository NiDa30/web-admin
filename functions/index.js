const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: functions.config().email?.user || process.env.EMAIL_USER,
    pass: functions.config().email?.password || process.env.EMAIL_PASSWORD,
  },
});

/**
 * Send password change email notification
 */
exports.sendPasswordChangeEmail = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    const { email, userName, isNewPassword } = req.body;

    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const subject = isNewPassword
      ? "Mật khẩu đã được tạo thành công - Family Budget"
      : "Mật khẩu đã được thay đổi - Family Budget";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .alert {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 12px;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔒 Thông báo bảo mật</h1>
        </div>
        <div class="content">
          <h2>${isNewPassword ? "Mật khẩu đã được tạo thành công" : "Mật khẩu đã được thay đổi"}</h2>
          
          <p>Xin chào <strong>${userName || email}</strong>,</p>
          
          <p>${
            isNewPassword
              ? `Mật khẩu cho tài khoản <strong>${email}</strong> đã được tạo thành công. Bây giờ bạn có thể đăng nhập bằng email và mật khẩu.`
              : `Mật khẩu cho tài khoản <strong>${email}</strong> đã được thay đổi thành công.`
          }</p>
          
          <div class="alert">
            <strong>⚠️ Lưu ý bảo mật:</strong><br>
            Nếu bạn không thực hiện thao tác này, vui lòng:
            <ul>
              <li>Liên hệ quản trị viên ngay lập tức</li>
              <li>Đổi lại mật khẩu nếu có thể</li>
              <li>Kiểm tra hoạt động đăng nhập gần đây</li>
            </ul>
          </div>
          
          <p>Thời gian: ${new Date().toLocaleString("vi-VN")}</p>
          
          <p>Trân trọng,<br>Đội ngũ Family Budget</p>
        </div>
        <div class="footer">
          <p>Email này được gửi tự động. Vui lòng không trả lời email này.</p>
          <p>© 2025 Family Budget. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    const textContent = `
${isNewPassword ? "Mật khẩu đã được tạo thành công" : "Mật khẩu đã được thay đổi"}

Xin chào ${userName || email},

${
  isNewPassword
    ? `Mật khẩu cho tài khoản ${email} đã được tạo thành công. Bây giờ bạn có thể đăng nhập bằng email và mật khẩu.`
    : `Mật khẩu cho tài khoản ${email} đã được thay đổi thành công.`
}

⚠️ Lưu ý bảo mật:
Nếu bạn không thực hiện thao tác này, vui lòng liên hệ quản trị viên ngay lập tức và đổi lại mật khẩu.

Thời gian: ${new Date().toLocaleString("vi-VN")}

Trân trọng,
Đội ngũ Family Budget
    `;

    const mailOptions = {
      from: `"Family Budget" <${functions.config().email?.user || process.env.EMAIL_USER}>`,
      to: email,
      subject: subject,
      text: textContent,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);

    console.log(`✅ Password change email sent to ${email}`);
    res.status(200).json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    console.error("❌ Error sending password change email:", error);
    res.status(500).json({ error: "Failed to send email", message: error.message });
  }
});

/**
 * Change user password (Admin function)
 * This function allows admins to change user passwords using Firebase Admin SDK
 */
exports.changeUserPassword = functions.https.onCall(async (data, context) => {
  // Verify that the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated to change passwords"
    );
  }

  const { userId, newPassword } = data;

  if (!userId || !newPassword) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "userId and newPassword are required"
    );
  }

  // Validate password strength
  if (newPassword.length < 6) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Password must be at least 6 characters long"
    );
  }

  try {
    // Get current user data from Firestore to check permissions
    const currentUserId = context.auth.uid;
    const currentUserDoc = await admin.firestore()
      .collection("users")
      .doc(currentUserId)
      .get();

    if (!currentUserDoc.exists) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Current user not found in database"
      );
    }

    const currentUserData = currentUserDoc.data();
    const isSuperAdmin = currentUserData.isSuperAdmin === true;
    const isAdmin = currentUserData.role === "ADMIN";

    // Only admins and super admins can change passwords
    if (!isSuperAdmin && !isAdmin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only admins can change user passwords"
      );
    }

    // Prevent changing Super Admin password (unless you are Super Admin yourself)
    const targetUserDoc = await admin.firestore()
      .collection("users")
      .doc(userId)
      .get();

    if (!targetUserDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Target user not found"
      );
    }

    const targetUserData = targetUserDoc.data();
    if (targetUserData.isSuperAdmin === true && !isSuperAdmin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Cannot change Super Admin password"
      );
    }

    // Get the email for the user
    const userRecord = await admin.auth().getUser(userId);
    const email = userRecord.email;

    // Update password using Admin SDK
    await admin.auth().updateUser(userId, {
      password: newPassword,
    });

    // Send notification email
    try {
      const subject = "Mật khẩu đã được thay đổi - Family Budget";
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .alert {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🔒 Thông báo bảo mật</h1>
          </div>
          <div class="content">
            <h2>Mật khẩu đã được thay đổi</h2>
            
            <p>Xin chào <strong>${targetUserData.name || email}</strong>,</p>
            
            <p>Mật khẩu cho tài khoản <strong>${email}</strong> đã được thay đổi bởi quản trị viên.</p>
            
            <div class="alert">
              <strong>⚠️ Lưu ý bảo mật:</strong><br>
              Nếu bạn không yêu cầu thay đổi mật khẩu, vui lòng:
              <ul>
                <li>Liên hệ quản trị viên ngay lập tức</li>
                <li>Kiểm tra hoạt động đăng nhập gần đây</li>
                <li>Xem xét thay đổi mật khẩu nếu cần thiết</li>
              </ul>
            </div>
            
            <p>Thời gian: ${new Date().toLocaleString("vi-VN")}</p>
            
            <p>Trân trọng,<br>Đội ngũ Family Budget</p>
          </div>
          <div class="footer">
            <p>Email này được gửi tự động. Vui lòng không trả lời email này.</p>
            <p>© 2025 Family Budget. All rights reserved.</p>
          </div>
        </body>
        </html>
      `;

      const textContent = `
Mật khẩu đã được thay đổi

Xin chào ${targetUserData.name || email},

Mật khẩu cho tài khoản ${email} đã được thay đổi bởi quản trị viên.

⚠️ Lưu ý bảo mật:
Nếu bạn không yêu cầu thay đổi mật khẩu, vui lòng liên hệ quản trị viên ngay lập tức.

Thời gian: ${new Date().toLocaleString("vi-VN")}

Trân trọng,
Đội ngũ Family Budget
      `;

      const mailOptions = {
        from: `"Family Budget" <${functions.config().email?.user || process.env.EMAIL_USER}>`,
        to: email,
        subject: subject,
        text: textContent,
        html: htmlContent,
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Password change notification email sent to ${email}`);
    } catch (emailError) {
      console.error("⚠️ Failed to send password change notification email:", emailError);
      // Don't fail the password change if email fails
    }

    console.log(`✅ Password changed for user ${userId} by admin ${currentUserId}`);
    return { success: true, message: "Password changed successfully" };
  } catch (error) {
    console.error("❌ Error changing user password:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      "internal",
      "Failed to change password",
      error.message
    );
  }
});

