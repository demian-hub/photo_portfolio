'use client';
import { useRef, useState } from 'react';
import { budgets, allowedCategories, validateInquiry } from '../lib/validation.mjs';
import Arrow from './Arrow';
export default function InquiryForm() {
  const [errors, setErrors] = useState({});
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(null);
  const summary = useRef(null);
  const successRef = useRef(null);
  const lock = useRef(false);
  function showErrors(next) { setErrors(next); requestAnimationFrame(() => summary.current?.focus()); }
  async function submit(e) {
    e.preventDefault();
    if (lock.current) return;
    const values = Object.fromEntries(new FormData(e.currentTarget));
    values.consent = values.consent === 'on';
    const result = validateInquiry(values);
    setMessage('');
    if (Object.keys(result.errors).length) { showErrors(result.errors); return; }
    lock.current = true; setPending(true); setErrors({});
    try {
      const response = await fetch('/api/inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values), signal: AbortSignal.timeout(20000) });
      const data = await response.json();
      if (!response.ok) { if (data.errors) showErrors(data.errors); else setMessage(data.message); return; }
      setSuccess(data.id);
      requestAnimationFrame(() => successRef.current?.focus());
    } catch { setMessage('접수 결과를 확인하지 못했습니다. 입력 내용은 유지됩니다. 잠시 후 다시 시도해주세요.'); }
    finally { lock.current = false; setPending(false); }
  }
  function field(name, label, control, optional = false) {
    const id = name === 'contact' ? 'inquiry-contact' : name;
    return <div className={`form-field ${name === 'requirements' ? 'full-width' : ''}`}><label htmlFor={id}>{label} <span>{optional ? '선택' : '*'}</span></label>{control({ id, name, 'aria-invalid': !!errors[name], 'aria-describedby': errors[name] ? `${name}-error` : undefined })}{errors[name] && <p className="field-error" id={`${name}-error`}>{errors[name]}</p>}</div>;
  }
  if (success) return <div className="form-success" ref={successRef} tabIndex={-1} role="status"><span className="success-mark" aria-hidden="true">✓</span><h3>당신의 이야기가<br />잘 도착했습니다.</h3><p>촬영문의가 접수되었습니다.<br />남겨주신 연락처로 상담을 이어가겠습니다.</p><p className="receipt">접수번호 #{String(success).padStart(4, '0')}</p><button className="button dark" onClick={() => setSuccess(null)}>다른 촬영 문의하기</button></div>;
  return <form className="inquiry-form" onSubmit={submit} noValidate aria-busy={pending}>
    <p className="form-hint">* 표시는 필수 항목입니다.</p>
    {Object.keys(errors).length > 0 && <div className="error-summary" tabIndex={-1} ref={summary} role="alert"><p>입력 내용을 확인해주세요.</p><ul>{Object.entries(errors).map(([key, value]) => <li key={key}><a href={`#${key === 'contact' ? 'inquiry-contact' : key}`}>{value}</a></li>)}</ul></div>}
    <div className="form-grid">
      {field('name', '이름', p => <input {...p} required autoComplete="name" maxLength={60} placeholder="성함을 알려주세요" />)}
      {field('contact', '연락처', p => <input {...p} required autoComplete="email" maxLength={150} placeholder="전화번호 또는 이메일" />)}
      {field('category', '촬영 분야', p => <select {...p} required defaultValue=""><option value="" disabled>어떤 촬영을 계획하고 계신가요?</option>{allowedCategories.map(c => <option key={c}>{c}</option>)}</select>)}
      {field('budget', '예산 범위', p => <select {...p} defaultValue="미정·상담 후 결정">{budgets.map(c => <option key={c}>{c}</option>)}</select>, true)}
      {field('preferred_date', '희망 촬영일', p => <input {...p} type="date" min={new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })} />, true)}
      {field('location', '촬영 지역', p => <input {...p} maxLength={150} placeholder="예: 서울 성수동, 협의 가능" />, true)}
      {field('requirements', '촬영 요구사항', p => <textarea {...p} required rows={4} minLength={10} maxLength={5000} placeholder="촬영 목적, 인원, 원하는 분위기 등을 자유롭게 적어주세요. (10자 이상)" />)}
    </div>
    <div className="honeypot" aria-hidden="true"><label>웹사이트<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <details className="privacy-details"><summary>개인정보 수집·이용 안내 보기</summary><p>수집 항목: 이름, 연락처, 촬영 요구사항 및 선택 입력 항목. 이용 목적: 촬영 상담, 문의 응대 및 작가에게 접수 이메일 알림. 보관 기준 초안: 상담 종료 후 1년 이내 삭제. 동의를 거부할 수 있으며, 거부 시 폼 접수가 어렵습니다.</p><p>현재는 제작 확인용 사이트입니다. 실제 공개 전 운영자 정보와 보관 기간을 확정해야 합니다.</p></details>
    <label className="consent"><input type="checkbox" name="consent" id="consent" required aria-invalid={!!errors.consent} aria-describedby={errors.consent ? 'consent-error' : undefined} /><span>개인정보 수집·이용에 동의합니다. (필수)</span></label>
    {errors.consent && <p className="field-error" id="consent-error">{errors.consent}</p>}
    {message && <p className="field-error" role="alert">{message}</p>}
    <button className="button dark submit-button" disabled={pending}>{pending ? '문의를 접수하고 있습니다…' : '사진촬영 문의 보내기'}<Arrow diagonal /></button>
    <p className="form-footnote">아직 구체적인 계획이 없어도 괜찮습니다. 함께 이야기하며 정리해요.</p>
  </form>;
}
