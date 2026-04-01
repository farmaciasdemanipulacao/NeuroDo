import React from 'react';
import { cn } from '@/lib/utils';

export type LogoVariant = 'square' | 'horizontal' | 'icon';

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: LogoVariant;
}

export function Logo({ className, variant = 'square', ...props }: LogoProps) {
  const logoSrc = variant === 'horizontal'
    ? '/logo-neurodo-horizontal.png'
    : '/logo-neurodo-quadrada.png';

  const imageClass = variant === 'horizontal' ? 'h-10 w-auto' : 'h-8 w-auto';
  const containerClassName = cn('flex items-center gap-3 px-2', className);

  return (
    <div className={containerClassName} {...props}>
      <img src={logoSrc} alt="NeuroDO" className={imageClass} />
      {variant !== 'horizontal' && variant !== 'icon' ? (
        <h1 className="text-xl font-bold text-foreground whitespace-nowrap group-data-[collapsible=icon]:hidden">
          NeuroDO
        </h1>
      ) : null}
    </div>
  );
}
