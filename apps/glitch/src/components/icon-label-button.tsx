import { Button } from '@cyberdeck/deck-kit/ui'

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
      <span aria-hidden="true">{glyph}</span>
      <span className="hidden sm:inline"> {label}</span>
    </Button>
  )
}
