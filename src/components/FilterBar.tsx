import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';
import { theme } from '../theme/theme';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed } from 'lucide-react-native';

interface FilterBarProps {
  selectedFilter: string;
  onSelectFilter: (filter: string) => void;
}

const filters = [
  { id: 'all', label: 'All', icon: Phone },
  { id: 'incoming', label: 'Incoming', icon: PhoneIncoming },
  { id: 'outgoing', label: 'Outgoing', icon: PhoneOutgoing },
  { id: 'missed', label: 'Missed', icon: PhoneMissed },
];

export const FilterBar: React.FC<FilterBarProps> = ({ selectedFilter, onSelectFilter }) => {
  const scrollRef = React.useRef<ScrollView>(null);

  React.useEffect(() => {
    const index = filters.findIndex(f => f.id === selectedFilter);
    if (index !== -1) {
      scrollRef.current?.scrollTo({ x: Math.max(0, index * 100 - 40), animated: true });
    }
  }, [selectedFilter]);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filters.map((filter) => {
          const Icon = filter.icon;
          const isSelected = selectedFilter === filter.id;
          return (
            <TouchableOpacity
              key={filter.id}
              style={[styles.filterChip, isSelected && styles.filterChipActive]}
              onPress={() => onSelectFilter(filter.id)}
              activeOpacity={0.7}
            >
              <Icon
                size={16}
                color={isSelected ? colors.primaryDark : colors.textMuted}
                style={styles.icon}
              />
              <Text style={[styles.label, isSelected && styles.labelActive]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    minWidth: 80,
  },
  filterChipActive: {
    backgroundColor: 'rgba(255,193,7,0.1)',
    borderColor: colors.primary,
  },
  icon: {
    marginRight: 6,
  },
  label: {
    ...theme.typography.button,
    fontSize: 13,
    color: colors.textMuted,
  },
  labelActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
});
