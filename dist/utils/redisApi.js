export class RedisAPI {
    baseURL;
    password;
    constructor(baseURL, password) {
        this.baseURL = baseURL;
        this.password = password;
    }
    // Authenticate Redis
    async authenticate() {
        try {
            const response = await fetch(`${this.baseURL}/AUTH/${this.password}`);
            const data = await response.json();
            return data.AUTH?.[1] === "OK";
        }
        catch (error) {
            return false;
        }
    }
    // Set a key-value pair with optional expiration
    async set(key, value, ttl) {
        try {
            const setResponse = await fetch(`${this.baseURL}/SET/${key}/${encodeURIComponent(JSON.stringify(value))}`);
            const setData = await setResponse.json();
            if (ttl) {
                await fetch(`${this.baseURL}/EXPIRE/${key}/${ttl}`);
            }
            return setData.SET === "OK";
        }
        catch (error) {
            return false;
        }
    }
    // Get a value by key
    async get(key) {
        try {
            const response = await fetch(`${this.baseURL}/GET/${key}`);
            const data = await response.json();
            return data.GET ? JSON.parse(data.GET) : null;
        }
        catch (error) {
            return null;
        }
    }
    // Delete a key
    async del(key) {
        try {
            const response = await fetch(`${this.baseURL}/DEL/${key}`);
            const data = await response.json();
            return data.DEL === 1;
        }
        catch (error) {
            return false;
        }
    }
    async rateLimit(key, maxRequests, ttl) {
        try {
            const response = await fetch(`${this.baseURL}/INCR/${key}`);
            const data = await response.json();
            const currentCount = data.INCR || 0;
            if (ttl && currentCount === 1) {
                await fetch(`${this.baseURL}/EXPIRE/${key}/${ttl}`);
            }
            const allowed = currentCount <= maxRequests;
            return allowed;
        }
        catch (error) {
            return false;
        }
    }
}
