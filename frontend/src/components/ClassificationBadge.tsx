/**
 * Classification badge. Never relies on color alone (Accessibility 5.4):
 * the text label is always present alongside the color.
 */
import type { Classification } from "@food-signal/shared";

export function ClassificationBadge({ value }: { value: Classification }) {
  const className = `badge badge-${value.toLowerCase()}`;
  return (
    <span className={className} aria-label={`Classification: ${value}`}>
      {value}
    </span>
  );
}
