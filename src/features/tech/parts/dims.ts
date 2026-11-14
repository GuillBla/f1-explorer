/**
 * Main dimensions of the procedural car (metres), following the 2026 FIA technical regulations:
 * wheelbase 3.4 m max, overall width 1.9 m max, 18" rims, narrower tyres (front 280 mm, rear 375 mm,
 * diameters ≈ 705 / 710 mm). Shared by the 3D model and the analytic airflow field.
 * Ground is y = 0, the reference plank height is DIMS.refRide.
 */
export const DIMS = {
  wheelbase: 3.4,
  frontAxleX: 1.7,
  rearAxleX: -1.7,
  /** Mean half track (kept for compatibility), see trackZF / trackZR. */
  trackZ: 0.77,
  /** Front half track: tyre outer face at ≈ 0.92 m. */
  trackZF: 0.78,
  /** Rear half track: tyre outer face at 0.9475 m (< 0.95 m, overall width 1.9 m). */
  trackZR: 0.76,
  tyreRF: 0.3525,
  tyreRR: 0.355,
  tyreWF: 0.28,
  tyreWR: 0.375,
  /** 18" rim (457 mm bead seat diameter). */
  rimR: 0.2286,
  /** Reference plank height used to model the car (30 mm). */
  refRide: 0.03,
  noseX: 2.83,
  frontWing: { xLE: 2.95, xTE: 2.42, span: 1.7, y: 0.085 },
  rearWing: { xLE: -2.06, xTE: -2.6, y: 0.83, span: 0.98 },
} as const
