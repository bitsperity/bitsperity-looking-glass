export type ThoughtType = 'observation' | 'hypothesis' | 'analysis' | 'decision' | 'reflection' | 'question';
export type StatusType = 'active' | 'validated' | 'invalidated' | 'archived' | 'deleted' | 'quarantined';

export type Links = {
  ariadne_entities?: string[];
  ariadne_facts?: string[];
  news_ids?: string[];
  price_event_ids?: string[];
  related_thoughts?: string[];
};

export type Epistemology = {
  reasoning?: string;
  assumptions?: string[];
  evidence?: string[];
};

export type RetrievalInfo = {
  embedding_model?: string;
  vector_hint?: 'text' | 'title';
  keywords?: string[];
};

export type Flags = {
  promoted_to_kg?: boolean;
  pinned?: boolean;
  quarantined?: boolean;
};

export type ThoughtEnvelope = {
  id?: string;
  type: ThoughtType;
  version?: number;
  agent_id?: string;
  created_at?: string;
  updated_at?: string;
  status?: StatusType;
  confidence_level?: 'speculation' | 'low' | 'medium' | 'high' | 'certain';
  confidence_score?: number;
  title: string;
  content: string;
  summary?: string;
  tags?: string[];
  tickers?: string[];
  sectors?: string[];
  timeframe?: string;
  links?: Links;
  epistemology?: Epistemology;
  retrieval?: RetrievalInfo;
  flags?: Flags;
  type_payload?: any;
};

export type SearchRequest = {
  query?: string;
  vector?: 'text' | 'title';
  filters?: any;
  boosts?: any;
  facets?: string[];
  limit?: number;
  offset?: number;
  diversity?: { mmr_lambda?: number } | null;
};


