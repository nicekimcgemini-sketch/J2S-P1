/** 낙엽 장식 일러스트 — 참고 디자인(단풍 출근부)의 모서리 낙엽 연출을 재현한다.
 *  콘텐츠 카드보다 먼저 렌더링해서 일반 흐름 요소(카드)가 자연스럽게 위에 쌓이게 한다. */
function MapleLeaf({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" aria-hidden="true" className={className} style={style}>
      <path d="M50 8 L59 28 L78 20 L70 38 L92 42 L72 52 L86 68 L64 60 L60 82 L50 66 L40 82 L36 60 L14 68 L28 52 L8 42 L30 38 L22 20 L41 28 Z" />
      <path d="M50 66 L50 92" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

type LeafSpec = {
  top?: string; bottom?: string; left?: string; right?: string;
  size: number; rotate: number; color: string; opacity: number;
};

const DEFAULT_LEAVES: LeafSpec[] = [
  { top: '-3%', right: '-4%', size: 150, rotate: 12, color: 'text-brand-300', opacity: 0.5 },
  { top: '8%', right: '14%', size: 46, rotate: -18, color: 'text-rose-300', opacity: 0.55 },
  { bottom: '-4%', left: '-5%', size: 130, rotate: -10, color: 'text-brand-400', opacity: 0.45 },
  { bottom: '12%', left: '10%', size: 40, rotate: 24, color: 'text-amber-300', opacity: 0.5 },
];

/** 배경에 은은하게 깔리는 낙엽 몇 장. 부모에 `relative overflow-hidden`이 있어야 한다. */
export function AutumnLeaves({ leaves = DEFAULT_LEAVES }: { leaves?: LeafSpec[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {leaves.map((leaf, i) => (
        <MapleLeaf
          key={i}
          className={leaf.color}
          style={{
            position: 'absolute',
            top: leaf.top,
            bottom: leaf.bottom,
            left: leaf.left,
            right: leaf.right,
            width: leaf.size,
            height: leaf.size,
            opacity: leaf.opacity,
            transform: `rotate(${leaf.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
