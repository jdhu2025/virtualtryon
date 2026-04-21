// IndexedDB 存储工具 - 用于存储大量图片数据

const DB_NAME = 'ai_outfit_db';
const DB_VERSION = 2; // 版本号增加，触发升级
const STORE_NAME = 'clothes';
const PROFILE_STORE = 'profile';

type IndexedDbRecord = {
  id: string;
  [key: string]: unknown;
};

let db: IDBDatabase | null = null;
let initPromise: Promise<IDBDatabase> | null = null;

// 检查是否在浏览器环境
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

// 初始化数据库
export async function initDB(): Promise<IDBDatabase> {
  if (!isBrowser()) {
    throw new Error("IndexedDB 仅在浏览器环境中可用");
  }
  
  if (db) {
    return db;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = new Promise<IDBDatabase>((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error("无法打开数据库"));
      };

      request.onsuccess = () => {
        db = request.result;
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const database = (event.target as IDBOpenDBRequest).result;
        
        // 删除旧的 store（如果存在且需要重建）
        if (database.objectStoreNames.contains(STORE_NAME)) {
          database.deleteObjectStore(STORE_NAME);
        }
        
        // 创建衣服存储
        const objectStore = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        objectStore.createIndex('user_id', 'user_id', { unique: false });
        objectStore.createIndex('category', 'category', { unique: false });
        objectStore.createIndex('created_at', 'created_at', { unique: false });

        // 删除旧的 profile store（如果存在）
        if (database.objectStoreNames.contains(PROFILE_STORE)) {
          database.deleteObjectStore(PROFILE_STORE);
        }
        
        // 创建用户资料存储
        database.createObjectStore(PROFILE_STORE, { keyPath: 'id' });
      };
    } catch (error) {
      reject(error);
    }
  });

  return initPromise;
}

// 保存衣服到 IndexedDB
export async function saveCloth(cloth: IndexedDbRecord): Promise<void> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.add(cloth);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error("保存失败"));
  });
}

// 获取所有衣服
export async function getAllClothes(): Promise<IndexedDbRecord[]> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(new Error("获取失败"));
  });
}

// 删除衣服
export async function deleteCloth(id: string): Promise<void> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error("删除失败"));
  });
}

// 保存用户资料
export async function saveProfile(profile: IndexedDbRecord): Promise<void> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([PROFILE_STORE], 'readwrite');
    const objectStore = transaction.objectStore(PROFILE_STORE);
    const request = objectStore.put(profile);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error("保存失败"));
  });
}

// 获取用户资料
export async function getProfile(id: string): Promise<IndexedDbRecord | null> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([PROFILE_STORE], 'readonly');
    const objectStore = transaction.objectStore(PROFILE_STORE);
    const request = objectStore.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(new Error("获取失败"));
  });
}

// 获取所有用户资料（支持多人像）
export async function getAllProfiles(): Promise<IndexedDbRecord[]> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([PROFILE_STORE], 'readonly');
    const objectStore = transaction.objectStore(PROFILE_STORE);
    const request = objectStore.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(new Error("获取失败"));
  });
}

// 删除用户资料
export async function deleteProfile(id: string): Promise<void> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([PROFILE_STORE], 'readwrite');
    const objectStore = transaction.objectStore(PROFILE_STORE);
    const request = objectStore.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error("删除失败"));
  });
}

// 获取数据库大小估算
export async function getStorageEstimate(): Promise<{ usage: number; quota: number }> {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
    };
  }
  return { usage: 0, quota: 0 };
}

// 清除所有数据
export async function clearAllData(): Promise<void> {
  if (!isBrowser()) {
    throw new Error("IndexedDB 仅在浏览器环境中可用");
  }
  
  // 先关闭现有连接
  if (db) {
    try {
      db.close();
    } catch (e) {
      console.warn("关闭数据库连接失败:", e);
    }
    db = null;
    initPromise = null;
  }
  
  // 删除整个数据库
  return new Promise<void>((resolve, reject) => {
    let timeout: NodeJS.Timeout | null = null;
    
    const request = indexedDB.deleteDatabase(DB_NAME);
    
    request.onsuccess = () => {
      console.log("数据库删除成功");
      if (timeout) clearTimeout(timeout);
      // 重置全局变量
      db = null;
      initPromise = null;
      resolve();
    };
    
    request.onerror = (event) => {
      console.error("删除数据库失败", event);
      if (timeout) clearTimeout(timeout);
      reject(new Error("删除数据库失败"));
    };
    
    request.onblocked = () => {
      console.warn("数据库被阻塞，请关闭其他标签页后重试");
      // 即使被阻塞也尝试完成
      if (timeout) clearTimeout(timeout);
      setTimeout(() => {
        db = null;
        initPromise = null;
        resolve();
      }, 500);
    };
    
    // 设置超时，防止无限等待
    timeout = setTimeout(() => {
      console.log("删除超时，强制完成");
      db = null;
      initPromise = null;
      resolve();
    }, 3000);
  });
}

/**
 * 清除 IndexedDB 中的所有数据
 * 用于修复数据格式问题或重置应用
 */
export async function clearAllStorage(): Promise<void> {
  console.log("开始清除 IndexedDB 数据...");
  
  // 初始化数据库以确保连接
  const database = await initDB();
  
  return new Promise((resolve) => {
    // 清除 clothes store
    const clothesTransaction = database.transaction([STORE_NAME], 'readwrite');
    const clothesStore = clothesTransaction.objectStore(STORE_NAME);
    clothesStore.clear();
    
    // 清除 profile store
    const profileTransaction = database.transaction([PROFILE_STORE], 'readwrite');
    const profileStore = profileTransaction.objectStore(PROFILE_STORE);
    profileStore.clear();
    
    // 等待所有事务完成
    let completed = 0;
    const total = 2;
    
    const checkComplete = () => {
      completed++;
      if (completed >= total) {
        console.log("IndexedDB 数据已清除");
        resolve();
      }
    };
    
    clothesTransaction.oncomplete = checkComplete;
    profileTransaction.oncomplete = checkComplete;
    
    clothesTransaction.onerror = () => {
      console.error("清除 clothes store 失败");
      checkComplete();
    };
    
    profileTransaction.onerror = () => {
      console.error("清除 profile store 失败");
      checkComplete();
    };
  });
}
