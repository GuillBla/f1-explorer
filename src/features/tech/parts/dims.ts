/**
 * Main dimensions of the procedural car (metres), close to the 2026 rules:
 * wheelbase 3.4 m, width 1.9 m, 18" rims. Shared by the 3D model and the analytic airflow field.
 * Ground is y = 0, the reference plank height is DIMS.refRide.
 */
export const DIMS = {
  wheelbase: 3.4,
  frontAxleX: 1.7,
  rearAxleX: -1.7,
  trackZ: 0.8,
  tyreRF: 0.353,
  tyreRR: 0.355,
  tyreWF: 0.28,
  tyreWR: 0.375,
  rimR: 0.229,
  /** Reference plank height used to model the car (30 mm). */
  refRide: 0.03,
  noseX: 2.78,
  frontWing: { xLE: 2.86, xTE: 2.3, span: 1.8, y: 0.075 },
  rearWing: { xLE: -2.08, xTE: -2.56, y: 0.8, span: 1.0 },
} as const
