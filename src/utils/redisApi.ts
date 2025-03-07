export class RedisAPI {
  private baseURL: string;
  private password: string;

  constructor(baseURL: string, password: string) {
    this.baseURL = baseURL;
    this.password = password;
  }

  // Authenticate Redis
  async authenticate(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/AUTH/${this.password}`);
      const data: { AUTH?: [boolean, string] } = await response.json();
      return data.AUTH?.[1] === "OK";
    } catch (error) {
      return false;
    }
  }

  // Set a key-value pair with optional expiration
  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    try {
      const setResponse = await fetch(
        `${this.baseURL}/SET/${key}/${encodeURIComponent(
          JSON.stringify(value)
        )}`
      );
      const setData: { SET?: string } = await setResponse.json();

      if (ttl) {
        await fetch(`${this.baseURL}/EXPIRE/${key}/${ttl}`);
      }

      return setData.SET === "OK";
    } catch (error) {
      return false;
    }
  }

  // Get a value by key
  async get<T>(key: string): Promise<T | null> {
    try {
      const response = await fetch(`${this.baseURL}/GET/${key}`);
      const data: { GET?: string } = await response.json();
      return data.GET ? (JSON.parse(data.GET) as T) : null;
    } catch (error) {
      return null;
    }
  }

  // Delete a key
  async del(key: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/DEL/${key}`);
      const data: { DEL?: number } = await response.json();
      return data.DEL === 1;
    } catch (error) {
      return false;
    }
  }

  async rateLimit(
    key: string,
    maxRequests: number,
    ttl?: number
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/INCR/${key}`);
      const data: { INCR?: number } = await response.json();
      const currentCount = data.INCR || 0;

      if (ttl && currentCount === 1) {
        await fetch(`${this.baseURL}/EXPIRE/${key}/${ttl}`);
      }

      const allowed = currentCount <= maxRequests;

      return allowed;
    } catch (error) {
      return false;
    }
  }
}
