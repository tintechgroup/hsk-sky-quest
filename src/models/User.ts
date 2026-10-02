import {
  model,
  models,
  Schema,
} from "mongoose";

import type {
  HydratedDocument,
  Model,
} from "mongoose";

export type UserRole =
  | "user"
  | "admin";

export type UserStatus =
  | "active"
  | "inactive"
  | "blocked";

export interface UserData {
  name: string;

  /*
   * Tài khoản đăng nhập mới.
   */
  username?: string;

  /*
   * Mật khẩu đã mã hóa.
   */
  passwordHash?: string;

  /*
   * Dữ liệu cũ / tùy chọn.
   *
   * Không bắt buộc với tài khoản mới.
   */
  phone?: string;
  email?: string;

  role: UserRole;
  status: UserStatus;

  /*
   * Các field cũ giữ lại để tương thích.
   *
   * Thống kê chính hiện tại nên đọc
   * từ PlayerStats.
   */
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  totalScore: number;

  isActive: boolean;

  lastLoginAt:
    | Date
    | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export type UserDocument =
  HydratedDocument<UserData>;

/*
 * =========================================
 * USER SCHEMA
 * =========================================
 */

const userSchema =
  new Schema<UserData>(
    {
      /*
       * =====================================
       * TÊN HIỂN THỊ
       * =====================================
       *
       * Có thể trùng giữa nhiều tài khoản.
       */
      name: {
        type: String,

        required: [
          true,
          "Tên người dùng là bắt buộc.",
        ],

        trim: true,

        minlength: [
          2,
          "Tên người dùng phải có ít nhất 2 ký tự.",
        ],

        maxlength: [
          100,
          "Tên người dùng không được quá 100 ký tự.",
        ],
      },

      /*
       * =====================================
       * USERNAME
       * =====================================
       *
       * Đây là tài khoản đăng nhập.
       *
       * Bắt buộc unique khi có giá trị.
       */
      username: {
        type: String,

        trim: true,

        lowercase: true,

        minlength: [
          4,
          "Tài khoản phải có ít nhất 4 ký tự.",
        ],

        maxlength: [
          30,
          "Tài khoản không được quá 30 ký tự.",
        ],

        match: [
          /^[a-z0-9._-]+$/,
          "Tài khoản chỉ được chứa chữ thường không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang.",
        ],
      },

      /*
       * =====================================
       * PASSWORD HASH
       * =====================================
       *
       * Không trả về trong query thông thường.
       */
      passwordHash: {
        type: String,

        select: false,
      },

      /*
       * =====================================
       * PHONE
       * =====================================
       *
       * Không:
       *
       * unique: true
       * sparse: true
       *
       * ở field này.
       *
       * Unique được xử lý bằng
       * partial index ở cuối file.
       */
      phone: {
        type: String,

        trim: true,

        default:
          undefined,

        set(
          value:
            | string
            | undefined
            | null,
        ) {
          if (
            typeof value !==
            "string"
          ) {
            return undefined;
          }

          const normalized =
            value.trim();

          /*
           * Chuỗi rỗng phải trở thành
           * undefined để không bị
           * unique index coi là một giá trị.
           */
          return normalized ||
            undefined;
        },
      },

      /*
       * =====================================
       * EMAIL
       * =====================================
       */
      email: {
        type: String,

        trim: true,

        lowercase: true,

        default:
          undefined,

        set(
          value:
            | string
            | undefined
            | null,
        ) {
          if (
            typeof value !==
            "string"
          ) {
            return undefined;
          }

          const normalized =
            value
              .trim()
              .toLowerCase();

          return normalized ||
            undefined;
        },
      },

      /*
       * =====================================
       * ROLE
       * =====================================
       */
      role: {
        type: String,

        enum: [
          "user",
          "admin",
        ],

        default:
          "user",

        index: true,
      },

      /*
       * =====================================
       * STATUS
       * =====================================
       */
      status: {
        type: String,

        enum: [
          "active",
          "inactive",
          "blocked",
        ],

        default:
          "active",

        index: true,
      },

      /*
       * =====================================
       * LEGACY STATS
       * =====================================
       *
       * Giữ để tương thích code cũ.
       *
       * Thống kê mới dùng PlayerStats.
       */
      gamesPlayed: {
        type: Number,

        default: 0,

        min: 0,
      },

      wins: {
        type: Number,

        default: 0,

        min: 0,
      },

      losses: {
        type: Number,

        default: 0,

        min: 0,
      },

      draws: {
        type: Number,

        default: 0,

        min: 0,
      },

      totalScore: {
        type: Number,

        default: 0,

        min: 0,
      },

      /*
       * =====================================
       * ACTIVE
       * =====================================
       */
      isActive: {
        type: Boolean,

        default: true,

        index: true,
      },

      /*
       * =====================================
       * LOGIN
       * =====================================
       */
      lastLoginAt: {
        type: Date,

        default: null,
      },
    },
    {
      timestamps: true,

      versionKey: false,

      /*
       * Không cho passwordHash xuất hiện
       * khi convert document sang JSON.
       */
      toJSON: {
        transform(
          _document,
          returnedObject,
        ) {
          delete returnedObject
            .passwordHash;

          return returnedObject;
        },
      },

      toObject: {
        transform(
          _document,
          returnedObject,
        ) {
          delete returnedObject
            .passwordHash;

          return returnedObject;
        },
      },
    },
  );

/*
 * =========================================
 * NORMALIZE BEFORE VALIDATE
 * =========================================
 *
 * Dùng validate thay vì save
 * để create / save đều nhất quán.
 */

userSchema.pre(
  "validate",

  function () {
    /*
     * Username.
     */
    if (
      typeof this.username ===
      "string"
    ) {
      const normalized =
        this.username
          .trim()
          .toLowerCase();

      this.username =
        normalized ||
        undefined;
    }

    /*
     * Phone.
     */
    if (
      typeof this.phone ===
      "string"
    ) {
      const normalized =
        this.phone.trim();

      this.phone =
        normalized ||
        undefined;
    }

    /*
     * Email.
     */
    if (
      typeof this.email ===
      "string"
    ) {
      const normalized =
        this.email
          .trim()
          .toLowerCase();

      this.email =
        normalized ||
        undefined;
    }
  },
);

/*
 * =========================================
 * UNIQUE USERNAME
 * =========================================
 *
 * Chỉ áp dụng khi username là string
 * và không rỗng.
 *
 * Điều này vẫn hỗ trợ dữ liệu cũ
 * có thể chưa có username.
 */

userSchema.index(
  {
    username: 1,
  },
  {
    unique: true,

    partialFilterExpression: {
      username: {
        $type: "string",
        $gt: "",
      },
    },
  },
);

/*
 * =========================================
 * UNIQUE PHONE
 * =========================================
 *
 * Chỉ unique khi phone thật sự
 * có giá trị.
 *
 * Các user không có phone
 * sẽ không tham gia index.
 */

userSchema.index(
  {
    phone: 1,
  },
  {
    unique: true,

    partialFilterExpression: {
      phone: {
        $type: "string",
        $gt: "",
      },
    },
  },
);

/*
 * =========================================
 * UNIQUE EMAIL
 * =========================================
 */

userSchema.index(
  {
    email: 1,
  },
  {
    unique: true,

    partialFilterExpression: {
      email: {
        $type: "string",
        $gt: "",
      },
    },
  },
);

/*
 * =========================================
 * LEADERBOARD LEGACY INDEX
 * =========================================
 */

userSchema.index({
  gamesPlayed: -1,

  wins: -1,

  totalScore: -1,
});

/*
 * =========================================
 * MODEL
 * =========================================
 */

const UserModel:
  Model<UserData> =
  (
    models.User as
      | Model<UserData>
      | undefined
  ) ||
  model<UserData>(
    "User",

    userSchema,
  );

export default UserModel;