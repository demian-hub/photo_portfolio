export const allowedCategories = ['인물 프로필·스냅', '쇼핑몰 상세페이지', '제품사진', '기업홍보사진', '행사사진', '기타'];
export const budgets = ['미정·상담 후 결정', '30만 원 미만', '30–50만 원', '50–100만 원', '100–200만 원', '200만 원 이상'];
export const statuses = ['신규', '확인', '상담 중', '완료'];
export function validateInquiry(input) {
  const data = {};
  const errors = {};
  for (const key of ['name', 'contact', 'category', 'requirements', 'budget', 'preferred_date', 'location']) {
    data[key] = typeof input[key] === 'string' ? input[key].trim() : '';
  }
  if (data.name.length < 2 || data.name.length > 60) errors.name = '이름을 2~60자로 입력해주세요.';
  const validContact = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contact) || /^\+?[\d\s()-]{9,25}$/.test(data.contact);
  if (!validContact || data.contact.length > 150) errors.contact = '연락 가능한 전화번호 또는 이메일을 입력해주세요.';
  if (!allowedCategories.includes(data.category)) errors.category = '촬영 분야를 선택해주세요.';
  if (data.requirements.length < 10 || data.requirements.length > 5000) errors.requirements = '촬영 요구사항을 10~5,000자로 입력해주세요.';
  if (data.budget && !budgets.includes(data.budget)) errors.budget = '예산 범위를 다시 선택해주세요.';
  if (data.location.length > 150) errors.location = '촬영 지역을 150자 이내로 입력해주세요.';
  if (data.preferred_date) {
    const date = new Date(`${data.preferred_date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.preferred_date) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== data.preferred_date || data.preferred_date < new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })) errors.preferred_date = '오늘 이후의 유효한 촬영일을 선택해주세요.';
  }
  if (input.consent !== true) errors.consent = '개인정보 수집·이용 동의가 필요합니다.';
  return { data, errors };
}
