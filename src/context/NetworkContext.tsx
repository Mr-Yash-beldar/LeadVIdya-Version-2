// src/context/NetworkContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
export type NetworkQuality = 'excellent' | 'good' | 'poor' | 'unknown' | 'offline';

export interface NetworkInfo {
    isConnected: boolean;
    quality: NetworkQuality;
    latency: number | null;
    connectionType: 'wifi' | 'cellular' | 'none' | 'unknown';
}

interface QueuedItem {
    key: string;
    data: any;
    timestamp: number;
    retryCount: number;
}

interface NetworkContextType {
    networkInfo: NetworkInfo;
    isOffline: boolean;
    isPoorConnection: boolean;
    checkNow: () => Promise<NetworkInfo>;
    pendingSyncCount: number;
    addToSyncQueue: (key: string, data: any) => Promise<void>;
    processSyncQueue: () => Promise<void>;
    clearQueue: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

// Network Checker Class
class NetworkChecker {
    private static instance: NetworkChecker;
    private listeners: ((info: NetworkInfo) => void)[] = [];
    private currentInfo: NetworkInfo = {
        isConnected: true,
        quality: 'unknown',
        latency: null,
        connectionType: 'unknown'
    };
    private checkInterval: ReturnType<typeof setInterval> | null = null;
    private isChecking = false;
    private abortControllers: AbortController[] = [];
    private failureCount = 0;
    private readonly FAILURE_THRESHOLD = 2;

    static getInstance(): NetworkChecker {
        if (!NetworkChecker.instance) {
            NetworkChecker.instance = new NetworkChecker();
        }
        return NetworkChecker.instance;
    }

    async checkConnectivity(): Promise<NetworkInfo> {
        this.abortControllers.forEach(controller => controller.abort());
        this.abortControllers = [];

        try {
            const endpoints = [
                'https://connect.leadvidya.in/api/health'
            ];

            const startTime = Date.now();
            let connected = false;
            let latency = null;
            let successEndpoint = '';

            const promises = endpoints.map(async (endpoint) => {
                const controller = new AbortController();
                this.abortControllers.push(controller);

                try {
                    const timeoutId = setTimeout(() => controller.abort(), 5000);

                    const response = await fetch(endpoint, {
                        method: 'GET',
                        signal: controller.signal,
                        headers: {
                            'Accept': 'application/json'
                        }
                    });

                    clearTimeout(timeoutId);

                    if (response.ok) {
                        connected = true;
                        successEndpoint = endpoint;
                        return true;
                    }
                    return false;
                } catch (e) {
                    return false;
                }
            });

            const results = await Promise.all(promises);
            connected = results.some(result => result === true);

            if (!connected) {
                this.failureCount++;
                if (this.failureCount < this.FAILURE_THRESHOLD && this.currentInfo.isConnected) {
                   return { ...this.currentInfo };
                }

                return {
                    isConnected: false,
                    quality: 'offline',
                    latency: null,
                    connectionType: 'none'
                };
            }

            this.failureCount = 0;

            if (successEndpoint) {
                try {
                    const latencyCheckStart = Date.now();
                    await fetch(successEndpoint, {
                        method: 'HEAD',
                        mode: 'no-cors'
                    });
                    latency = Date.now() - latencyCheckStart;
                } catch {
                    latency = Date.now() - startTime;
                }
            } else {
                latency = Date.now() - startTime;
            }

            let quality: NetworkQuality = 'unknown';
            if (latency) {
                if (latency < 300) quality = 'excellent';
                else if (latency < 1000) quality = 'good';
                else if (latency < 3000) quality = 'poor';
                else quality = 'unknown';
            }

            return {
                isConnected: true,
                quality,
                latency,
                connectionType: 'unknown'
            };

        } catch (error) {
            this.failureCount++;
            if (this.failureCount < this.FAILURE_THRESHOLD && this.currentInfo.isConnected) {
                return { ...this.currentInfo };
            }
            return {
                isConnected: false,
                quality: 'offline',
                latency: null,
                connectionType: 'none'
            };
        }
    }

    startMonitoring(intervalMs: number = 30000) {
        if (this.checkInterval) clearInterval(this.checkInterval);

        this.checkConnectivity().then(info => {
            this.currentInfo = info;
            this.notifyListeners(info);
        });

        this.checkInterval = setInterval(async () => {
            if (!this.isChecking) {
                this.isChecking = true;
                const info = await this.checkConnectivity();
                if (info.isConnected !== this.currentInfo.isConnected || info.quality !== this.currentInfo.quality) {
                    this.currentInfo = info;
                    this.notifyListeners(info);
                }
                this.isChecking = false;
            }
        }, intervalMs);
    }

    stopMonitoring() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        this.abortControllers.forEach(controller => controller.abort());
        this.abortControllers = [];
    }

    addListener(callback: (info: NetworkInfo) => void) {
        this.listeners.push(callback);
        callback(this.currentInfo);
    }

    removeListener(callback: (info: NetworkInfo) => void) {
        this.listeners = this.listeners.filter(cb => cb !== callback);
    }

    private notifyListeners(info: NetworkInfo) {
        this.listeners.forEach(callback => callback(info));
    }

    getCurrentInfo(): NetworkInfo {
        return this.currentInfo;
    }
}

class OfflineQueue {
    private static readonly QUEUE_KEY = '@offline_queue';
    private static readonly PENDING_KEY = '@pending_items';

    static async addToQueue(key: string, data: any): Promise<void> {
        try {
            const queue = await this.getQueue();
            queue.push({
                key,
                data,
                timestamp: Date.now(),
                retryCount: 0
            });
            await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
            await this.updatePendingCount();
        } catch (error) {
            console.error('Error adding to queue:', error);
        }
    }

    static async getQueue(): Promise<QueuedItem[]> {
        try {
            const queue = await AsyncStorage.getItem(this.QUEUE_KEY);
            return queue ? JSON.parse(queue) : [];
        } catch {
            return [];
        }
    }

    static async removeFromQueue(key: string): Promise<void> {
        try {
            const queue = await this.getQueue();
            const filtered = queue.filter(item => item.key !== key);
            await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(filtered));
            await this.updatePendingCount();
        } catch (error) {
            console.error('Error removing from queue:', error);
        }
    }

    static async updatePendingCount(): Promise<number> {
        try {
            const queue = await this.getQueue();
            const count = queue.length;
            await AsyncStorage.setItem(this.PENDING_KEY, count.toString());
            return count;
        } catch {
            return 0;
        }
    }

    static async getPendingCount(): Promise<number> {
        try {
            const count = await AsyncStorage.getItem(this.PENDING_KEY);
            return count ? parseInt(count, 10) : 0;
        } catch {
            return 0;
        }
    }

    static async clearQueue(): Promise<void> {
        try {
            await AsyncStorage.removeItem(this.QUEUE_KEY);
            await AsyncStorage.setItem(this.PENDING_KEY, '0');
        } catch (error) {
            console.error('Error clearing queue:', error);
        }
    }
}

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
        isConnected: true,
        quality: 'unknown',
        latency: null,
        connectionType: 'unknown'
    });
    const [pendingSyncCount, setPendingSyncCount] = useState(0);
    const [isProcessingSync, setIsProcessingSync] = useState(false);
    const networkChecker = NetworkChecker.getInstance();

    useEffect(() => {
        const handleNetworkChange = (info: NetworkInfo) => {
            setNetworkInfo(info);
            if (info.isConnected && info.quality !== 'poor' && !networkInfo.isConnected) {
                processSyncQueue();
            }
        };

        networkChecker.addListener(handleNetworkChange);
        networkChecker.startMonitoring(5000); // 5s for fast 'auto-close'

        loadPendingCount();

        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                networkChecker.checkConnectivity().then(info => {
                    setNetworkInfo(info);
                });
            }
        });

        return () => {
            networkChecker.removeListener(handleNetworkChange);
            networkChecker.stopMonitoring();
            subscription.remove();
        };
    }, []);

    const loadPendingCount = useCallback(async () => {
        const count = await OfflineQueue.getPendingCount();
        setPendingSyncCount(count);
    }, []);

    const addToSyncQueue = useCallback(async (key: string, data: any) => {
        await OfflineQueue.addToQueue(key, data);
        const count = await OfflineQueue.updatePendingCount();
        setPendingSyncCount(count);
    }, []);

    const processSyncQueue = useCallback(async () => {
        if (isProcessingSync || !networkInfo.isConnected || networkInfo.quality === 'poor') return;

        setIsProcessingSync(true);
        try {
            const queue = await OfflineQueue.getQueue();
            for (const item of queue) {
                try {
                    await OfflineQueue.removeFromQueue(item.key);
                } catch (error) {
                    item.retryCount++;
                    if (item.retryCount >= 5) {
                        await OfflineQueue.removeFromQueue(item.key);
                    } else {
                        await OfflineQueue.addToQueue(item.key, item.data);
                    }
                }
            }
            const newCount = await OfflineQueue.updatePendingCount();
            setPendingSyncCount(newCount);
        } finally {
            setIsProcessingSync(false);
        }
    }, [isProcessingSync, networkInfo]);

    const clearQueue = useCallback(async () => {
        await OfflineQueue.clearQueue();
        setPendingSyncCount(0);
    }, []);

    const checkNow = useCallback(async () => {
        const info = await networkChecker.checkConnectivity();
        setNetworkInfo(info);
        return info;
    }, [networkChecker]);

    const contextValue = React.useMemo(() => ({
        networkInfo,
        isOffline: !networkInfo.isConnected,
        isPoorConnection: networkInfo.quality === 'poor',
        checkNow,
        pendingSyncCount,
        addToSyncQueue,
        processSyncQueue,
        clearQueue
    }), [networkInfo, pendingSyncCount]);

    return (
        <NetworkContext.Provider value={contextValue}>
            {children}
        </NetworkContext.Provider>
    );
};

export const useNetwork = () => {
    const context = useContext(NetworkContext);
    if (!context) {
        throw new Error('useNetwork must be used within NetworkProvider');
    }
    return context;
};