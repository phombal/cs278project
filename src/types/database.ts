// Hand-written types for the Supabase schema.
// Run `npm run db:types` after migrations to regenerate.

export type BoardKind =
  | "neighborhood"
  | "megathread"
  | "roommates"
  | "future-housing";

export type PostType = "discussion" | "review" | "roommate" | "question";

export type LeaseType = "short_term" | "long_term";

export interface Profile {
  id: string;
  username: string;
  anonymous_handle: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  current_neighborhood: string | null;
  future_neighborhood: string | null;
  graduation_year: number | null;
  is_looking_for_roommate: boolean;
  is_looking_for_housing: boolean;
  post_karma: number;
  comment_karma: number;
  created_at: string;
  updated_at: string;
}

export interface Neighborhood {
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
}

export interface Board {
  id: string;
  slug: string;
  name: string;
  description: string;
  kind: BoardKind;
  neighborhood_slug: string | null;
  member_count: number;
  is_pinned: boolean;
  sort_order: number;
  created_at: string;
}

export interface Post {
  id: string;
  board_id: string;
  author_id: string;
  post_type: PostType;
  title: string;
  body: string | null;
  photos: string[] | null;
  /** Legacy single rating; prefer rating_overall + dimensions for reviews */
  rating: number | null;
  rent_per_month_cents: number | null;
  lease_start: string | null;
  lease_end: string | null;
  building_or_address: string | null;
  google_place_id: string | null;
  /** Street + city shown publicly; no street number or unit */
  location_label_public: string | null;
  address_formatted: string | null;
  latitude: number | null;
  longitude: number | null;
  rating_landlord: number | null;
  rating_noise: number | null;
  rating_safety: number | null;
  rating_value: number | null;
  rating_commute: number | null;
  rating_overall: number | null;
  lease_type: LeaseType | null;
  furnished: boolean | null;
  affiliation: string | null;
  neighborhood_slug: string | null;
  would_recommend: boolean | null;
  upvotes: number;
  downvotes: number;
  score: number;
  comment_count: number;
  helpful_count: number;
  is_pinned: boolean;
  is_locked: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface PostWithAuthor extends Post {
  author_username: string;
  author_anonymous_handle: string;
  author_display_name: string;
  author_avatar_url: string | null;
  board_slug: string;
  board_name: string;
  board_kind: BoardKind;
}

export interface Comment {
  id: string;
  post_id: string;
  parent_comment_id: string | null;
  author_id: string;
  body: string;
  upvotes: number;
  downvotes: number;
  score: number;
  depth: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommentWithAuthor extends Comment {
  author_username: string;
  author_anonymous_handle: string;
  author_display_name: string;
  author_avatar_url: string | null;
}

export interface Vote {
  user_id: string;
  target_type: "post" | "comment";
  target_id: string;
  value: 1 | -1;
  created_at: string;
}
