import { Button } from '@cyberdeck/deck-kit/ui'
import { useId, useState } from 'react'
import Label from './label'

/**
 * Owns its own open state — what's inside is the caller's business, and no caller so far needs to
 * drive it from outside.
 */
export default function Disclosure({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerId = useId()
  const regionId = useId()

  return (
    <div className="flex flex-col gap-md">
      <Button
        id={triggerId}
        variant="ghost"
        aria-expanded={isOpen}
        // Only while open: the region unmounts when collapsed, and a reference to an absent element
        // is a dangling one for assistive tech. Diverges from ASCII//Convert's mobile-controls,
        // which keeps its panels mounted behind `hidden` — affordable here because what's inside
        // holds no state of its own to lose (GlitchSettings lives up in App).
        aria-controls={isOpen ? regionId : undefined}
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between"
      >
        <Label>{label}</Label>
        <span aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
      </Button>

      {/* A named section carries role=region on its own — reached through aria-controls, an
          unlabelled wrapper would announce as a bare group. */}
      {isOpen && (
        <section id={regionId} aria-labelledby={triggerId}>
          {children}
        </section>
      )}
    </div>
  )
}
