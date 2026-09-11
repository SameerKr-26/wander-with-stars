import Image, { type ImageProps } from 'next/image';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * ImageFrame — consistent aspect ratio, cropping and geometry for imagery.
 *
 * Photography is a primary brand element (docs/WWS_VISUAL_IDENTITY.md §10), so
 * the crop behaviour is centralised: repeated cards must share an aspect ratio,
 * and a subject must not drift out of frame when the box changes shape.
 *
 * `focal` controls which part survives the crop. Faces and horizons sit above
 * centre far more often than not, which is why it is a prop rather than a
 * hardcoded `object-position: center`.
 *
 * There is no gallery, carousel or stock imagery here. Those belong to the
 * travel domain, with real trip media.
 */

type AspectRatio = 'square' | 'card' | 'wide' | 'portrait' | 'cinematic';

const RATIO: Record<AspectRatio, string> = {
  square: '1 / 1',
  card: '16 / 10',
  wide: '16 / 9',
  portrait: '4 / 5',
  cinematic: '21 / 9',
};

type Focal = 'center' | 'top' | 'bottom' | 'left' | 'right';

export interface ImageFrameProps {
  src: ImageProps['src'];
  /** Empty string marks the image as decorative. Never omit it. */
  alt: string;
  ratio?: AspectRatio;
  focal?: Focal;
  radius?: 'control' | 'card' | 'panel' | 'none';
  /** Subtle zoom on hover. Ignored on touch, and under reduced motion. */
  zoom?: boolean;
  priority?: boolean;
  sizes?: string;
  className?: string;
  /** Overlays: a readability scrim, a badge, a caption. */
  children?: ReactNode;
}

export function ImageFrame({
  src,
  alt,
  ratio = 'card',
  focal = 'center',
  radius = 'card',
  zoom = false,
  priority = false,
  sizes = '(max-width: 768px) 100vw, 400px',
  className,
  children,
}: ImageFrameProps) {
  return (
    <div
      className={cn(
        'wws-image-frame relative overflow-hidden',
        zoom && 'wws-image-frame--zoom',
        className,
      )}
      style={{
        aspectRatio: RATIO[ratio],
        borderRadius: radius === 'none' ? undefined : `var(--radius-${radius})`,
        backgroundColor: 'var(--color-surface-sunk)',
        /* max-width so the frame can never push the page sideways. */
        maxWidth: '100%',
      }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="wws-image-frame__media"
        style={{ objectFit: 'cover', objectPosition: focal }}
      />
      {children}
    </div>
  );
}

/**
 * Readability scrim for text sitting on an image.
 *
 * docs/DESIGN_SYSTEM.md §11: gradients only where they improve legibility.
 * Decorative, so hidden from assistive technology.
 */
export function ImageScrim({ from = 'bottom' }: { from?: 'bottom' | 'top' }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        background: `linear-gradient(to ${from === 'bottom' ? 'top' : 'bottom'}, color-mix(in srgb, var(--wws-charcoal) 62%, transparent), transparent 55%)`,
      }}
    />
  );
}
