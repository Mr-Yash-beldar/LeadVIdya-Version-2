import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { theme } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Mail, Lock, LogIn, Sparkles } from 'lucide-react-native';
import { GlassCard } from '../../components/GlassCard';
import { CustomButton } from '../../components/CustomButton';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Info', 'Please provide both email and password to continue.');
      return;
    }

    setLoading(true);
    try {
      await login({ email, password });
    } catch (e: any) {
      let title = 'Authentication Error';
      if (e.message.includes('Access Denied')) title = 'Access Denied';
      if (e.message.includes('credentials')) title = 'Invalid Credentials';
      Alert.alert(title, e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Dynamic Background Elements */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flexOne}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerArea}>
            <View style={styles.logoContainer}>
              <View style={styles.logoRing}>
                <Image
                  source={require('../../assets/logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
            </View>
            <View style={styles.titleContainer}>
              <Text style={styles.welcomeText}>Welcome to</Text>
              <Text style={styles.brandText}>LeadVidya</Text>
              <View style={styles.titleUnderline} />
            </View>
          </View>

          <GlassCard style={styles.loginCard}>
            <View style={styles.cardHeader}>

              <Text style={styles.cardTitle}><Sparkles size={15} color={colors.primary} /> Sign In to Continue <Sparkles size={15} color={colors.primary} /></Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Mail size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="name@company.com"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Your secure password"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={colors.textMuted} />
                  ) : (
                    <Eye size={20} color={colors.textMuted} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* <TouchableOpacity style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity> */}

            <CustomButton
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              style={styles.submitBtn}
              textStyle={styles.submitBtnText}
            />

            {/* <View style={styles.footerRow}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity>
                <Text style={styles.signupText}>Contact Admin</Text>
              </TouchableOpacity>
            </View> */}
          </GlassCard>

          <View style={styles.bottomNote}>
            <Text style={styles.versionText}>v2.5.0 • Team LeadVidya</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Deep Navy SaaS background
  },
  flexOne: {
    flex: 1,
  },
  bgCircle1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
  },
  bgCircle2: {
    position: 'absolute',
    bottom: -50,
    left: -100,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 60,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoRing: {
    padding: 12,
    borderRadius: 30,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(255,193,7,0.2)',
  },
  logo: {
    width: 120,
    height: 60,
  },
  titleContainer: {
    alignItems: 'center',
  },
  welcomeText: {
    ...theme.typography.caption,
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  brandText: {
    ...theme.typography.h1,
    fontSize: 36,
    color: colors.white,
    marginTop: 4,
  },
  titleUnderline: {
    width: 40,
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
    marginTop: 8,
  },
  loginCard: {
    padding: 24,
    borderRadius: 32,
  },
  cardHeader: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
  },
  cardTitle: {
    ...theme.typography.h3,
    fontSize: 20,
    fontWeight: '700',
    color: colors.primaryDark,

  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    ...theme.typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    marginBottom: 10,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    // fontSize: 15,
    // color: colors.white,
    ...theme.typography.body,
  },
  eyeIcon: {
    padding: 8,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 32,
  },
  forgotText: {
    ...theme.typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 18,
    ...theme.shadows.lg,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    ...theme.typography.caption,
    color: 'rgba(255,255,255,0.5)',
  },
  signupText: {
    ...theme.typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  bottomNote: {
    alignItems: 'center',
    marginTop: 40,
  },
  versionText: {
    ...theme.typography.caption,
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1,
  },
});
