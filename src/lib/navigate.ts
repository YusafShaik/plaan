export interface PlaanNavigateDetail {
  tab: string
  reportId?: string
  section?: string
}

/** Cross-module navigation used by Dashboard and reports. */
export function navigatePlaan(detail: PlaanNavigateDetail) {
  window.dispatchEvent(new CustomEvent<PlaanNavigateDetail>('plaan_navigate', { detail }))
}
