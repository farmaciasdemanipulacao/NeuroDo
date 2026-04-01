import React from 'react';
import { cn } from '@/lib/utils';

export type LogoVariant = 'square' | 'horizontal' | 'icon';

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: LogoVariant;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Logo({ className, variant = 'square', size = 'md', ...props }: LogoProps) {
  const logoSrc = variant === 'horizontal'
    ? '/logo-neurodo-horizontal-200x80.webp'
    : variant === 'icon'
      ? '/logo-neurodo-favicon-100x100.webp'
      : '/logo-neurodo-quadrada-redimensionada.webp';

  const baseImageClass = 'w-auto';

  const sizeMap: Record<'sm'|'md'|'lg'|'xl', string> = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-14',
    xl: 'h-17',
  };

  const defaultVariantSize = variant === 'horizontal' ? 'lg' : variant === 'icon' ? 'sm' : 'md';
  const selectedSize = size || defaultVariantSize;

  const imageClass = `${sizeMap[selectedSize]} ${baseImageClass}`;

  const containerClassName = cn('flex items-center gap-3 px-2', className);

  return (
    <div className={containerClassName} {...props}>
      <img src={logoSrc} alt="NeuroDO" className={imageClass} aria-label="Logotipo da NeuroDO" />
      {variant !== 'horizontal' && variant !== 'icon' ? (
        <h1 className="text-xl font-bold text-foreground whitespace-nowrap group-data-[collapsible=icon]:hidden">
          NeuroDO
        </h1>
      ) : null}
    </div>
  );
}
