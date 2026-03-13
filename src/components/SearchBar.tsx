import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Search } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { theme } from '../theme/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ value, onChangeText }) => {
  return (
    <View style={styles.container}>
      <Search size={18} color={colors.textSecondary} style={styles.icon} />
      <TextInput 
        style={styles.input} 
        placeholder="Search calls or contacts..." 
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: theme.spacing.md,
    height: 48,
  },
  icon: {
    marginRight: theme.spacing.sm,
  },
  input: {
    ...theme.typography.body,
    flex: 1,
    color: colors.textPrimary,
    height: '100%',
  },
});
