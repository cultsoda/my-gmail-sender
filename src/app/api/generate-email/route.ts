// src/app/api/generate-email/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'AI API 키가 설정되지 않았습니다.' }, { status: 500 });
  }

  try {
    const { prompt, language } = await req.json();

    if (!prompt || !language) {
      return NextResponse.json({ error: '요청 정보가 부족합니다.' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // ✨ 언어별 고객센터 정보를 요청하신 내용으로 수정합니다.
    let greeting = '';
    let supportInfo = '';
    const inquiryUrl = 'https://xromeda.com/?type=inquiry';

    switch (language) {
      case 'English':
        greeting = 'Hello, this is the XROMEDA team.';
        // ✨ "reply to this email" 과 문의 페이지 링크를 수정
        supportInfo = `If you have any questions, feel free to reply to this email (help@xromeda.com) or visit our <a href="${inquiryUrl}" target="_blank">inquiry page</a>.`;
        break;
      case '日本語':
        greeting = 'こんにちは、XROMEDAです。';
        // ✨ "reply to this email" 과 문의 페이지 링크를 수정
        supportInfo = `ご不明な点がございましたら、いつでもこのメールアドレス(help@xromeda.com)にご返信いただくか、<a href="${inquiryUrl}" target="_blank">お問い合わせページ</a>をご利用ください。`;
        break;
      default: // 한국어
        greeting = '안녕하세요, XROMEDA입니다.';
        // ✨ "이 이메일로 회신" 과 "문의 페이지" 링크를 수정
        supportInfo = `궁금한 점이 있으시면 언제든지 이 이메일(help@xromeda.com)로 회신 주시거나, 저희 <a href="${inquiryUrl}" target="_blank">문의 페이지</a>를 이용해주세요.`;
        break;
    }

    const fullPrompt = `
      You are an expert email marketer and a meticulous operations manager for a service named "XROMEDA".
      Your task is to write a professional and effective email based on the user's request.

      **CRITICAL INSTRUCTIONS:**
      1.  **Language:** You MUST write the entire email in '${language}'.
      2.  **Output Format:** Your entire response MUST be a single, raw JSON object. Do NOT wrap it in Markdown (\`\`\`json).
          The JSON object must have exactly two keys: "subject" and "body".
          The "body" value must be a string containing valid HTML (e.g., using <p> tags).
      3.  **Content Rules:**
          - **Greeting:** The email body MUST start with this exact phrase: "${greeting}"
          - **Main Content:** Address the user's core request, which is: "${prompt}"
          - **Support Information:** Towards the end of the email, you MUST naturally include the following customer support information: "${supportInfo}"
          - **Closing:** Conclude the email with a suitable and professional closing statement.

      Example of a valid response format:
      {"subject": "A professional subject line", "body": "<p>${greeting}</p><p>This is the main content...</p><p>${supportInfo}</p><p>Best regards,<br>The XROMEDA Team</p>"}
    `;

    const result = await model.generateContent(fullPrompt);
    const responseText = result.response.text();
    
    console.log("AI 원본 응답:", responseText);

    let jsonString = responseText;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch && jsonMatch[0]) {
        jsonString = jsonMatch[0];
    }
    
    const parsedJson = JSON.parse(jsonString);

    const finalResponse = {
      subject: parsedJson.subject || '',
      body: parsedJson.body || '<p>본문 생성에 실패했습니다. 다른 표현으로 다시 시도해주세요.</p>'
    };

    return NextResponse.json(finalResponse, { status: 200 });

  } catch (error) {
    console.error('AI 이메일 생성 중 에러:', error);
    return NextResponse.json({ error: 'AI 이메일 생성에 실패했습니다.' }, { status: 500 });
  }
}