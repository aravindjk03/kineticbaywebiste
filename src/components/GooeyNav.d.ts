import { FC } from 'react';

export interface GooeyNavItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface GooeyNavProps {
  items: GooeyNavItem[];
  animationTime?: number;
  particleCount?: number;
  particleDistances?: [number, number];
  particleR?: number;
  timeVariance?: number;
  colors?: number[];
  initialActiveIndex?: number;
}

declare const GooeyNav: FC<GooeyNavProps>;
export default GooeyNav;
