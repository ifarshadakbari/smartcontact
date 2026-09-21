import { ApiUsageStatus } from '../types';

// Rate Limiting Parameters (Default: 20 requests per 60-second window)
const RATE_LIMIT_MAX = 20;
const WINDOW_SIZE_SEC = 60;
const STORAGE_KEY_RATE_LIMIT = 'enterprise_phonebook_ratelimit_v1';

interface StoredRateLimitData {
  calls: number[];
}

let subscribers: Array<(status: ApiUsageStatus) => void> = [];

const loadStoredData = (): StoredRateLimitData => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RATE_LIMIT);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading rate limit', e);
  }
  return { calls: [] };
};

const saveStoredData = (data: StoredRateLimitData) => {
  try {
    localStorage.setItem(STORAGE_KEY_RATE_LIMIT, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving rate limit', e);
  }
};

export const calculateUsageStatus = (): ApiUsageStatus => {
  const now = Date.now();
  const cutoff = now - WINDOW_SIZE_SEC * 1000;
  const data = loadStoredData();

  // Filter out calls older than the time window
  const activeCalls = (data.calls || []).filter((ts) => ts > cutoff);
  
  if (activeCalls.length !== (data.calls || []).length) {
    data.calls = activeCalls;
    saveStoredData(data);
  }

  const totalCalls = activeCalls.length;
  const oldestCall = activeCalls[0];
  const resetTimeRemainingSec = oldestCall
    ? Math.max(1, Math.ceil((oldestCall + WINDOW_SIZE_SEC * 1000 - now) / 1000))
    : 0;

  const percentUsed = Math.min(100, Math.round((totalCalls / RATE_LIMIT_MAX) * 100));
  const remainingCalls = Math.max(0, RATE_LIMIT_MAX - totalCalls);
  const isApproachingLimit = percentUsed >= 75;
  const isRateLimited = percentUsed >= 100 || remainingCalls === 0;

  return {
    totalCalls,
    limit: RATE_LIMIT_MAX,
    remainingCalls,
    percentUsed,
    isApproachingLimit,
    isRateLimited,
    resetTimeRemainingSec,
    windowSizeSec: WINDOW_SIZE_SEC,
  };
};

export const notifySubscribers = () => {
  const status = calculateUsageStatus();
  subscribers.forEach((cb) => cb(status));
};

export const recordApiCall = (weight = 1): ApiUsageStatus => {
  const data = loadStoredData();
  const now = Date.now();
  const newCalls = [...(data.calls || [])];
  for (let i = 0; i < weight; i++) {
    newCalls.push(now);
  }
  data.calls = newCalls;
  saveStoredData(data);
  const status = calculateUsageStatus();
  notifySubscribers();
  return status;
};

export const resetQuota = () => {
  saveStoredData({ calls: [] });
  notifySubscribers();
};

export const subscribeToApiUsage = (callback: (status: ApiUsageStatus) => void) => {
  subscribers.push(callback);
  callback(calculateUsageStatus());
  return () => {
    subscribers = subscribers.filter((cb) => cb !== callback);
  };
};

// Periodic tick to update countdown and naturally expire rate limit window
setInterval(() => {
  const data = loadStoredData();
  if (data.calls && data.calls.length > 0) {
    notifySubscribers();
  }
}, 1000);
