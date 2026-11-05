'use client';
import { useState } from 'react';
import Arrow from './Arrow';
export default function Header() {
  const [open, setOpen] = useState(false);
  return <header className="site-header">
    <a className="wordmark" href="#home" aria-label="Still photography 홈">still<span>.</span><small>photography</small></a>
    <nav aria-label="주요 메뉴" className={open ? 'site-nav is-open' : 'site-nav'} id="site-nav">
      <a href="#work" onClick={() => setOpen(false)}>작업물</a><a href="#about" onClick={() => setOpen(false)}>작가 소개</a><a href="#services" onClick={() => setOpen(false)}>촬영 분야</a>
    </nav>
    <a className="header-contact" href="#contact">사진촬영 문의 <Arrow diagonal /></a>
    <button className="menu-toggle" aria-label={open ? '메뉴 닫기' : '메뉴 열기'} aria-expanded={open} aria-controls="site-nav" onClick={() => setOpen(!open)}>{open ? '닫기' : '메뉴'}</button>
  </header>;
}
