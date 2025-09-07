// src/app/api/templates/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { google } from 'googleapis';

// GET 요청: 모든 템플릿 목록 불러오기
export async function GET(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !token.accessToken) {
        return NextResponse.json({ error: '인증 토큰 없음' }, { status: 401 });
    }

    try {
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: token.accessToken });
        const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            // ✨ 사용자님의 실제 시트 이름인 '시트1'로 수정합니다.
            range: '시트1!A2:C',
        });
        
        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return NextResponse.json([], { status: 200 });
        }

        const templates = rows.map(row => ({
            templateName: row[0],
            subject: row[1],
            body: row[2],
        })).filter(t => t.templateName);
        
        return NextResponse.json(templates, { status: 200 });

    } catch (error) {
        console.error('템플릿 불러오기 에러:', error);
        return NextResponse.json({ error: '템플릿을 불러오지 못했습니다.' }, { status: 500 });
    }
}

// POST 요청: 새 템플릿 저장하기
export async function POST(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !token.accessToken) {
        return NextResponse.json({ error: '인증 토큰 없음' }, { status: 401 });
    }

    try {
        const { templateName, subject, body } = await req.json();
        if (!templateName || !subject || body === undefined) {
            return NextResponse.json({ error: '템플릿 정보 부족' }, { status: 400 });
        }

        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: token.accessToken });
        const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

        await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            // ✨ 사용자님의 실제 시트 이름인 '시트1'로 수정합니다.
            range: '시트1!A:C',
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[templateName, subject, body]],
            },
        });

        return NextResponse.json({ message: '템플릿이 저장되었습니다.' }, { status: 200 });
    } catch (error) {
        console.error('템플릿 저장 에러:', error);
        return NextResponse.json({ error: '템플릿을 저장하지 못했습니다.' }, { status: 500 });
    }
}