import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CallLogService } from '../services/CallLogService';
import { CallLog, CallType } from '../types/CallLog';
import { LeadsService } from '../services/LeadsService';
import { api } from '../services/api';

const POSTED_CALLS_KEY = 'posted_calls';
const LATEST_CALL_TS_KEY = 'latest_call_timestamp';
const CHECK_PHONE_CACHE_KEY = 'check_phone_cache';
const CHECK_PHONE_TTL = 30 * 60 * 1000;

/** Maps a native CallType to the backend API payload fields */
const callPayloadFromLog = (log: CallLog) => {
    switch (log.type) {
        case CallType.Incoming:
            return { callStatus: 'completed', callType: 'incoming' };
        case CallType.Outgoing:
            return { callStatus: 'completed', callType: 'outgoing' };
        case CallType.Missed:
            return { callStatus: 'missed', callType: 'missed' };
        default:
            return { callStatus: 'completed', callType: 'outgoing' };
    }
};

/** Fire-and-forget: post a matched call to the DB, once per unique log ID */
export const autoPostMatchedCall = async (log: CallLog, leadId: string) => {
    try {
        const raw = await AsyncStorage.getItem(POSTED_CALLS_KEY);
        const postedSet: string[] = raw ? JSON.parse(raw) : [];
        if (postedSet.includes(log.id)) {
            return;
        }
        console.log('[AutoPost] Posting call to DB:', leadId, log.id);
        const { callStatus, callType } = callPayloadFromLog(log);
        await LeadsService.postCallLog({
            leadId,
            callTime: new Date(log.timestamp).toISOString(),
            durationSeconds: log.duration,
            callStatus,
            callType,
            notes: 'auto Recored Call',
        });
        postedSet.push(log.id);
        await AsyncStorage.setItem(POSTED_CALLS_KEY, JSON.stringify(postedSet));
    } catch (e) {
        console.warn('[AutoPost] Auto-post failed:', e);
    }
};

export const useAutoPost = (leadsRef: React.MutableRefObject<any[]>) => {
    const checkAndPostNewCalls = useCallback(async () => {
        try {
            const rawTs = await AsyncStorage.getItem(LATEST_CALL_TS_KEY);
            const lastProcessedTs: number = rawTs ? parseInt(rawTs, 10) : 0;

            const todayLogs: CallLog[] = await CallLogService.getCallLogsByDay(0);
            if (!todayLogs.length) return;

            const sorted = [...todayLogs].sort((a, b) => b.timestamp - a.timestamp);
            const newestTs = sorted[0].timestamp;

            const newLogs = sorted.filter(log => log.timestamp > lastProcessedTs);

            if (newLogs.length > 0) {
                console.log(`[AutoPost] ${newLogs.length} new call(s) to process`);

                const rawPosted = await AsyncStorage.getItem(POSTED_CALLS_KEY);
                const postedSet: string[] = rawPosted ? JSON.parse(rawPosted) : [];

                const currentLeads = leadsRef.current || [];
                const leadMap = new Map<string, string>(); // last10 -> leadId
                currentLeads.forEach(lead => {
                    [lead.phone, lead.mobile, lead.alt_phone, (lead as any).number].filter(Boolean).forEach(p => {
                        const digits = p!.replace(/[^0-9]/g, '');
                        if (digits.length >= 10) leadMap.set(digits.slice(-10), lead._id || lead.id);
                    });
                });

                type Match = { log: CallLog; leadId: string };
                const localMatches: Match[] = [];
                const apiNeeded: CallLog[] = [];

                for (const log of newLogs) {
                    if (!log.phoneNumber || postedSet.includes(log.id)) continue;

                    const inputDigits = log.phoneNumber.replace(/[^0-9]/g, '');
                    const inputLast10 = inputDigits.slice(-10);
                    if (inputLast10.length < 10) continue;

                    const leadId = leadMap.get(inputLast10);

                    if (leadId) {
                        localMatches.push({ log, leadId });
                    } else {
                        apiNeeded.push(log);
                    }
                }

                for (let i = 0; i < localMatches.length; i++) {
                    const { log, leadId } = localMatches[i];
                    await autoPostMatchedCall(log, leadId);
                    if (i > 0 && i % 5 === 0) await new Promise(r => setTimeout(() => r(undefined), 800));
                }

                const MAX_API_CALLS_PER_CYCLE = 15;
                const toCheck = apiNeeded.slice(0, MAX_API_CALLS_PER_CYCLE);
                const CHUNK_SIZE = 5;
                const CHUNK_DELAY_MS = 1500; // Increased delay to avoid Rate Limit (429)

                for (let i = 0; i < toCheck.length; i += CHUNK_SIZE) {
                    const chunk = toCheck.slice(i, i + CHUNK_SIZE);

                    for (const log of chunk) {
                        let leadId: string | null = null;
                        try {
                            const cleanedPhone = log.phoneNumber.replace(/[^0-9+]/g, '');
                            let fromCache = false;
                            const rawCache = await AsyncStorage.getItem(CHECK_PHONE_CACHE_KEY);

                            if (rawCache) {
                                const cacheMap: Record<string, { result: any; expiresAt: number }> = JSON.parse(rawCache);
                                const entry = cacheMap[cleanedPhone];
                                if (entry && entry.expiresAt > Date.now()) {
                                    fromCache = true;
                                    if (entry.result?.found && entry.result?.leadId) {
                                        leadId = entry.result.leadId;
                                    }
                                }
                            }

                            if (!fromCache) {
                                const lead = await api.checkPhone(cleanedPhone);
                                if (lead && (lead._id || lead.id)) {
                                    leadId = lead._id || lead.id;
                                }
                            }
                        } catch (e) {
                            console.warn(`[AutoPost] API check failed for ${log.phoneNumber}`, e);
                        }

                        if (leadId) {
                            await autoPostMatchedCall(log, leadId);
                        }
                    }

                    if (i + CHUNK_SIZE < toCheck.length) {
                        await new Promise(res => setTimeout(() => res(undefined), CHUNK_DELAY_MS));
                    }
                }

                if (apiNeeded.length <= MAX_API_CALLS_PER_CYCLE) {
                    await AsyncStorage.setItem(LATEST_CALL_TS_KEY, String(newestTs));
                }
            } else {
                if (newestTs > lastProcessedTs) {
                    await AsyncStorage.setItem(LATEST_CALL_TS_KEY, String(newestTs));
                }
            }
        } catch (e) {
            console.warn('[AutoPost] Task failed:', e);
        }
    }, [leadsRef]);

    return { checkAndPostNewCalls };
};
