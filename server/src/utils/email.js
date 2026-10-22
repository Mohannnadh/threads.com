const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendOtpEmail = async (email, otp) => {
  console.log('Sending OTP email to:', email);

  const info = await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Threads.com Password Reset OTP',
    text: `Your Threads.com password reset OTP is ${otp}. It expires in 5 minutes.`,
  });

  console.log('Email sent successfully:', info.messageId);
};

module.exports = {
  sendOtpEmail,
};