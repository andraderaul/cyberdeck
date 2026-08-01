// biome-ignore lint/performance/noBarrelFile: the /ui naipe is a deliberate public entry point of the kit (ADR 0014)
export { default as Button } from './button'
export { default as Chip } from './chip'
export { default as EmptyStateHero } from './empty-state-hero'
export { default as ErrorBoundary } from './error-boundary'
export { default as Label } from './label'
export { default as Modal } from './modal'
export { default as Slider } from './slider'
export { default as SourceImageDropZone } from './source-image-drop-zone'
export { default as TabStrip, type Tab } from './tab-strip'
export { default as ThemeControl } from './theme-control'
export { default as Toast } from './toast'
export {
  ToastContext,
  ToastProvider,
  useToastError,
  useToastInfo,
  useToastWarn,
} from './toast-provider'
export { default as ToggleGroup } from './toggle-group'
export { default as Tooltip } from './tooltip'
// `TOUCH_TARGET_OVERLAY` stays module-local deliberately: its only caller is the kit's own Tooltip,
// and ADR 0014's bar for crossing into the public surface is two real callers, not one.
export { TOUCH_TARGET_HEIGHT } from './touch-target'
