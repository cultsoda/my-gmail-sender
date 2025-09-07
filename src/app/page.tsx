// src/app/page.tsx

"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';

const RichTextEditor = dynamic(() => import('./components/RichTextEditor'), { 
  ssr: false,
  loading: () => <div className="p-3 min-h-[358px] bg-gray-700 border border-gray-600 rounded-md">에디터를 불러오는 중...</div>,
});

const MAX_RECIPIENTS = 300;

interface Template {
  templateName: string;
  subject: string;
  body: string;
}

export default function Home() {
  const { data: session, status } = useSession();

  const [recipients, setRecipients] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState('');

  const [aiPrompt, setAiPrompt] = useState('');
  const [language, setLanguage] = useState('한국어');
  const [isGenerating, setIsGenerating] = useState(false);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  useEffect(() => {
    if (session) {
      fetch('/api/templates')
        .then(res => {
          if (!res.ok) { throw new Error('템플릿 로딩 실패'); }
          return res.json();
        })
        .then(data => {
          if (Array.isArray(data)) { setTemplates(data); } 
          else {
            console.error("API가 배열이 아닌 값을 반환했습니다:", data);
            setTemplates([]);
          }
        })
        .catch(error => {
          console.error("템플릿을 불러오는 중 에러 발생:", error);
          setTemplates([]);
        });
    }
  }, [session]);

  const recipientCount = useMemo(() => {
    if (recipients.trim() === '') return 0;
    return recipients.split(/[\s,;]+/).filter(email => email.length > 0).length;
  }, [recipients]);

  const isRecipientLimitExceeded = recipientCount > MAX_RECIPIENTS;

  const handleGenerateEmail = async () => {
    if (!aiPrompt) {
      alert('이메일 목적을 입력해주세요.');
      return;
    }
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, language }),
      });
      if (!response.ok) { throw new Error('AI 응답 생성에 실패했습니다.'); }
      const data = await response.json();
      setSubject(data.subject);
      setBody(data.body);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : String(error));
    } finally {
      setIsGenerating(false);
    }
  };

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients, subject, body }),
      });
      const result = await response.json();
      if (!response.ok) { throw new Error(result.error || '알 수 없는 에러'); }
      setMessage(result.message);
      setRecipients(''); setSubject(''); setBody('');
    } catch (error: unknown) {
      if (error instanceof Error) { setMessage(`전송 실패: ${error.message}`); } 
      else { setMessage('전송 실패: 알 수 없는 오류'); }
    } finally {
      setIsSending(false);
    }
  };
  
  const handleLoadTemplate = (templateName: string) => {
    setSelectedTemplate(templateName);
    if (templateName === '') {
      setSubject('');
      setBody('');
      return;
    }
    const template = templates.find(t => t.templateName === templateName);
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
    }
  };

  const handleSaveTemplate = async () => {
    if (!subject || !body) {
      alert('템플릿으로 저장할 제목과 내용이 필요합니다.');
      return;
    }
    const templateName = prompt('저장할 템플릿의 이름을 입력하세요:');
    if (!templateName || templateName.trim() === '') return;

    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateName, subject, body }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      alert('템플릿이 저장되었습니다.');
      const newTemplates = await fetch('/api/templates').then(res => res.json());
      setTemplates(newTemplates);
      setSelectedTemplate(templateName);
    } catch (error) {
      alert(`템플릿 저장 실패: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  if (status === "loading") {
    return <main className="flex min-h-screen flex-col items-center justify-center"><p>Loading...</p></main>;
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gray-900 text-white">
      <div className="w-full max-w-4xl">
        {!session ? (
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-6">로그인이 필요합니다.</h1>
            <button
              onClick={() => signIn("google")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg cursor-pointer"
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
              <button onClick={() => signOut()} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg cursor-pointer">
                Logout
              </button>
            </div>

            <div className="space-y-4 bg-gray-800 p-6 rounded-lg mb-8">
              <h2 className="text-xl font-semibold">AI로 이메일 초안 작성하기</h2>
              <div>
                <label htmlFor="ai-prompt" className="block text-sm font-medium text-gray-300 mb-2">이메일 목적 또는 상황</label>
                <input
                  id="ai-prompt"
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 text-white"
                  placeholder="예: 30% 여름 세일 이벤트 안내"
                />
              </div>
              <div className="flex items-end gap-4">
                <div className="flex-grow">
                  <label htmlFor="language" className="block text-sm font-medium text-gray-300 mb-2">언어</label>
                  <select
                    id="language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 text-white cursor-pointer"
                  >
                    <option>한국어</option>
                    <option>English</option>
                    <option>日本語</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateEmail}
                  disabled={isGenerating}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg disabled:bg-gray-500 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isGenerating ? '생성 중...' : '생성하기'}
                </button>
              </div>
            </div>
            
            <div className="space-y-4 bg-gray-800 p-6 rounded-lg mb-8">
              <h2 className="text-xl font-semibold">템플릿 관리</h2>
              <div className="flex items-end gap-4">
                <div className="flex-grow">
                  <label htmlFor="template" className="block text-sm font-medium text-gray-300 mb-2">템플릿 불러오기</label>
                  <select
                    id="template"
                    value={selectedTemplate}
                    onChange={(e) => handleLoadTemplate(e.target.value)}
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 text-white cursor-pointer"
                  >
                    <option value="">-- 템플릿 선택 --</option>
                    {templates.map(t => (
                      <option key={t.templateName} value={t.templateName}>{t.templateName}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  disabled={!subject && !body}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg disabled:bg-gray-500 cursor-pointer disabled:cursor-not-allowed"
                >
                  현재 내용 템플릿으로 저장
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 bg-gray-800 p-8 rounded-lg">
              <div>
                <label htmlFor="recipients" className="block text-sm font-medium text-gray-300 mb-2">받는 사람 ({recipientCount} / {MAX_RECIPIENTS} 명)</label>
                <textarea id="recipients" rows={4} className={`w-full p-3 bg-gray-700 border rounded-md focus:ring-2 text-white ${isRecipientLimitExceeded ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'}`} placeholder="test1@example.com, test2@example.com" value={recipients} onChange={(e) => setRecipients(e.target.value)} required />
                {isRecipientLimitExceeded && <p className="mt-2 text-sm text-red-400">받는 사람 수가 최대 {MAX_RECIPIENTS}명을 초과할 수 없습니다.</p>}
              </div>
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-2">제목</label>
                <input type="text" id="subject" className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 text-white" value={subject} onChange={(e) => setSubject(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">본문</label>
                <RichTextEditor content={body} onChange={(newContent) => setBody(newContent)} />
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="submit"
                  disabled={isSending || isRecipientLimitExceeded}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg disabled:bg-gray-500 cursor-pointer disabled:cursor-not-allowed"
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