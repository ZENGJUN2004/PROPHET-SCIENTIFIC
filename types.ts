
export interface GroundingSource {
  web?: {
    uri: string;
    title: string;
  };
}

export type AttributionCategory = 'Policy' | 'Liquidity' | 'External' | 'Technical' | 'Sentiment' | 'Other';

export interface PredictionRecord {
  id: string;
  date: string;
  marketType: string;
  prediction: 'up' | 'down' | 'sideways';
  confidence: number; // 0-100
  reasoning: {
    macro: string;
    liquidity: string;
    technical: string;
    sentiment: string;
  };
  rawReport: string;
  sources: GroundingSource[];
  isReviewed: boolean;
  // Review fields
  actualOutcome?: 'up' | 'down' | 'sideways';
  isCorrect?: boolean;
  attributionCategory?: AttributionCategory;
  failureAnalysis?: string;
  learningRule: string; // The extracted rule for future bias correction
}

export interface MarketIndex {
  name: string;
  value: string;
  change: string;
  changePercent: string;
  isUp: boolean;
}
