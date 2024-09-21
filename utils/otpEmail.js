const transporter = require("../config/gmail");
const userOTPVerification = require("../app/models/userOTPVerification");

const sendOTPEmail = async (userEmail, otp) => {
  const mailOptions = {
    from: {
      name: "EBloom",
      address: process.env.GMAIL_USER,
    }, // Replace with your Gmail email
    to: userEmail,
    subject: "Your OTP Code",
    text: `Your OTP code is ${otp}. It will expire in 5 minutes.`,
  };

  try {
    let sent = await transporter.sendMail(mailOptions);
    if (sent) return true;
  } catch (error) {
    console.error("Error sending OTP email:", error);
    throw new Error("Email could not be sent");
  }
};

module.exports = { sendOTPEmail };
