// src/app/page.tsx

"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic'; // next/dynamic을 import 합니다.

// RichTextEditor를 dynamic import로 변경하고, SSR을 비활성화합니다.
// 수정된 코드
const RichTextEditor = dynamic(() => import('./components/RichTextEditor'), { 
  ssr: false,
  loading: () => <p className="p-3 bg-gray-700 border border-gray-600 rounded-md">에디터를 불러오는 중...</p>,
});
const MAX_RECIPIENTS = 300;

export default function Home() {
  const { data: session, status } = useSession();

  const [recipients, setRecipients] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('<p>여기에 이메일 내용을 입력하세요...</p>');
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState('');

  // 이 부분부터 나머지 코드는 이전과 동일합니다.
  const recipientCount = useMemo(() => {
    if (recipients.trim() === '') return 0;
    return recipients.split(/[\s,;]+/).filter(email => email.length > 0).length;
  }, [recipients]);

  const isRecipientLimitExceeded = recipientCount > MAX_RECIPIENTS;

  // src/app/page.tsx 파일의 handleSubmit 함수만 교체

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isRecipientLimitExceeded) {
      setMessage(`최대 ${MAX_RECIPIENTS}명까지 보낼 수 있습니다.`);
      return;
    }
    setIsSending(true);
    setMessage('');

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipients, subject, body }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '알 수 없는 에러가 발생했습니다.');
      }

      setMessage(result.message);
      // 성공 시 입력 필드 초기화 (선택사항)
      setRecipients('');
      setSubject('');
      setBody('');

    } catch (error: any) {
      setMessage(`전송 실패: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  if (status === "loading") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center">
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-900 text-white">
      <div className="w-full max-w-4xl">
        {!session ? (
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-6">로그인이 필요합니다.</h1>
            <button
              onClick={() => signIn("google")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg"
            >
              Login with Google
            </button>
          </div>
        ) : (
          <div className="w-full">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h1 className="text-3xl font-bold">환영합니다, {session.user?.name} 님!</h1>
                <p className="text-gray-400">{session.user?.email}</p>
              </div>
              <button
                onClick={() => signOut()}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg"
              >
                Logout
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 bg-gray-800 p-8 rounded-lg">
              <div>
                <label htmlFor="recipients" className="block text-sm font-medium text-gray-300 mb-2">
                  받는 사람 ({recipientCount} / {MAX_RECIPIENTS} 명)
                </label>
                <textarea
                  id="recipients"
                  name="recipients"
                  rows={4}
                  className={`w-full p-3 bg-gray-700 border rounded-md focus:ring-2 text-white ${isRecipientLimitExceeded ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'}`}
                  placeholder="test1@example.com, test2@example.com"
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                  required
                />
                {isRecipientLimitExceeded && (
                  <p className="mt-2 text-sm text-red-400">
                    받는 사람 수가 최대 {MAX_RECIPIENTS}명을 초과할 수 없습니다.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-2">
                  제목
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 text-white"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  본문
                </label>
                <RichTextEditor
                  content={body}
                  onChange={(newContent) => setBody(newContent)}
                />
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="submit"
                  disabled={isSending || isRecipientLimitExceeded}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                  {isSending ? '전송 중...' : '이메일 일괄 발송'}
                </button>
                {message && <p className={message.includes('성공') ? 'text-green-400' : 'text-red-400'}>{message}</p>}
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}