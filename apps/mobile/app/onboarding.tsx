import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, ChevronRight, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../store/useAppStore';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    titleMain: 'Track ',
    titleAccent: 'Your',
    titleEnd: '\nDriver Live Now',
    description:
      'Stay updated from the moment your request is accepted until your verified driver arrives right at your safe landmark.',
    imageUri:
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: '2',
    titleMain: 'Request ',
    titleAccent: 'Your',
    titleEnd: '\nRide in Seconds',
    description:
      'Ride smarter with fast pickups, verified government NIN identities, and smooth travel anywhere across Nigerian corridors.',
    imageUri:
      'https://images.unsplash.com/photo-1506015391300-4802dc74de2e?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: '3',
    titleMain: 'Your ',
    titleAccent: 'City,',
    titleEnd: '\nOne Tap Away',
    description:
      'Beat highway traffic and ₦10,000 surge fares. Berger to Lekki, Ikorodu to CMS, and Kubwa to CBD — 70% cheaper.',
    imageUri:
      'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=900&q=80',
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { theme, themeMode } = useAppStore();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (currentIndex < slides.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      router.replace('/(tabs)');
    }
  };

  const currentSlide = slides[currentIndex];

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: currentSlide.imageUri }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Dark Gradient Overlay for Typography Contrast */}
        <View style={styles.overlay} />

        <View
          style={[
            styles.contentContainer,
            {
              paddingTop: Math.max(insets.top, 20) + 20,
              paddingBottom: Math.max(insets.bottom, 20) + 20,
            },
          ]}
        >
          {/* Top Progress Indicator Bars */}
          <View style={styles.progressRow}>
            {slides.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressBar,
                  {
                    backgroundColor:
                      index <= currentIndex ? '#FFFFFF' : 'rgba(255, 255, 255, 0.2)',
                  },
                ]}
              />
            ))}
          </View>

          {/* Heading with Italicized Accent as in UI Inspiration */}
          <View style={styles.textContainer}>
            <Text style={styles.title}>
              {currentSlide.titleMain}
              <Text style={styles.titleItalic}>{currentSlide.titleAccent}</Text>
              {currentSlide.titleEnd}
            </Text>
            <Text style={styles.description}>{currentSlide.description}</Text>
          </View>

          {/* Bottom Action Pill Button (Sample Screens 1 & 2 Left) */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleNext}
            style={styles.continuePill}
          >
            <Text style={styles.continueText}>
              {currentIndex === slides.length - 1 ? 'Get Started' : 'Continue'}
            </Text>
            <View style={styles.arrowCircle}>
              <ArrowRight size={18} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E1015',
  },
  backgroundImage: {
    width,
    height,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(14, 16, 21, 0.72)',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  progressBar: {
    flex: 1,
    height: 3.5,
    borderRadius: 2,
  },
  textContainer: {
    marginTop: 'auto',
    marginBottom: 40,
  },
  title: {
    fontSize: 38,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 46,
    letterSpacing: -0.8,
  },
  titleItalic: {
    fontStyle: 'italic',
    fontWeight: '300',
    color: '#E4E4E7',
  },
  description: {
    fontSize: 15,
    color: '#9CA3AF',
    lineHeight: 22,
    marginTop: 14,
    maxWidth: 320,
  },
  continuePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    height: 60,
    borderRadius: 30,
    paddingLeft: 24,
    paddingRight: 8,
  },
  continueText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0A0B0E',
  },
  arrowCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0A0B0E',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
