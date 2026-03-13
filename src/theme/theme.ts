import { colors } from './colors';

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const typography = {
    h1: {
        fontSize: 32,
        fontWeight: '800' as const,
        lineHeight: 40,
        color: colors.textPrimary,
    },
    h2: {
        fontSize: 24,
        fontWeight: '700' as const,
        lineHeight: 32,
        color: colors.textPrimary,
    },
    h3: {
        fontSize: 20,
        fontWeight: '600' as const,
        lineHeight: 28,
        color: colors.textPrimary,
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '500' as const,
        lineHeight: 24,
        color: colors.textSecondary,
    },
    body: {
        fontSize: 14,
        fontWeight: '400' as const,
        lineHeight: 20,
        color: colors.textPrimary,
    },
    caption: {
        fontSize: 12,
        fontWeight: '400' as const,
        lineHeight: 16,
        color: colors.textSecondary,
    },
    button: {
        fontSize: 15,
        fontWeight: '600' as const,
        letterSpacing: 0.5,
    }
};

export const shadows = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    md: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    lg: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
};

export const radii = {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
    full: 999,
};

export const theme = {
    colors,
    spacing,
    typography,
    shadows,
    radii,
};
