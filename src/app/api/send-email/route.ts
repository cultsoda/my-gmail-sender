// src/app/api/send-email/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import nodemailer from 'nodemailer';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  // 이 체크 덕분에 아래에서 session.user.email은 절대 null이 아닙니다.
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
  }

  if (!process.env.GMAIL_APP_PASSWORD) {
    return NextResponse.json({ error: '서버에 앱 비밀번호가 설정되지 않았습니다.' }, { status: 500 });
  }

  const { recipients, subject, body } = await req.json();
  if (!recipients || !subject || body === undefined) {
    return NextResponse.json({ error: '필수 정보가 누락되었습니다.' }, { status: 400 });
  }

  const recipientList = recipients.split(/[\s,;]+/).filter((email: string) => email.length > 0);

  try {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: session.user.email,
            pass: process.env.GMAIL_APP_PASSWORD,
        },
    });

    // ✨ TypeScript가 session.user.email이 유효하다고 확신할 수 있도록 from 주소를 명확하게 정의합니다.
    const fromAddress = session.user.name
      ? `"${session.user.name}" <${session.user.email}>`
      : session.user.email;

    const mailPromises = recipientList.map((recipient: string) => {
        return transporter.sendMail({
            from: fromAddress, // 수정된 변수를 사용합니다.
            to: recipient,
            subject: subject,
            html: body,
        });
    });

    await Promise.all(mailPromises);

    return NextResponse.json({ message: `${recipientList.length}개의 이메일이 성공적으로 발송되었습니다.` }, { status: 200 });

  } catch (error) {
    console.error('이메일 발송 중 에러 발생:', error);
    return NextResponse.json({ error: '이메일 발송 중 서버에서 오류가 발생했습니다.' }, { status: 500 });
  }
}