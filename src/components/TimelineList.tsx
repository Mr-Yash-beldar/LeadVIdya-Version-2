import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { colors } from '../theme/colors';
import { theme } from '../theme/theme';
import { Lead } from '../types/Lead';
import { 
  PhoneCall, 
  MessageSquare, 
  UserPlus, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  User,
  Activity as ActivityIcon
} from 'lucide-react-native';
import { GlassCard } from './GlassCard';

interface TimelineListProps {
  lead: Lead;
  timelineLogs: any[];
  timelineLoading: boolean;
  expandedLogIndex: number | null;
  setExpandedLogIndex: (index: number | null) => void;
}

export const TimelineList: React.FC<TimelineListProps> = ({
  lead,
  timelineLogs,
  timelineLoading,
  expandedLogIndex,
  setExpandedLogIndex,
}) => {
  const createdDate = new Date(lead.created || (lead as any).createdAt || Date.now());
  const createdSource = lead.leadSource || 'System';

  const allEvts: any[] = [
    ...timelineLogs,
    { kind: 'CREATED', date: createdDate.toISOString(), timestamp: createdDate.getTime(), source: createdSource },
  ];

  const dateBadge = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  let lastBadge = '';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ActivityIcon size={18} color={colors.primary} />
        <Text style={styles.headerTitle}>Recent Activities</Text>
      </View>

      {timelineLoading && (
        <View style={styles.loadingContainer}>
           <Text style={styles.loadingText}>Loading activity history...</Text>
        </View>
      )}

      {allEvts.map((evt, i) => {
        const evtDate = new Date(evt.date || evt.timestamp);
        const badge = dateBadge(evtDate);
        const showBadge = badge !== lastBadge;
        lastBadge = badge;
        const isLast = i === allEvts.length - 1;

        return (
          <View key={`${evt.kind}-${i}`} style={styles.row}>
            <View style={styles.leftCol}>
              {showBadge && (
                <View style={styles.dateBadge}>
                  <Text style={styles.dateText}>{badge}</Text>
                </View>
              )}
            </View>

            <View style={styles.spineCol}>
               <View style={[styles.spineLine, isLast && { height: 30 }]} />
               <View style={[styles.dot, { backgroundColor: getKindColor(evt.kind, evt.isMissed) }]}>
                 {getKindIcon(evt.kind, 14, 'white')}
               </View>
            </View>

            <View style={styles.rightCol}>
               <TouchableOpacity 
                 activeOpacity={0.8} 
                 onPress={() => (evt.kind === 'CALL' || evt.kind === 'NOTE') ? setExpandedLogIndex(expandedLogIndex === i ? null : i) : null}
               >
                 <GlassCard style={[styles.eventCard, expandedLogIndex === i && styles.eventCardExpanded]}>
                    <View style={styles.cardHeader}>
                       <View style={styles.titleArea}>
                          <Text style={styles.eventTitle}>{getKindLabel(evt)}</Text>
                          <View style={styles.timeRow}>
                             <Clock size={10} color={colors.textMuted} />
                             <Text style={styles.timeText}>{evtDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                          </View>
                       </View>
                       {(evt.kind === 'CALL' || (evt.kind === 'NOTE' && evt.desc?.length > 80)) && (
                          expandedLogIndex === i ? <ChevronUp size={16} color={colors.textMuted} /> : <ChevronDown size={16} color={colors.textMuted} />
                       )}
                    </View>
 
                    {evt.kind === 'CALL' && expandedLogIndex === i && (
                      <View style={styles.expandedContent}>
                         <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Duration</Text>
                            <Text style={styles.detailValue}>{evt.durStr || '0:00'}</Text>
                         </View>
                         {evt.addedBy && (
                           <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>Handled By</Text>
                              <Text style={styles.detailValue}>{evt.addedBy}</Text>
                           </View>
                         )}
                      </View>
                    )}
 
                    {evt.kind === 'NOTE' && (
                       <View style={styles.noteContent}>
                          <Text style={styles.noteText} numberOfLines={expandedLogIndex === i ? undefined : 3}>{evt.desc}</Text>
                          {evt.desc?.length > 80 && (
                             <Text style={styles.readMoreText}>
                                {expandedLogIndex === i ? 'Show Less' : 'Read More...'}
                             </Text>
                          )}
                          <View style={styles.noteFooter}>
                             <View style={styles.statusChip}>
                                <Text style={styles.statusChipText}>{evt.leadStatus}</Text>
                             </View>
                             {evt.addedBy && <Text style={styles.addedByText}>By {evt.addedBy}</Text>}
                          </View>
                       </View>
                    )}
                 </GlassCard>
               </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
};

// -- Helpers --
const getKindColor = (kind: string, isMissed?: boolean) => {
  switch (kind) {
    case 'CALL': return isMissed ? colors.error : colors.success;
    case 'NOTE': return colors.warning;
    case 'CREATED': return colors.accent;
    default: return colors.divider;
  }
};

const getKindIcon = (kind: string, size: number, color: string) => {
  switch (kind) {
    case 'CALL': return <PhoneCall size={size} color={color} />;
    case 'NOTE': return <MessageSquare size={size} color={color} />;
    case 'CREATED': return <UserPlus size={size} color={color} />;
    default: return null;
  }
};

const getKindLabel = (evt: any) => {
  if (evt.kind === 'CREATED') return `Lead Created via ${evt.source || 'Direct'}`;
  if (evt.kind === 'CALL') return `${evt.label || 'Outgoing Call'}`;
  if (evt.kind === 'NOTE') return 'Remark Added';
  return 'Unknown Activity';
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  headerTitle: {
    ...theme.typography.h3,
    fontSize: 18,
    color: colors.textPrimary,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    ...theme.typography.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
    minHeight: 80,
  },
  leftCol: {
    width: 80,
    paddingTop: 8,
  },
  dateBadge: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  dateText: {
    ...theme.typography.caption,
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  spineCol: {
    width: 32,
    alignItems: 'center',
    position: 'relative',
  },
  spineLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: colors.divider,
    opacity: 0.5,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    marginTop: 4,
    ...theme.shadows.sm,
  },
  rightCol: {
    flex: 1,
    paddingLeft: 8,
    paddingBottom: 20,
  },
  eventCard: {
    padding: theme.spacing.md,
  },
  eventCardExpanded: {
    borderColor: colors.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleArea: {
    flex: 1,
    gap: 4,
  },
  eventTitle: {
    ...theme.typography.h3,
    fontSize: 14,
    color: colors.textPrimary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    ...theme.typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)',
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    ...theme.typography.caption,
    color: colors.textMuted,
  },
  detailValue: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  noteContent: {
    marginTop: 8,
    gap: 10,
  },
  noteText: {
    ...theme.typography.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 8,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusChip: {
    backgroundColor: 'rgba(255,193,7,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusChipText: {
    ...theme.typography.caption,
    fontSize: 10,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  addedByText: {
    ...theme.typography.caption,
    fontSize: 10,
    fontStyle: 'italic',
    color: colors.textMuted,
  },
  readMoreText: {
    ...theme.typography.caption,
    color: colors.primary,
    fontWeight: '800',
    marginTop: 4,
    fontSize: 11,
  },
});
