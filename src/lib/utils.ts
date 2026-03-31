import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { differenceInDays } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculates a dynamic HSLA color based on the urgency of a due date.
 * @param dueDate The due date for the item.
 * @returns An HSLA color string (e.g., 'hsla(120, 70%, 45%, 1)').
 */
export function getUrgencyColor(dueDate: Date | null): string {
  if (!dueDate) {
    return 'hsl(var(--border))'; // Default border color if no date
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize today to the start of the day
  const daysRemaining = differenceInDays(dueDate, today);

  if (daysRemaining > 15) {
    const factor = Math.min(1, (daysRemaining - 16) / (60 - 16));
    const luminosity = 45 - (factor * 15);
    const alpha = 1.0 - (factor * 0.5);
    return `hsla(140, 70%, ${luminosity.toFixed(0)}%, ${alpha.toFixed(2)})`;
  }

  if (daysRemaining >= 1 && daysRemaining <= 14) {
    const factor = (daysRemaining - 1) / 13;
    const luminosity = 60 - (factor * 15);
    return `hsla(45, 90%, ${luminosity.toFixed(0)}%, 1)`;
  }

  const overdueFactor = Math.min(1, Math.abs(daysRemaining) / 30);
  const luminosity = 40 + (overdueFactor * 20);
  return `hsla(0, 85%, ${luminosity.toFixed(0)}%, 1)`;
};

/**
 * Formats a numeric value based on its unit.
 * @param value The number to format.
 * @param unit The unit of the number ('currency', 'percentage', or 'number').
 * @returns A formatted string.
 */
export function formatValue(value: number, unit: 'currency' | 'number' | 'percentage'): string {
  switch (unit) {
    case 'currency':
      return `R$ ${value.toLocaleString('pt-BR')}`;
    case 'percentage':
      return `${value}%`;
    case 'number':
    default:
      return value.toString();
  }
}
