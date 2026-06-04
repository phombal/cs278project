export interface PlaceSelection {
  placeId: string;
  /** Full address — visible only to you while composing */
  composeLabel: string;
  /** Street + city — used for title suggestion; stored publicly after submit */
  publicLocationLabel: string;
}
