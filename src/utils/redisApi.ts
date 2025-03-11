import { fetch } from "undici";

export class RedisAPI {
  private baseURL: string;
  private password: string;

  constructor(baseURL: string, password: string) {
    this.baseURL = baseURL;
    this.password = password;
  }

  // 🔹 Private helper for headers
  private getHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.password}`,
    };
  }

  // 🔹 Authenticate Redis
  async authenticate(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/auth`, {
        method: "GET",
        headers: this.getHeaders(),
      });
      console.log(response);
      const data = (await response.json().catch(() => null)) as {
        success: boolean;
        access: string;
      };
      return data.access === "Authenticated" ? true : false;
    } catch (error) {
      console.error("❌ Redis Authentication Failed!", error);
      return false;
    }
  }

  // 🔹 Set a key-value pair with optional expiration
  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    try {
      const params = new URLSearchParams({
        key,
        value: JSON.stringify(value),
      });

      const response = await fetch(
        `${this.baseURL}/api/v1/set?${params.toString()}`,
        {
          method: "POST",
          headers: this.getHeaders(),
        }
      );

      const data = (await response.json().catch(() => null)) as {
        success: boolean;
        SET?: string;
      };
      if (ttl) {
        await this.expire(key, ttl);
      }
      return data?.success === true;
    } catch (error) {
      console.error("❌ Redis SET failed!", error);
      return false;
    }
  }

  // 🔹 Get a value by key
  async get<T>(key: string): Promise<T | null> {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/get/${key}`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      const data = (await response.json().catch(() => null)) as {
        success: boolean;
        GET: string;
      };
      return data?.success === true ? (JSON.parse(data.GET) as T) : null;
    } catch (error) {
      console.error("❌ Redis GET failed!", error);
      return null;
    }
  }

  // 🔹 Delete a key
  async del(key: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/del/${key}`, {
        method: "DELETE",
        headers: this.getHeaders(),
      });

      const data = (await response.json().catch(() => null)) as {
        success: boolean;
        DEL?: number;
      };
      return data?.success === true;
    } catch (error) {
      console.error("❌ Redis DELETE failed!", error);
      return false;
    }
  }

  // 🔹 Expire a key
  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseURL}/api/v1/expire/${key}/${ttl}`,
        {
          method: "POST",
          headers: this.getHeaders(),
        }
      );

      const data = (await response.json().catch(() => null)) as {
        success: boolean;
        EXPIRE?: number;
      };
      return data?.success === true;
    } catch (error) {
      console.error("❌ Redis EXPIRE failed!", error);
      return false;
    }
  }

  // 🔹 Rate limiter (increment + optional TTL)
  async rateLimit(
    key: string,
    maxRequests: number,
    ttl?: number
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/incr/${key}`, {
        method: "POST",
        headers: this.getHeaders(),
      });

      const data = (await response.json().catch(() => null)) as {
        INCR?: number;
      };
      const currentCount = data?.INCR || 0;

      if (ttl && currentCount === 1) {
        await this.expire(key, ttl);
      }

      return currentCount <= maxRequests;
    } catch (error) {
      console.error("❌ Redis Rate Limit failed!", error);
      return false;
    }
  }

  // 🔹 Add value to a Redis set
  async sadd(key: string, value: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/sadd`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({ key, value }),
      });
      const data = (await response.json().catch(() => null)) as {
        SADD?: number;
      };
      return data?.SADD === 1;
    } catch (error) {
      console.error("❌ Redis SADD failed!", error);
      return false;
    }
  }

  // 🔹 Remove value from a Redis set
  async srem(key: string, value: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/srem`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({ key, value }),
      });
      const data = (await response.json().catch(() => null)) as {
        SREM?: number;
      };
      return data?.SREM === 1;
    } catch (error) {
      console.error("❌ Redis SREM failed!", error);
      return false;
    }
  }
}
