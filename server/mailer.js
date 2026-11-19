import 'dotenv/config';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_APP_PASSWORD },
});

export async function sendOtpEmail(to, code) {
  await transporter.sendMail({
    from: `"WMSU ID System" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Your WMSU ID verification code',
    text: `Your verification code is ${code}. It expires in 5 minutes. If this wasn't you, ignore this email.`,
  });
}