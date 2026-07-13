import { FC, RefObject } from 'react';

interface ScrollFloatProps {
  children: string;
  scrollContainerRef?: RefObject<HTMLElement>;
  containerClassName?: string;
  textClassName?: string;
  animationDuration?: number;
  ease?: string;
  scrollStart?: string;
  scrollEnd?: string;
  stagger?: number;
}

declare const ScrollFloat: FC<ScrollFloatProps>;
export default ScrollFloat;
