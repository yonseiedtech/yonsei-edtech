export type CardType =
  | "birth"
  | "wedding"
  | "graduation"
  | "award"
  | "admission"
  | "birthday"
  | "free";

export interface CelebrationCardData {
  type: CardType;
  headline: string;
  recipientPrefix: string;
  recipientName: string;
  recipientHonorific: string;
  /** Each string supports **bold** markdown */
  paragraphs: string[];
  closing: string;
  senderSuffix: string;
  /** URL for photo area. Empty string → use placeholder. */
  photoUrl: string;
  usePhotoPlaceholder: boolean;
}
