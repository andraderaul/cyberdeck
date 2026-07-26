import { describe, expect, it } from 'vitest'
import { topCityLabels } from './labels'
import type { RenderInstruction } from './types'

const ins = (label: string, capacity: number, brightness = 1, x = 0, y = 0): RenderInstruction => ({
  x,
  y,
  brightness,
  capacity,
  label,
})

describe('topCityLabels', () => {
  it('labels the strongest N cities, ranked by capacity', () => {
    const labels = topCityLabels(
      [
        ins('Frankfurt', 400, 1, 0, 0),
        ins('Amsterdam', 300, 1, 100, 0),
        ins('Tokyo', 200, 1, 200, 0),
        ins('Lagos', 10, 1, 300, 0),
      ],
      2,
    )
    expect(labels.map((l) => l.text)).toEqual(['FRANKFURT', 'AMSTERDAM'])
  })

  it('thins colliding labels — the strongest survives, near neighbours are skipped', () => {
    const labels = topCityLabels(
      [
        ins('Frankfurt', 400, 1, 100, 100),
        ins('Offenbach', 350, 1, 105, 102), // right on top of Frankfurt
        ins('Tokyo', 200, 1, 400, 400), // far away
      ],
      5,
      40,
    )
    expect(labels.map((l) => l.text)).toEqual(['FRANKFURT', 'TOKYO'])
  })

  it('groups a metro to one label, pinned to its brightest (highest-capacity) node', () => {
    const labels = topCityLabels(
      [ins('Frankfurt', 100, 0.5, 10, 10), ins('Frankfurt', 400, 1, 20, 20)],
      5,
    )
    expect(labels).toHaveLength(1)
    expect(labels[0]).toMatchObject({ text: 'FRANKFURT', x: 20, y: 20 })
  })

  it('carries brightness so the label can fade with its node', () => {
    const [label] = topCityLabels([ins('Frankfurt', 400, 0.3)], 1)
    expect(label.brightness).toBe(0.3)
  })

  it('skips points with no city', () => {
    const labels = topCityLabels(
      [{ x: 0, y: 0, brightness: 1, capacity: 999 }, ins('Frankfurt', 100)],
      5,
    )
    expect(labels.map((l) => l.text)).toEqual(['FRANKFURT'])
  })

  it('returns fewer than N when the frame has fewer cities', () => {
    expect(topCityLabels([ins('Frankfurt', 400)], 10)).toHaveLength(1)
  })
})
