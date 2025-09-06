// src/app/api/send-email/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import nodemailer from 'nodemailer';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
  }

  // GMAIL_APP_PASSWORD가 설정되었는지 확인
  if (!process.env.GMAIL_APP_PASSWORD) {
    return NextResponse.json({ error: '서버에 앱 비밀번호가 설정되지 않았습니다.' }, { status: 500 });
  }

  const { recipients, subject, body } = await req.json();
  if (!recipients || !subject || !body) {
    return NextResponse.json({ error: '필수 정보가 누락되었습니다.' }, { status: 400 });
  }

  const recipientList = recipients.split(/[\s,;]+/).filter((email: string) => email.length > 0);

  try {
    // ✨ 인증 방식을 OAuth2에서 일반 로그인(앱 비밀번호) 방식으로 변경
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: session.user.email,
            pass: process.env.GMAIL_APP_PASSWORD, // OAuth 토큰 대신 앱 비밀번호 사용
        },
    });

    const mailPromises = recipientList.map((recipient: string) => {
        return transporter.sendMail({
            from: session.user?.name ? `"${session.user.name}" <${session.user.email}>` : session.user?.email,
            to: recipient,
            subject: subject,
            html: body,
        });
    });

    await Promise.all(mailPromises);

    return NextResponse.json({ message: `${recipientList.length}개의 이메일이 성공적으로 발송되었습니다.` }, { status: 200 });

  } catch (error) {
    console.error('이메일 발송 중 에러 발생:', error);
    // 에러 객체를 좀 더 자세히 로깅
    console.error(JSON.stringify(error, null, 2));
    return NextResponse.json({ error: '이메일 발송 중 서버에서 오류가 발생했습니다.' }, { status: 500 });
  }
}