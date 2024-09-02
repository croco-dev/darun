import { Flex } from '@kuma-ui/core';
import { ReactNode } from 'react';

type ChipProps = {
  children: ReactNode;
  as?: 'div' | 'a' | 'button';
  onClick?: () => void;
  variant?: keyof typeof chipVariants;
  color?: keyof typeof chipColors;
};

const chipVariants = {
  square: {
    padding: '3px 5px',
    borderRadius: 4,
    fontSize: '12px',
  },
  circle: {
    padding: '4px 8px',
    borderRadius: 16,
    fontSize: '12px',
  },
};

const chipColors = {
  filledGray: {
    backgroundColor: 'colors.dark.100',
    textColor: 'colors.dark.700',
    borderColor: 'colors.dark.100',
  },
  filledDark: {
    backgroundColor: 'colors.dark.900',
    textColor: 'colors.dark.100',
    borderColor: 'colors.dark.900',
  },
  outlineGray: {
    backgroundColor: 'transparent',
    textColor: 'colors.dark.600',
    borderColor: 'rgba(0, 0, 0, 0.15)',
  },
  outlineBrown: {
    backgroundColor: 'transparent',
    textColor: 'colors.brown.900',
    borderColor: 'colors.brown.300',
  },
  outlineLeaf: {
    backgroundColor: 'transparent',
    textColor: 'colors.leaf.900',
    borderColor: 'colors.leaf.300',
  },
  outlineYellow: {
    backgroundColor: 'transparent',
    textColor: 'colors.yellow.900',
    borderColor: 'colors.yellow.300',
  },
  outlineCherry: {
    backgroundColor: 'transparent',
    textColor: 'colors.cherry.900',
    borderColor: 'colors.cherry.300',
  },
};

export function Chip({ as = 'div', color = 'filledGray', variant = 'square', onClick, children }: ChipProps) {
  return (
    <Flex
      as={as}
      onClick={onClick}
      padding={chipVariants[variant].padding}
      borderRadius={chipVariants[variant].borderRadius}
      backgroundColor={chipColors[color].backgroundColor}
      color={chipColors[color].textColor}
      border={`1px solid`}
      borderColor={chipColors[color].borderColor}
      fontSize={chipVariants[variant].fontSize}
    >
      {children}
    </Flex>
  );
}
