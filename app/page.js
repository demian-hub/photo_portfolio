import Image from 'next/image';
import Header from '../components/Header';
import Brand from '../components/Brand';
import Gallery from '../components/Gallery';
import InquiryForm from '../components/InquiryForm';
import Arrow from '../components/Arrow';
import { services } from '../lib/content';

export default function Home() {
  return <><main>
    <div className="hero-shell" id="home"><Header />
      <section id="main" tabIndex={-1} className="hero" aria-labelledby="hero-title">
        <div className="hero-image"><Image src="/images/hero.jpg" alt="차분한 빛 속에서 카메라를 바라보는 인물사진 샘플" fill preload sizes="(max-width: 700px) 100vw, 65vw" /></div>
        <div className="hero-shade" />
        <div className="hero-copy"><p className="hero-intro">당신의 순간을, 오래도록.</p><h1 id="hero-title">Beyond<br />the moment.</h1><p className="hero-description">자연스러운 표정부터 브랜드의 인상까지.<br />10년의 경험으로, 당신만의 이야기를 담습니다.</p><a className="hero-link" href="#work">작업물 둘러보기 <span><Arrow /></span></a></div>
        <div className="hero-bottom"><span>인물과 브랜드를 담는 포토그래퍼</span><span className="hero-scroll">천천히, 아래로 <span aria-hidden="true">↓</span></span><span>Portrait study <small>샘플 이미지</small></span></div>
      </section>
    </div>
    <div className="page-body">
      <section className="section work-section" id="work" aria-labelledby="work-title"><div className="section-heading"><h2 id="work-title" className="display-title">Selected work<span className="title-dot">.</span></h2><p>사람의 표정, 사물의 결, 공간의 온도.<br />각기 다른 이야기 속에서 발견한 장면들입니다.</p></div><Gallery /></section>
      <section className="about-section" id="about" aria-labelledby="about-title"><div className="about-image"><Image src="/images/demian-portrait-bw.png" alt="차분한 표정으로 시선을 둔 데미안포토 작가의 흑백 포트레이트" fill sizes="(max-width: 700px) 100vw, 42vw" /><span>데미안포토 / Photographer</span></div><div className="about-copy"><p className="section-kicker">사진을 대하는 마음</p><h2 id="about-title">좋은 사진은,<br />편안한 순간에서<br />시작됩니다.</h2><div className="about-paragraphs"><p>10년 동안 사람과 브랜드가 가진 저마다의 이야기를 사진으로 기록해왔습니다.</p><p>카메라 앞의 어색함을 이해하기에, 먼저 충분히 대화하고 천천히 촬영합니다. 정해진 포즈보다 당신에게 자연스러운 표정과 움직임을 찾습니다.</p><p>촬영의 목적을 함께 정리하고, 빛과 구도를 세심하게 다듬어 오래 꺼내 보고 싶은 사진을 만듭니다.</p></div><div className="artist-signature"><span className="artist-name">데미안포토</span><span>프리랜서 포토그래퍼<br /><small>인물사진을 중심으로, 10년</small></span></div></div></section>
      <section className="section services-section" id="services" aria-labelledby="services-title"><div className="section-heading"><div><h2 id="services-title" className="display-title">What I capture.</h2><p className="section-subtitle">당신에게 필요한 장면을 함께 찾습니다.</p></div><a className="text-link" href="#contact">촬영 상담하기 <Arrow diagonal /></a></div><div className="service-list">{services.map(([title,en,description]) => <div className="service-row" key={title}><h3>{title}<span>{en}</span></h3><p>{description}</p><a href="#contact" aria-label={`${title} 촬영 문의`}><Arrow diagonal /></a></div>)}</div><div className="process"><h3>함께 만드는 과정</h3><ol>{[['문의', '생각하고 있는 촬영을 알려주세요.'], ['상담·견적', '방향과 일정, 범위를 함께 정합니다.'], ['촬영', '편안한 분위기에서 장면을 만듭니다.'], ['보정·납품', '협의한 기준으로 사진을 완성합니다.']].map(([title,desc], i) => <li key={title}><span className="process-number">0{i+1}</span><h4>{title}</h4><p>{desc}</p></li>)}</ol></div></section>
      <section className="contact-section" id="contact" aria-labelledby="contact-title"><div className="contact-copy"><p className="section-kicker">다음 장면은, 당신과 함께.</p><h2 id="contact-title" className="display-title">Let’s make<br />a moment.</h2><p>남기고 싶은 순간이 있나요?<br />당신의 이야기를 들려주세요.</p><div className="contact-still"><Image src="/images/product-1.jpg" alt="빛과 그림자가 어우러진 제품사진 샘플" fill sizes="(max-width: 700px) 90vw, 30vw" /></div><p className="contact-note">인물 프로필부터 브랜드 촬영까지,<br />촬영의 시작을 함께 고민하겠습니다.</p></div><InquiryForm /></section>
    </div></main>
    <footer className="site-footer"><div className="footer-top"><Brand href="#home" /><p>순간을 담고, 이야기를 남깁니다.</p><a href="#home" className="back-top">맨 위로 <span aria-hidden="true">↑</span></a></div><div className="footer-bottom"><span>© {new Date().getFullYear()} 데미안포토.</span><span>연락처·활동 지역은 실제 정보로 교체 예정입니다.</span><a href="/privacy">개인정보 안내</a><a href="/admin">관리자</a></div><p className="footer-sample">포트폴리오 사진은 Unsplash의 디자인 확인용 샘플입니다. 작가 소개에는 제공된 사진을 편집해 사용했습니다.</p></footer>
    <a className="mobile-inquiry" href="#contact">사진촬영 문의 <Arrow diagonal /></a>
  </>;
}
