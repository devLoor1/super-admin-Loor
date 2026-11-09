/** Render-ready slide (resolved from an image association of the document). */
export type ShowcaseSlide = {
  readonly id: string
  readonly src: string
  /** Empty for explicitly decorative images. */
  readonly alt: string
  readonly width?: number
  readonly height?: number
}
