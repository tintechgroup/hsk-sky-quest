import {
  model,
  models,
  Schema,
} from "mongoose";

import type {
  HydratedDocument,
  Model,
} from "mongoose";

export interface RegionData {
  name: string;
  chineseName: string;
  pinyin: string;
  slug: string;

  geography: string;
  culture: string;
  landmark: string;

  /*
   * Vị trí trên bản đồ theo phần trăm.
   * 0 <= mapX, mapY <= 100
   */
  mapX: number;
  mapY: number;

  /*
   * Thứ tự máy bay đi qua tỉnh.
   */
  flightOrder: number;

  color: string;
  isActive: boolean;
}

export type RegionDocument =
  HydratedDocument<RegionData>;

const regionSchema =
  new Schema<RegionData>(
    {
      name: {
        type: String,
        required: true,
        trim: true,
        index: true,
      },

      chineseName: {
        type: String,
        required: true,
        trim: true,
      },

      pinyin: {
        type: String,
        required: true,
        trim: true,
      },

      slug: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        unique: true,
        index: true,
      },

      geography: {
        type: String,
        required: true,
        trim: true,
      },

      culture: {
        type: String,
        required: true,
        trim: true,
      },

      landmark: {
        type: String,
        required: true,
        trim: true,
      },

      mapX: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },

      mapY: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },

      flightOrder: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
        index: true,
      },

      color: {
        type: String,
        default: "#34d399",
        trim: true,
      },

      isActive: {
        type: Boolean,
        default: true,
        index: true,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    },
  );

regionSchema.index({
  isActive: 1,
  flightOrder: 1,
});

const RegionModel: Model<RegionData> =
  (models.Region as Model<RegionData>) ||
  model<RegionData>(
    "Region",
    regionSchema,
  );

export default RegionModel;