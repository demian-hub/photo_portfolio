export default function Brand({ href = '/' }) {
  return <a className="wordmark brand" href={href} aria-label="데미안포토 홈"><span>데미안포토</span><small>photography</small></a>;
}
