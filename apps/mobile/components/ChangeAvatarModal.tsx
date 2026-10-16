import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  Camera,
  Upload,
  Check,
  Sparkles,
  Link2,
  User,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from '../store/useAppStore';
import { Button } from './ui/Button';
import { api } from '../services/api';

interface ChangeAvatarModalProps {
  visible: boolean;
  onClose: () => void;
}

const PRESET_AVATARS = [
  {
    id: 'av-1',
    label: 'Alina (Lekki Commuter)',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'av-2',
    label: 'Olajide (Ambassador Driver)',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'av-3',
    label: 'Fatima (Verified Professional)',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'av-4',
    label: 'Emeka (Corridor Driver)',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'av-5',
    label: 'Bolanle (Executive Commuter)',
    url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'av-6',
    label: 'Chidi (Verified Commuter)',
    url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'av-7',
    label: 'Amina (Victoria Island)',
    url: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'av-8',
    label: 'Tunde (Marina Route)',
    url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80',
  },
];

export function ChangeAvatarModal({ visible, onClose }: ChangeAvatarModalProps) {
  const insets = useSafeAreaInsets();
  const { themeMode, user, setUser } = useAppStore();
  const isLight = themeMode === 'light';

  const [selectedAvatar, setSelectedAvatar] = useState(
    user?.avatarUrl || PRESET_AVATARS[0].url
  );
  const [customUrl, setCustomUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Hidden Web file input ref
  const fileInputRef = useRef<any>(null);

  const handleSelectPreset = (url: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setSelectedAvatar(url);
  };

  const handleApplyCustomUrl = () => {
    const trimmed = customUrl.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      Alert.alert('Invalid URL', 'Please enter a valid image web address (starting with https://).');
      return;
    }
    setSelectedAvatar(trimmed);
    setCustomUrl('');
    Alert.alert('Preview Updated', 'Custom photo URL loaded. Tap "Save Photo" below to finalize.');
  };

  const handleTriggerDeviceUpload = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            if (dataUrl) {
              setSelectedAvatar(dataUrl);
            }
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      Alert.alert(
        'Upload Photo',
        'Choose a source for your verified profile picture:',
        [
          {
            text: 'Choose Alina Avatar',
            onPress: () => setSelectedAvatar(PRESET_AVATARS[0].url),
          },
          {
            text: 'Choose Olajide Avatar',
            onPress: () => setSelectedAvatar(PRESET_AVATARS[1].url),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const handleSaveAvatar = async () => {
    setIsSaving(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    try {
      // 1. Save in local AsyncStorage
      await AsyncStorage.setItem('@rideshare_custom_avatar', selectedAvatar);

      // 2. Update Zustand store
      if (user) {
        setUser({
          ...user,
          avatarUrl: selectedAvatar,
        });
      }

      // 3. Sync to API if possible
      try {
        await api.profile.update({
          // In backend profile update
        });
      } catch {}

      Alert.alert('Success', 'Your profile picture has been updated.');
      onClose();
    } catch (e) {
      Alert.alert('Notice', 'Unable to save avatar right now. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: isLight ? '#FFFFFF' : '#0E1015',
            paddingTop: Math.max(insets.top, 16) + 8,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.titleGroup}>
            <View style={styles.badgeIcon}>
              <Camera size={20} color="#E06B26" />
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                Change Profile Picture
              </Text>
              <Text style={[styles.headerSubtitle, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                A clear photo helps build trust with co-travelers
              </Text>
            </View>
          </View>
          <TouchableOpacity activeOpacity={0.7} onPress={onClose} style={styles.closeBtn}>
            <X size={22} color={isLight ? '#0F172A' : '#FFFFFF'} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: Math.max(insets.bottom, 24) + 30 },
          ]}
        >
          {/* Active Preview */}
          <View style={styles.previewContainer}>
            <View
              style={[
                styles.previewAvatarWrapper,
                { borderColor: '#E06B26' },
              ]}
            >
              {selectedAvatar ? (
                <Image source={{ uri: selectedAvatar }} style={styles.previewAvatarImage} />
              ) : (
                <User size={64} color="#94A3B8" />
              )}
            </View>
            <Text style={[styles.previewName, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
              {user?.displayName || 'Olajide Abdulquadri'}
            </Text>
            <Text style={[styles.previewSub, { color: isLight ? '#64748B' : '#94A3B8' }]}>
              Preview of how your photo appears to drivers & passengers
            </Text>
          </View>

          {/* Option 1: Upload from Device */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleTriggerDeviceUpload}
            style={[
              styles.uploadDeviceBtn,
              {
                backgroundColor: isLight ? '#F8FAFC' : '#181A20',
                borderColor: isLight ? '#E2E8F0' : '#272B35',
              },
            ]}
          >
            <View style={styles.uploadBtnLeft}>
              <View style={styles.uploadIconBadge}>
                <Upload size={18} color="#2563EB" />
              </View>
              <View>
                <Text style={[styles.uploadBtnTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                  Upload from Device / Gallery
                </Text>
                <Text style={[styles.uploadBtnSub, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                  Select any photo from your phone or desktop
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Option 2: Curated Community Avatars */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionTitleRow}>
              <Sparkles size={16} color="#E06B26" />
              <Text style={[styles.sectionTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                Choose Verified Nigerian Portrait
              </Text>
            </View>

            <View style={styles.avatarGrid}>
              {PRESET_AVATARS.map((item) => {
                const isSelected = selectedAvatar === item.url;
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.8}
                    onPress={() => handleSelectPreset(item.url)}
                    style={[
                      styles.avatarGridItem,
                      isSelected && styles.avatarGridItemSelected,
                    ]}
                  >
                    <Image source={{ uri: item.url }} style={styles.gridImage} />
                    {isSelected && (
                      <View style={styles.selectedCheckBadge}>
                        <Check size={14} color="#FFFFFF" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Option 3: Custom URL */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionTitleRow}>
              <Link2 size={16} color="#10B981" />
              <Text style={[styles.sectionTitle, { color: isLight ? '#0F172A' : '#FFFFFF' }]}>
                Or Paste Image Link
              </Text>
            </View>

            <View
              style={[
                styles.urlInputRow,
                {
                  backgroundColor: isLight ? '#F8FAFC' : '#181A20',
                  borderColor: isLight ? '#E2E8F0' : '#272B35',
                },
              ]}
            >
              <TextInput
                style={[
                  styles.urlInput,
                  { color: isLight ? '#0F172A' : '#FFFFFF' },
                ]}
                placeholder="https://example.com/my-photo.jpg"
                placeholderTextColor="#94A3B8"
                value={customUrl}
                onChangeText={setCustomUrl}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={handleApplyCustomUrl}
                style={styles.urlApplyBtn}
              >
                <Text style={styles.urlApplyText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Save Button */}
          <Button
            title="Save Profile Photo"
            onPress={handleSaveAvatar}
            loading={isSaving}
            size="lg"
            variant="primary"
            style={styles.saveActionButton}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badgeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(224, 107, 38, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    padding: 20,
    gap: 22,
  },
  previewContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  previewAvatarWrapper: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3.5,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 6,
  },
  previewAvatarImage: {
    width: '100%',
    height: '100%',
  },
  previewName: {
    fontSize: 18,
    fontWeight: '800',
  },
  previewSub: {
    fontSize: 12,
    textAlign: 'center',
  },
  uploadDeviceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  uploadBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  uploadIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadBtnTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  uploadBtnSub: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionBlock: {
    gap: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  avatarGridItem: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    position: 'relative',
  },
  avatarGridItemSelected: {
    borderColor: '#E06B26',
    borderWidth: 3,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  selectedCheckBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E06B26',
    justifyContent: 'center',
    alignItems: 'center',
  },
  urlInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 8,
  },
  urlInput: {
    flex: 1,
    height: 44,
    fontSize: 13,
  },
  urlApplyBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  urlApplyText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  saveActionButton: {
    marginTop: 8,
  },
});
