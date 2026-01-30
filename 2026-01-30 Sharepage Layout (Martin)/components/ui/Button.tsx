'use client';

import React from 'react';
import styled from 'styled-components';
import { Button as RadixButton } from '@radix-ui/themes';
import type { ComponentPropsWithoutRef } from 'react';

type RadixButtonProps = ComponentPropsWithoutRef<typeof RadixButton>;
type ButtonVariant = 'solid' | 'soft' | 'outline' | 'ghost' | 'surface';

interface ButtonProps extends Omit<RadixButtonProps, 'variant'> {
  variant?: ButtonVariant;
}

// Map our variants to Radix variants
const VariantMapping: Record<ButtonVariant, RadixButtonProps['variant']> = {
  solid: 'solid',
  soft: 'soft',
  outline: 'outline',
  surface: 'surface',
  // ghost uses "soft" under the hood for consistent height
  ghost: 'soft',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'solid', ...props }, ref) => {
    return (
      <StyledButton
        ref={ref}
        variant={VariantMapping[variant]}
        data-variant={variant}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

const StyledButton = styled(RadixButton)`
  border-radius: var(--radius-3);
  font-weight: 500;

  &[data-variant="ghost"] {
    background-color: transparent;

    &:hover:not(:disabled) {
      background-color: var(--gray-a3);
    }
  }
`;
