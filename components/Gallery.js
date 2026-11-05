'use client';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { categories, works } from '../lib/content';
import Arrow from './Arrow';
export default function Gallery() {
  const [filter, setFilter] = useState('전체');
  const [selected, setSelected] = useState(null);
  const dialog = useRef(null);
  const opener = useRef(null);
  const visible = filter === '전체' ? works : works.filter(w => w.category === filter);
  function open(work, event) {
    opener.current = event.currentTarget;
    setSelected(work);
    dialog.current.showModal();
    document.body.style.overflow = 'hidden';
  }
  function close() { dialog.current.close(); }
  function onClose() { document.body.style.overflow = ''; opener.current?.focus(); }
  return <>
    <div className="gallery-filters" role="group" aria-label="촬영 분야 필터">{['전체', ...categories].map(c => <button key={c} aria-pressed={filter === c} onClick={() => setFilter(c)}>{c}{c === '전체' && <sup>10</sup>}</button>)}</div>
    <div className="gallery-grid" aria-label="포트폴리오 사진">
      {visible.map(work => <figure className="work" key={work.id}>
        <button className="work-photo" onClick={e => open(work, e)} aria-label={`${work.title} 사진 확대`}><Image src={`/images/${work.id}.jpg`} alt={work.alt} fill sizes="(max-width: 700px) 100vw, 50vw" style={{ objectPosition: work.position || 'center' }} /><span className="photo-expand"><Arrow diagonal /></span></button>
        <figcaption><div><span>{work.category}</span><h3>{work.title}</h3></div><span className="work-en">{work.en}</span></figcaption>
      </figure>)}
    </div>
    <p className="sample-note">이 페이지의 사진은 레이아웃 확인을 위한 샘플 이미지입니다.</p>
    <dialog ref={dialog} className="lightbox" onClose={onClose} onClick={e => { if (e.target === e.currentTarget) close(); }} aria-label="작업물 사진 확대">
      <button className="lightbox-close" onClick={close} autoFocus aria-label="확대 사진 닫기">닫기 <span aria-hidden="true">×</span></button>
      {selected && <div className="lightbox-content"><div className="lightbox-image"><Image src={`/images/${selected.id}.jpg`} alt={selected.alt} fill sizes="90vw" style={{ objectFit: 'contain' }} /></div><p>{selected.title} <span>{selected.category} / 샘플 이미지</span></p></div>}
    </dialog>
  </>;
}
