import '@fontsource-variable/noto-sans-kr';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/500.css';
import './globals.css';

export const metadata = {
  metadataBase: new URL(process.env.SITE_URL || 'http://localhost:3000'),
  title: 'Still photography | 당신의 순간을, 오래도록',
  description: '10년의 경험으로 담는 자연스러운 인물사진과 브랜드의 이야기. 프로필·스냅, 쇼핑몰, 제품, 기업홍보, 행사 촬영을 문의하세요.',
  openGraph: { title: 'Still photography', description: '당신의 순간을, 오래도록.', images: [{ url: '/images/hero.jpg', width: 1800, height: 2700 }], locale: 'ko_KR', type: 'website' },
};
export default function RootLayout({ children }) {
  return <html lang="ko"><body><a className="skip-link" href="#main">본문 바로가기</a>{children}</body></html>;
}
