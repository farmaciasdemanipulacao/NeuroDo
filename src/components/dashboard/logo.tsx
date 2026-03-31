import React from 'react';
import { cn } from '@/lib/utils';

export function Logo({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <div className="flex items-center gap-3 px-2">
      <svg
        width="32"
        height="32"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("h-7 w-7", className)}
        {...props}
      >
        <defs>
          <linearGradient id="logo-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#14B8A6" />
          </linearGradient>
        </defs>
        <path
          d="M27.96 23.32C24.08 23.32 21.04 25.8 20.24 29.4C19.8 28 19.28 26.68 18.64 25.44C16.8 21.84 13.44 19.4 9.4 19.4C5.44 19.4 2 22.84 2 26.8C2 30.76 5.44 34.2 9.4 34.2C13.8 34.2 17.48 31.2 18.84 27.24C19.76 29.84 21.2 32.12 23.08 33.88L23.48 34.24L23.88 33.8C25.64 32.04 27.04 29.84 27.92 27.24C28.84 31.2 32.52 34.2 36.92 34.2C40.88 34.2 44.32 30.76 44.32 26.8C44.32 22.84 40.88 19.4 36.92 19.4C32.88 19.4 29.52 21.84 27.68 25.44C27.92 24.72 28.08 24.04 28.08 23.32H27.96ZM21.08 17.56L24.48 14.16L24.52 14.12L31.32 7.32L34.12 4.52L37.72 8.12L34.92 10.92L28.12 17.72L24.72 21.12L21.08 17.56Z"
          fill="url(#logo-gradient)"
        />
      </svg>
      <h1 className="text-xl font-bold text-foreground whitespace-nowrap group-data-[collapsible=icon]:hidden">
        NeuroDO
      </h1>
    </div>
  );
}
