import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../prisma/prisma.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Injectable()
export class AuthService {
  private transporter: nodemailer.Transporter;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendOtp(dto: SendOtpDto) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate previous unused OTPs for this email
    await this.prisma.otpCode.updateMany({
      where: { email: dto.email, used: false },
      data: { used: true },
    });

    await this.prisma.otpCode.create({
      data: { email: dto.email, code, expiresAt },
    });

    // Always log OTP in dev so you can test without real email
    console.log(`\n──────────────────────────────`);
    console.log(`  OTP for ${dto.email}: ${code}`);
    console.log(`──────────────────────────────\n`);

    // Send email if SMTP is configured
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await this.transporter.sendMail({
        from: `"Zeon_Work" <${process.env.SMTP_USER}>`,
        to: dto.email,
        subject: 'Your Zeon_Work verification code',
        html: `
          <div style="font-family:Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff;border:1px solid #D0D4E4;border-radius:12px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px">
              <div style="background:#0073EA;border-radius:8px;width:32px;height:32px;display:flex;align-items:center;justify-content:center">
                <span style="color:#fff;font-size:16px;font-weight:700">Z</span>
              </div>
              <span style="font-size:16px;font-weight:600;color:#323338">Zeon_Work</span>
            </div>
            <h2 style="font-size:20px;font-weight:600;color:#323338;margin:0 0 8px">Your verification code</h2>
            <p style="color:#676879;font-size:14px;margin:0 0 24px">Use this code to sign in to your account. It expires in 10 minutes.</p>
            <div style="background:#F5F6F8;border-radius:8px;padding:20px;text-align:center;letter-spacing:12px;font-size:32px;font-weight:700;color:#0073EA">${code}</div>
            <p style="color:#C5C7D4;font-size:12px;margin-top:24px">If you didn't request this code, you can safely ignore this email.</p>
          </div>
        `,
      });
    }

    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const otp = await this.prisma.otpCode.findFirst({
      where: { email: dto.email, code: dto.code, used: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) throw new BadRequestException('Invalid OTP');
    if (otp.expiresAt < new Date()) throw new BadRequestException('OTP has expired');

    // Mark OTP as used
    await this.prisma.otpCode.update({ where: { id: otp.id }, data: { used: true } });

    // Upsert user (create if not exists)
    const user = await this.prisma.user.upsert({
      where: { email: dto.email },
      update: {},
      create: {
        email: dto.email,
        name: dto.name || dto.email.split('@')[0],
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    const accessToken = this.jwt.sign({ sub: user.id, email: user.email, role: user.role });
    return { data: { user, accessToken } };
  }
}
