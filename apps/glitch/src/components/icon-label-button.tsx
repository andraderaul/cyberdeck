import { Button, ICON_GLYPH } from '@cyberdeck/deck-kit/ui'
import { cn } from '@cyberdeck/deck-kit/utils'

type Props = Omit<React.ComponentProps<typeof Button>, 'children' | 'aria-label'> & {
  glyph: string
  label: string
}

/**
 * A Strip control that drops to its glyph alone below `sm`, where the row's width is the scarce
 * thing, and takes its label back from `sm` up. The accessible name is the label at both sizes, so
 * neither the glyph nor the visible text is ever the only carrier of the name.
 */
export default function IconLabelButton({ glyph, label, ...props }: Props) {
  return (
    <Button {...props} aria-label={label}>
      {/* The size goes on the span, never on the Button: its own font-size is an arbitrary property
          (`[font-size:var(--btn-secondary-size)]`), which tailwind-merge does not read as a
          conflict, so a `text-*` passed down would not reliably win. Below `sm` the glyph is alone
          and takes ICON_GLYPH; from `sm` it drops back to the Button's own 13px, where the label
          beside it is what carries the control. */}
      <span aria-hidden="true" className={cn(ICON_GLYPH, 'sm:text-sm')}>
        {glyph}
      </span>
      <span className="hidden sm:inline"> {label}</span>
    </Button>
  )
}
