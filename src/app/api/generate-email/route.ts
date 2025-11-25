// src/app/api/generate-email/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  // 1. API 키 확인
  if (!process.env.GEMINI_API_KEY) {
    console.error("서버 에러: GEMINI_API_KEY가 환경변수에 설정되지 않았습니다.");
    return NextResponse.json({ error: '서버에 AI API 키가 설정되지 않았습니다.' }, { status: 500 });
  }

  try {
    const { prompt, language } = await req.json();

    if (!prompt || !language) {
      return NextResponse.json({ error: '요청 정보(prompt 또는 language)가 부족합니다.' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // 언어별 인사말 및 지원 정보 설정
    let greeting = '';
    let supportInfo = '';
    const inquiryUrl = 'https://xromeda.com/?type=inquiry';

    switch (language) {
      case 'English':
        greeting = 'Hello, this is the XROMEDA team.';
        supportInfo = `If you have any questions, feel free to reply to this email (help@xromeda.com) or visit our <a href="${inquiryUrl}" target="_blank">inquiry page</a>.`;
        break;
      case '日本語':
        greeting = 'こんにちは、XROMEDAです。';
        supportInfo = `ご不明な点がございましたら、いつでもこのメールアドレス(help@xromeda.com)にご返信いただくか、<a href="${inquiryUrl}" target="_blank">お問い合わせページ</a>をご利用ください。`;
        break;
      default: // 한국어
        greeting = '안녕하세요, XROMEDA입니다.';
        supportInfo = `궁금한 점이 있으시면 언제든지 이 이메일(help@xromeda.com)로 회신 주시거나, 저희 <a href="${inquiryUrl}" target="_blank">문의 페이지</a>를 이용해주세요.`;
        break;
    }

    const fullPrompt = `
      You are an expert email marketer and a meticulous operations manager for a service named "XROMEDA".
      Your task is to write a professional and effective email based on the user's request.

      **CRITICAL INSTRUCTIONS:**
      1.  **Language:** You MUST write the entire email in '${language}'.
      2.  **Output Format:** Your entire response MUST be a valid JSON object. Do NOT include markdown code blocks (like \`\`\`json). Just return the JSON object.
          The JSON object must have exactly two keys: "subject" and "body".
          The "body" value must be a string containing valid HTML (e.g., using <p>, <br> tags).
      3.  **Content Rules:**
          - **Greeting:** The email body MUST start with this exact phrase: "${greeting}"
          - **Main Content:** Address the user's core request: "${prompt}"
          - **Support Information:** Towards the end of the email, include this exact support info: "${supportInfo}"
          - **Closing:** Conclude with a professional closing.

      Example format:
      {"subject": "Subject line here", "body": "<p>${greeting}</p><p>Content...</p><p>${supportInfo}</p>"}
    `;

    const result = await model.generateContent(fullPrompt);
    const responseText = result.response.text();
    
    // 터미널 로그에서 AI 응답 확인용
    console.log("AI 원본 응답:", responseText);

    // 2. JSON 파싱 처리 강화
    let jsonString = responseText;
    
    // 마크다운 코드 블록(```json ... ```) 제거 시도
    jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();

    // 중괄호 시작과 끝을 찾아서 추출 (혹시 모를 앞뒤 텍스트 제거)
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        jsonString = jsonMatch[0];
    }

    let parsedJson;
    try {
        parsedJson = JSON.parse(jsonString);
    } catch (jsonError) {
        console.error("JSON 파싱 에러:", jsonError);
        console.error("파싱 실패한 문자열:", jsonString);
        // 파싱 실패 시 에러 대신 텍스트로라도 반환 시도 (선택 사항)
        return NextResponse.json({ error: 'AI 응답을 분석하는 데 실패했습니다. 다시 시도해주세요.' }, { status: 500 });
    }

    const finalResponse = {
      subject: parsedJson.subject || '제목 없음',
      body: parsedJson.body || '<p>본문 생성에 실패했습니다.</p>'
    };

    return NextResponse.json(finalResponse, { status: 200 });

  } catch (error) {
    console.error('AI 이메일 생성 중 에러:', error);
    return NextResponse.json({ error: 'AI 서비스 연결 중 오류가 발생했습니다.' }, { status: 500 });
  }
}