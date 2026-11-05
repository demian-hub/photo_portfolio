'use client';
export default function Error({ reset }) { return <main id="main" className="legal-page"><h1>페이지를 불러오지 못했습니다.</h1><p>잠시 후 다시 시도해주세요.</p><button className="button dark" onClick={reset}>다시 시도</button><a className="text-link" href="/">홈으로</a></main>; }
