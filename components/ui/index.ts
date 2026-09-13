/**
 * Production UI primitives.
 *
 * Import from '@/components/ui'. Everything here consumes semantic design
 * tokens — no component contains a colour, radius, shadow, duration or font
 * value of its own, so a visual redesign is a change to styles/tokens.css
 * rather than a rewrite of these files.
 *
 * The specimen under app/(design)/design-system/ is a separate, isolated
 * review surface. Nothing here imports from it, and it imports nothing here.
 */

export { Badge, Avatar } from './badge';
export type { BadgeProps, AvatarProps } from './badge';

export { Button, IconButton } from './button';
export type { ButtonProps, IconButtonProps } from './button';

export { Card } from './card';
export type { CardProps } from './card';

export { CardAction } from './card-action';
export type { CardActionProps } from './card-action';

export { Dialog, Drawer } from './dialog';
export type { DrawerProps } from './dialog';

export { EmptyState, ErrorState, Skeleton, Spinner } from './feedback';
export type { SkeletonProps, SpinnerProps } from './feedback';

export { Checkbox, Field, Input, Radio, Select, Textarea } from './field';
export type { FieldProps, InputProps, SelectProps, TextareaProps } from './field';

export { GlassPanel } from './glass-panel';
export type { GlassPanelProps } from './glass-panel';

export { LinkButton } from './link-button';
export type { LinkButtonProps } from './link-button';

export { ImageFrame, ImageScrim } from './image-frame';
export type { ImageFrameProps } from './image-frame';

export { Container, Section, Separator, Stack } from './layout';
export type { ContainerProps, SectionProps, SeparatorProps, StackProps } from './layout';

export { Heading, Text } from './typography';
export type { HeadingProps, TextProps } from './typography';
