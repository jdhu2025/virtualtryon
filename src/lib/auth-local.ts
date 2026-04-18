/**
 * 用户认证工具 - 使用 localStorage 存储
 * 
 * 这是一个临时方案，数据存储在浏览器本地。
 * 未来配置 Supabase 后可迁移到云端。
 */

const USERS_KEY = 'ai_outfit_users';
const CURRENT_USER_KEY = 'ai_outfit_current_user';

/**
 * 用户接口
 */
export interface StoredUser {
  id: string;
  username: string;
  passwordHash: string; // 简化的哈希（实际应用中应使用服务端存储）
  createdAt: string;
}

/**
 * 获取所有用户
 */
export function getUsers(): StoredUser[] {
  if (typeof window === 'undefined') return [];
  
  const usersJson = localStorage.getItem(USERS_KEY);
  if (!usersJson) return [];
  
  try {
    return JSON.parse(usersJson);
  } catch {
    return [];
  }
}

/**
 * 保存用户列表
 */
export function saveUsers(users: StoredUser[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

/**
 * 查找用户
 */
export function findUserByUsername(username: string): StoredUser | null {
  const users = getUsers();
  return users.find(u => u.username === username) || null;
}

/**
 * 注册用户
 */
export function registerUser(username: string, password: string): { success: boolean; error?: string; user?: StoredUser } {
  // 验证用户名
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  if (!usernameRegex.test(username)) {
    return { success: false, error: '用户名需为3-20位字母、数字或下划线' };
  }
  
  // 验证密码
  if (password.length < 6 || password.length > 20) {
    return { success: false, error: '密码需为6-20位' };
  }
  
  // 检查用户名是否已存在
  if (findUserByUsername(username)) {
    return { success: false, error: '用户名已存在' };
  }
  
  // 创建新用户（使用简化的哈希）
  const newUser: StoredUser = {
    id: 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2),
    username: username,
    passwordHash: simpleHash(password), // 简化哈希（仅用于本地存储演示）
    createdAt: new Date().toISOString(),
  };
  
  // 保存用户
  const users = getUsers();
  users.push(newUser);
  saveUsers(users);
  
  return { success: true, user: newUser };
}

/**
 * 登录验证
 */
export function loginUser(username: string, password: string): { success: boolean; error?: string; user?: Omit<StoredUser, 'passwordHash'> } {
  const user = findUserByUsername(username);
  
  if (!user) {
    return { success: false, error: '用户名或密码错误' };
  }
  
  // 验证密码
  if (user.passwordHash !== simpleHash(password)) {
    return { success: false, error: '用户名或密码错误' };
  }
  
  // 保存当前用户
  const userWithoutPassword = { ...user };
  delete (userWithoutPassword as any).passwordHash;
  setCurrentUser(userWithoutPassword);
  
  return { success: true, user: userWithoutPassword };
}

/**
 * 获取当前登录用户
 */
export function getCurrentUser(): Omit<StoredUser, 'passwordHash'> | null {
  if (typeof window === 'undefined') return null;
  
  const userJson = localStorage.getItem(CURRENT_USER_KEY);
  if (!userJson) return null;
  
  try {
    return JSON.parse(userJson);
  } catch {
    return null;
  }
}

/**
 * 设置当前登录用户
 */
export function setCurrentUser(user: Omit<StoredUser, 'passwordHash'> | null): void {
  if (typeof window === 'undefined') return;
  
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

/**
 * 退出登录
 */
export function logoutUser(): void {
  setCurrentUser(null);
}

/**
 * 简化哈希函数（仅用于本地存储演示）
 * 实际应用中应在服务端使用 bcrypt
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'hash_' + Math.abs(hash).toString(36) + '_' + str.length.toString();
}

/**
 * 清除用户所有数据
 */
export function clearUserData(userId: string): void {
  // 清除用户记录
  const users = getUsers().filter(u => u.id !== userId);
  saveUsers(users);
  
  // 清除当前登录用户（如果是该用户）
  const currentUser = getCurrentUser();
  if (currentUser?.id === userId) {
    logoutUser();
  }
  
  // 清除 IndexedDB 中的用户数据
  if (typeof window !== 'undefined' && window.indexedDB) {
    // 清除衣柜数据
    const databases = ['ai_outfit_db'];
    databases.forEach(dbName => {
      const request = indexedDB.deleteDatabase(dbName);
      request.onsuccess = () => {
        console.log(`Database ${dbName} deleted`);
      };
    });
  }
}
