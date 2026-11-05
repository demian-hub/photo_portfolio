'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { statuses } from '../lib/validation.mjs';
import Brand from './Brand';

const mailLabels = { pending: '발송 대기', sending: '발송 중', sent: '메일 서버 수락', failed: '발송 실패', unconfigured: '발송 계정 인증 필요' };
const date = value => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
export default function AdminPanel({ initialUser }) {
  const [user, setUser] = useState(initialUser);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState({ inquiries: [], total: 0, counts: [] });
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [nextStatus, setNextStatus] = useState('신규');
  const [saving, setSaving] = useState(false);
  const [sendingMail, setSendingMail] = useState(false);
  const [notice, setNotice] = useState('');
  const dialog = useRef(null);
  const trigger = useRef(null);
  const requestId = useRef(0);
  const load = useCallback(async () => {
    if (!user) return;
    const id = ++requestId.current;
    setPending(true); setError('');
    try {
      const response = await fetch(`/api/admin/inquiries?q=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}&page=${page}`, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
      const data = await response.json();
      if (id !== requestId.current) return;
      if (response.status === 401) { setUser(null); setResult({ inquiries: [], total: 0, counts: [] }); setError('세션이 만료되었습니다. 다시 로그인해주세요.'); return; }
      if (!response.ok) throw new Error(data.message || '문의를 불러오지 못했습니다.');
      setResult(data);
    } catch(e) { if (id === requestId.current) setError(e.message === 'The operation was aborted due to timeout' ? '응답이 지연됩니다. 새로고침해주세요.' : '문의를 불러오지 못했습니다. 새로고침해주세요.'); }
    finally { if (id === requestId.current) setPending(false); }
  }, [user, search, status, page]);
  useEffect(() => { load(); }, [load]);
  async function login(e) {
    e.preventDefault(); setPending(true); setError('');
    try {
      const response = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))), signal: AbortSignal.timeout(15000) });
      const data = await response.json();
      if (!response.ok) { setError(data.message); return; }
      setUser('admin');
    } catch { setError('서버에 연결하지 못했습니다. 다시 시도해주세요.'); }
    finally { setPending(false); }
  }
  async function logout() {
    setPending(true); setError('');
    try {
      const response = await fetch('/api/admin/logout', { method: 'POST', signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error();
      ++requestId.current; setUser(null); setResult({ inquiries: [], total: 0, counts: [] }); setSelected(null);
    } catch { setError('로그아웃하지 못했습니다. 다시 시도해주세요.'); }
    finally { setPending(false); }
  }
  function open(item, e) { trigger.current = e.currentTarget; setSelected(item); setNextStatus(item.status); setNotice(''); dialog.current.showModal(); document.body.style.overflow = 'hidden'; }
  function close() { dialog.current.close(); }
  async function retryMail() {
    if (sendingMail) return;
    setSendingMail(true); setNotice('');
    try {
      const response = await fetch('/api/admin/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selected.id }), signal: AbortSignal.timeout(45000) });
      const data = await response.json();
      setNotice(data.message || '발송 결과를 확인하지 못했습니다. 새로고침해주세요.');
      if (data.status) setSelected(item => ({ ...item, notification_status: data.status }));
      await load();
    } catch { setNotice('발송 결과를 확인하지 못했습니다. 새로고침 후 상태를 확인해주세요.'); }
    finally { setSendingMail(false); }
  }
  async function update(e) {
    e.preventDefault(); if (saving) return; setSaving(true); setNotice('');
    try {
      const response = await fetch('/api/admin/inquiries', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selected.id, status: nextStatus }), signal: AbortSignal.timeout(15000) });
      const data = await response.json();
      if (!response.ok) { setNotice(data.message); return; }
      setSelected({ ...selected, status: nextStatus }); setNotice('처리 상태를 저장했습니다.'); await load();
    } catch { setNotice('상태를 저장하지 못했습니다. 다시 시도해주세요.'); }
    finally { setSaving(false); }
  }
  return <main id="main" className="admin-shell"><header className="admin-header"><Brand /><span>문의 관리</span>{user && <button className="text-link" disabled={pending} onClick={logout}>로그아웃</button>}</header>
    {!user ? <section className="login-card"><p className="serif login-serif">Welcome back.</p><h1>관리자 로그인</h1><p>접수된 촬영문의를 확인하고 관리하세요.</p><form onSubmit={login}><div className="form-field"><label htmlFor="username">아이디</label><input id="username" name="username" autoComplete="username" required maxLength={60} /></div><div className="form-field"><label htmlFor="password">비밀번호</label><input id="password" name="password" type="password" autoComplete="current-password" required maxLength={200} /></div>{error && <p className="field-error" role="alert">{error}</p>}<button className="button dark" disabled={pending}>{pending ? '로그인 중…' : '로그인'}</button></form><a className="text-link" href="/">포트폴리오로 돌아가기</a></section>
      : <section className="admin-content"><div className="admin-title"><div><p>촬영문의 관리</p><h1>새로운 이야기들.</h1></div><button className="button outline" disabled={pending} onClick={load}>{pending ? '불러오는 중…' : '새로고침'}</button></div>{result.mailConfigured === false && <p className="mail-setup-notice" role="status">이메일 알림의 발송 계정 인증이 필요합니다. 인증 전에도 촬영문의는 정상 저장됩니다.</p>}<div className="admin-stats">{statuses.map(s => <div key={s}><span>{s}</span><strong>{result.counts.find(c => c.status === s)?.count || 0}</strong></div>)}</div><form className="admin-filters" onSubmit={e => { e.preventDefault(); setSearch(query); setPage(1); }}><div><label htmlFor="search">이름·연락처 검색</label><input id="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="이름 또는 연락처" maxLength={150} /></div><div><label htmlFor="status-filter">처리 상태</label><select id="status-filter" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">전체 상태</option>{statuses.map(s => <option key={s}>{s}</option>)}</select></div><button className="button dark">검색</button></form>{error && <p role="alert" className="field-error">{error}</p>}<div className="admin-results-heading"><h2>문의 목록</h2><span aria-live="polite">총 {result.total}건{pending ? ' · 불러오는 중' : ''}</span></div>
        <div className="inquiry-list" aria-busy={pending}>{result.inquiries.map(item => <button className="inquiry-row" key={item.id} onClick={e => open(item, e)}><span className="inquiry-name">{item.name}<small>{item.contact}</small></span><span className="inquiry-category">{item.category}</span><span className={`status-badge status-${statuses.indexOf(item.status)}`}>{item.status}</span><time dateTime={item.created_at}>{date(item.created_at)}</time><span aria-hidden="true">↗</span></button>)}{!pending && result.inquiries.length === 0 && <div className="empty-state"><h3>{search || status ? '검색 결과가 없습니다.' : '아직 접수된 문의가 없습니다.'}</h3><p>{search || status ? '검색어나 처리 상태를 변경해보세요.' : '고객이 촬영문의를 보내면 여기에 표시됩니다.'}</p></div>}</div><div className="pagination"><button disabled={page === 1 || pending} onClick={() => setPage(page-1)}>이전</button><span>{page} / {Math.max(1, Math.ceil(result.total / 20))}</span><button disabled={page * 20 >= result.total || pending} onClick={() => setPage(page+1)}>다음</button></div></section>}
    <dialog className="admin-detail" ref={dialog} onClose={() => { document.body.style.overflow = ''; trigger.current?.focus(); }} onClick={e => { if (e.target === e.currentTarget) close(); }} aria-labelledby="detail-title"><button className="detail-close" onClick={close} autoFocus>닫기 ×</button>{selected && <><p className="detail-date">접수 #{selected.id} · {date(selected.created_at)}</p><h2 id="detail-title">{selected.name}님의 촬영문의</h2><dl>{[['연락처',selected.contact],['촬영 분야',selected.category],['예산 범위',selected.budget || '미정'],['희망 촬영일',selected.preferred_date || '미정'],['촬영 지역',selected.location || '미정'],['촬영 요구사항',selected.requirements],['개인정보 동의','동의함 ('+selected.consent_version+')']].map(([key,value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl><div className="notification-info"><h3>이메일 알림</h3><p>수신: parkhanchul@gmail.com</p><p>상태: {mailLabels[selected.notification_status] || '알림 기록 없음 (기능 추가 전 접수)'}</p>{selected.notification_status === 'failed' && <p>발송 계정 또는 네트워크를 확인한 후 다시 시도해주세요.</p>}{selected.notification_status && selected.notification_status !== 'sent' && <button type="button" className="button outline" disabled={sendingMail || !result.mailConfigured} onClick={retryMail}>{sendingMail ? '발송 중…' : '메일 알림 다시 보내기'}</button>}</div><form onSubmit={update} className="status-form"><label htmlFor="detail-status">처리 상태</label><select id="detail-status" value={nextStatus} onChange={e => setNextStatus(e.target.value)}>{statuses.map(s => <option key={s}>{s}</option>)}</select><button className="button dark" disabled={saving}>{saving ? '저장 중…' : '상태 저장'}</button></form><p role="status" className="save-notice">{notice}</p></>}</dialog>
  </main>;
}
