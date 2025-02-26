// API密钥存储和获取

// 本地存储键名
const TIANAPI_KEY_STORAGE = 'tianapi_key';
const SILICONFLOW_KEY_STORAGE = 'siliconflow_key';

// 默认API密钥（如果用户未设置）
const DEFAULT_TIANAPI_KEY = '';
const DEFAULT_SILICONFLOW_KEY = '';

// 天行API密钥
export function setTianapiKey(key: string): void {
  localStorage.setItem(TIANAPI_KEY_STORAGE, key);
}

export function getTianapiKey(): string {
  return localStorage.getItem(TIANAPI_KEY_STORAGE) || DEFAULT_TIANAPI_KEY;
}

// 硅基流动API密钥
export function setSiliconflowKey(key: string): void {
  localStorage.setItem(SILICONFLOW_KEY_STORAGE, key);
}

export function getSiliconflowKey(): string {
  return localStorage.getItem(SILICONFLOW_KEY_STORAGE) || DEFAULT_SILICONFLOW_KEY;
}