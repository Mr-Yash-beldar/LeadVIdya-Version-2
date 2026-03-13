import { 
    View, 
    StyleSheet, 
    ViewStyle, 
    Platform,
    StyleProp
} from 'react-native';
import { theme } from '../theme/theme';
import { colors } from '../theme/colors';

interface GlassCardProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    elevation?: 'none' | 'sm' | 'md' | 'lg';
    border?: boolean;
}

export const GlassCard = ({
    children,
    style,
    elevation = 'md',
    border = true,
}: GlassCardProps) => {
    return (
        <View 
            style={[
                styles.card,
                elevation !== 'none' && theme.shadows[elevation],
                border && styles.border,
                style
            ]}
        >
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderRadius: theme.radii.xl,
        padding: theme.spacing.md,
        // Optional: Glassmorphism effect if needed, but clean solid is usually better for SaaS professional looks
        // For actual glass, we'd need BlurView but that adds dependencies. 
        // We'll stick to clean, high-end elevated cards.
    },
    border: {
        borderWidth: 1,
        borderColor: colors.divider,
    }
});
