'use client';

import React from 'react';
import styled from 'styled-components';
import { IconButton as RadixIconButton } from '@radix-ui/themes';
import type { ComponentPropsWithoutRef } from 'react';

type RadixIconButtonProps = ComponentPropsWithoutRef<typeof RadixIconButton>;
type IconButtonVariant = 'solid' | 'soft' | 'outline' | 'ghost' | 'surface';

interface IconButtonProps extends Omit<RadixIconButtonProps, 'variant'> {
  variant?: IconButtonVariant;
}

const VariantMapping: Record<IconButtonVariant, RadixIconButtonProps['variant']> = {
  solid: 'solid',
  soft: 'soft',
  outline: 'outline',
  surface: 'surface',
  ghost: 'soft',
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant = 'solid', ...props }, ref) => {
    return (
      <StyledIconButton
        ref={ref}
        variant={VariantMapping[variant]}
        data-variant={variant}
        {...props}
      />
    );
  }
);

IconButton.displayName = 'IconButton';

const StyledIconButton = styled(RadixIconButton)`
  border-radius: var(--radius-3);
  font-weight: 500;

  &[data-variant="ghost"] {
    background-color: transparent;

    &:hover:not(:disabled) {
      background-color: var(--gray-a3);
    }
  }
`;
