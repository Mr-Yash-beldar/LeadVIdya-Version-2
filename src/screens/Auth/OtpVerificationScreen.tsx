import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  Alert, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  StatusBar,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { theme } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ShieldCheck, ArrowLeft, RefreshCw, Smartphone } from 'lucide-react-native';
import { GlassCard } from '../../components/GlassCard';
import { CustomButton } from '../../components/CustomButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const OtpVerificationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { verifyAndLogin } = useAuth();
  const route = useRoute();
  const { signupData } = route.params as any || {};

  const handleVerify = async () => {
    if (code.length < 4) {
      Alert.alert('Invalid Multi', 'Please enter the complete verification code.');
      return;
    }
    
    setLoading(true);
    try {
      await verifyAndLogin({ ...signupData }); 
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    } catch (e: any) {
      Alert.alert('Verification Failed', e.message || 'The code you entered is incorrect.');
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

      <SafeAreaView style={styles.flexOne}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={24} color={colors.white} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flexOne}
        >
          <View style={styles.content}>
            <View style={styles.iconContainer}>
               <View style={styles.iconRing}>
                  <ShieldCheck size={48} color={colors.primary} />
               </View>
            </View>

            <View style={styles.textContainer}>
              <Text style={styles.title}>Verify Account</Text>
              <Text style={styles.subtitle}>
                We've sent a 6-digit code to {'\n'}
                <Text style={styles.phoneHighlight}>+91 {signupData?.number || '88XXXXXX21'}</Text>
              </Text>
            </View>

            <GlassCard style={styles.otpCard}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="000000"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
              </View>

              <CustomButton 
                title="Verify & Continue" 
                onPress={handleVerify} 
                loading={loading}
                style={styles.verifyBtn}
                textStyle={styles.verifyBtnText}
              />

              <View style={styles.resendArea}>
                <Text style={styles.resendText}>Didn't receive the code?</Text>
                <TouchableOpacity style={styles.resendBtn}>
                  <RefreshCw size={14} color={colors.primary} />
                  <Text style={styles.resendBtnText}>Resend Code</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>

            <View style={styles.securityNote}>
              <Smartphone size={16} color="rgba(255,255,255,0.3)" />
              <Text style={styles.securityText}>Secure verification via Enterprise OTP</Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
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
    bottom: -150,
    left: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconRing: {
    padding: 24,
    borderRadius: 40,
    backgroundColor: 'rgba(255,193,7,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,193,7,0.2)',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    ...theme.typography.h1,
    fontSize: 28,
    color: colors.white,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  phoneHighlight: {
    color: colors.primary,
    fontWeight: '700',
  },
  otpCard: {
    width: '100%',
    padding: 24,
    borderRadius: 32,
  },
  inputWrapper: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 24,
    overflow: 'hidden',
  },
  input: {
    paddingVertical: 24,
    fontSize: 42,
    letterSpacing: 12,
    color: colors.white,
    textAlign: 'center',
    fontWeight: '800',
  },
  verifyBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 18,
    ...theme.shadows.lg,
  },
  verifyBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  resendArea: {
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  resendText: {
    ...theme.typography.caption,
    color: 'rgba(255,255,255,0.4)',
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resendBtnText: {
    ...theme.typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
    gap: 8,
  },
  securityText: {
    ...theme.typography.caption,
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 0.5,
  },
});
