export type HSKLevel = 3 | 4 | 5 | 6;

export type GamePhase =
  | "start"
  | "flight"
  | "parachuting"
  | "landed";

export interface Region {
  id: string;
  name: string;
  chineseName: string;
  pinyin: string;
  geography: string;
  culture: string;
  landmark: string;
}

export type ItemType =
  | "fifty-fifty"
  | "hint"
  | "pinyin"
  | "extra-time"
  | "retry";

export interface GameItem {
  id: ItemType;
  name: string;
  shortName: string;
  icon: string;
  description: string;
}

export interface LootSpot {
  id: string;
  name: string;
  itemId: ItemType;
}

export type Inventory = Record<ItemType, number>;