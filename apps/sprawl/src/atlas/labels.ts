// Orientation without a basemap (ADR 0021, P5): city names on the brightest nodes. A city name
// carries geography without drawing geography — you read "FRANKFURT" and you know where you are,
// and the recognition still happened in the dark first. Pure: derived from the projected frame, so
// labels track the scale for free (a city that fades out of the frame loses its label).

import type { RenderInstruction } from './types'

/** A city name pinned to its brightest node in the current frame. */
export interface CityLabel {
  x: number
  y: number
  text: string
  brightness: number
}

/**
 * The strongest N cities in the frame, one label each, spatially thinned so they stay legible.
 * Facilities are grouped by city (a metro with a dozen buildings is labelled once, on its brightest
 * node) and ranked by connected capacity. The strongest are taken greedily, skipping any that fall
 * within `minDistance` px of a label already chosen — otherwise the dense European core alone eats
 * the whole budget and the names pile into an unreadable smear. The result is the strongest city per
 * region, which is exactly what orients you (ADR 0021, P5).
 *
 * Ranking by capacity — not brightness — keeps the set stable as the scale slides: the majors stay
 * named while dimmer cities, already dropped from the frame by `project`, simply have no label.
 * `brightness` rides along so a label can fade with its node.
 */
export function topCityLabels(
  instructions: readonly RenderInstruction[],
  n: number,
  minDistance = 0,
): CityLabel[] {
  const brightestByCity = new Map<string, RenderInstruction>()
  for (const ins of instructions) {
    if (!ins.label) {
      continue
    }
    const current = brightestByCity.get(ins.label)
    if (!current || ins.capacity > current.capacity) {
      brightestByCity.set(ins.label, ins)
    }
  }

  const ranked = [...brightestByCity.values()].sort((a, b) => b.capacity - a.capacity)
  const minDistanceSq = minDistance * minDistance
  const labels: CityLabel[] = []
  for (const ins of ranked) {
    if (labels.length >= n) {
      break
    }
    const collides = labels.some((l) => {
      const dx = l.x - ins.x
      const dy = l.y - ins.y
      return dx * dx + dy * dy < minDistanceSq
    })
    if (collides) {
      continue
    }
    labels.push({
      x: ins.x,
      y: ins.y,
      text: (ins.label as string).toUpperCase(),
      brightness: ins.brightness,
    })
  }
  return labels
}
