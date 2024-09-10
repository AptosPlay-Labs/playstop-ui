import { FC } from "react";

const ChainReactionIcon: FC = () => (
  <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="20" r="10" fill="#FF5733" />
    <circle cx="80" cy="20" r="10" fill="#33FF57" />
    <circle cx="50" cy="50" r="10" fill="#3357FF" />
    <circle cx="20" cy="80" r="10" fill="#FF33A8" />
    <circle cx="80" cy="80" r="10" fill="#FFC300" />
    <path d="M30,20 L70,20" stroke="#FF5733" strokeWidth="1" markerEnd="url(#arrow)" />
    <path d="M80,30 L80,70" stroke="#33FF57" strokeWidth="1" markerEnd="url(#arrow)" />
    <path d="M30,30 L70,70" stroke="#FF33A8" strokeWidth="1" markerEnd="url(#arrow)" />
    <path d="M70,30 L30,70" stroke="#FFC300" strokeWidth="1" markerEnd="url(#arrow)" />
    <defs>
      <marker id="arrow" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
        <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
      </marker>
    </defs>
  </svg>
);

export default ChainReactionIcon;