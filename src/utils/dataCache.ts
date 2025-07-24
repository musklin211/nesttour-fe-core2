import { VirtualTourData } from '@/types';

/**
 * 数据缓存管理器
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

class DataCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5分钟

  /**
   * 设置缓存项
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl
    };
    this.cache.set(key, entry);
    console.log(`Cached data for key: ${key}, TTL: ${ttl}ms`);
  }

  /**
   * 获取缓存项
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // 检查是否过期
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      console.log(`Cache expired for key: ${key}`);
      return null;
    }

    console.log(`Cache hit for key: ${key}`);
    return entry.data as T;
  }

  /**
   * 检查缓存是否存在且有效
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 删除缓存项
   */
  delete(key: string): boolean {
    const result = this.cache.delete(key);
    if (result) {
      console.log(`Deleted cache for key: ${key}`);
    }
    return result;
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
    console.log('Cleared all cache');
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    size: number;
    keys: string[];
    totalSize: number;
  } {
    const keys = Array.from(this.cache.keys());
    let totalSize = 0;

    // 估算缓存大小（简单估算）
    this.cache.forEach((entry) => {
      totalSize += JSON.stringify(entry.data).length;
    });

    return {
      size: this.cache.size,
      keys,
      totalSize
    };
  }

  /**
   * 清理过期缓存
   */
  cleanup(): number {
    const now = Date.now();
    let cleanedCount = 0;

    this.cache.forEach((entry, key) => {
      if (now > entry.expiry) {
        this.cache.delete(key);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired cache entries`);
    }

    return cleanedCount;
  }
}

// 创建全局缓存实例
export const dataCache = new DataCache();

// 定期清理过期缓存
setInterval(() => {
  dataCache.cleanup();
}, 60000); // 每分钟清理一次

/**
 * 缓存键常量
 */
export const CACHE_KEYS = {
  VIRTUAL_TOUR_DATA: 'virtual_tour_data',
  CAMERAS_XML: 'cameras_xml',
  MODEL_DATA: 'model_data',
  IMAGE_VALIDATION: 'image_validation'
} as const;

/**
 * 带缓存的数据获取函数
 */
export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // 尝试从缓存获取
  const cached = dataCache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // 缓存未命中，获取新数据
  console.log(`Cache miss for key: ${key}, fetching new data...`);
  const data = await fetcher();
  
  // 存入缓存
  dataCache.set(key, data, ttl);
  
  return data;
}

/**
 * 预加载数据到缓存
 */
export async function preloadData(): Promise<void> {
  try {
    console.log('Starting data preload...');
    
    // 这里可以预加载一些常用数据
    // 例如检查图片文件是否存在等
    
    console.log('Data preload completed');
  } catch (error) {
    console.error('Data preload failed:', error);
  }
}

/**
 * 缓存调试工具
 */
export function debugCache(): void {
  const stats = dataCache.getStats();
  console.group('Cache Debug Info');
  console.log('Cache size:', stats.size);
  console.log('Cache keys:', stats.keys);
  console.log('Estimated total size:', `${(stats.totalSize / 1024).toFixed(2)} KB`);
  
  // 显示每个缓存项的详细信息
  stats.keys.forEach(key => {
    const entry = (dataCache as any).cache.get(key);
    if (entry) {
      const age = Date.now() - entry.timestamp;
      const remaining = entry.expiry - Date.now();
      console.log(`${key}:`, {
        age: `${(age / 1000).toFixed(1)}s`,
        remaining: `${(remaining / 1000).toFixed(1)}s`,
        size: `${(JSON.stringify(entry.data).length / 1024).toFixed(2)} KB`
      });
    }
  });
  
  console.groupEnd();
}
