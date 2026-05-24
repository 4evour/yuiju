export const RETRY_COUNT = 3;

export type ParameterAgentSelectedItem = {
  value: string;
  quantity: number;
};

export type FoodAgentDecision = {
  selectedList: ParameterAgentSelectedItem[];
};

export type ShopProductAgentDecision = {
  selectedList: ParameterAgentSelectedItem[];
};

export type ShrinePrayerAgentDecision = {
  shouldOffer: boolean;
  wish?: string;
};
