import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../../store/useAppStore';

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (formattedDate: string, rawDate: Date) => void;
  currentDateStr?: string;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function DatePickerModal({
  visible,
  onClose,
  onSelectDate,
  currentDateStr,
}: DatePickerModalProps) {
  const insets = useSafeAreaInsets();
  const { theme, themeMode } = useAppStore();
  const isLight = themeMode === 'light';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Month navigation state
  const [viewDate, setViewDate] = useState(() => new Date(today));
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date(today));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Grid calculation
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth();

  const handlePrevMonth = () => {
    if (isCurrentMonth) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setViewDate(new Date(year, month + 1, 1));
  };

  const formatOutputDate = (d: Date): string => {
    const comp = new Date(d);
    comp.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const dayNum = comp.getDate();
    const monStr = SHORT_MONTHS[comp.getMonth()];

    if (comp.getTime() === today.getTime()) {
      return `Today, ${dayNum} ${monStr}`;
    }
    if (comp.getTime() === tomorrow.getTime()) {
      return `Tomorrow, ${dayNum} ${monStr}`;
    }
    return `${DAY_NAMES[comp.getDay()]}, ${dayNum} ${monStr}`;
  };

  const handlePickDay = (dayNum: number) => {
    const chosen = new Date(year, month, dayNum);
    chosen.setHours(0, 0, 0, 0);

    if (chosen.getTime() < today.getTime()) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    setSelectedDate(chosen);
    const formatted = formatOutputDate(chosen);
    onSelectDate(formatted, chosen);
    onClose();
  };

  const handleQuickPick = (type: 'today' | 'tomorrow' | 'weekend') => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    const target = new Date(today);
    if (type === 'tomorrow') {
      target.setDate(today.getDate() + 1);
    } else if (type === 'weekend') {
      const day = today.getDay();
      const diffToSaturday = day === 6 ? 7 : (6 - day);
      target.setDate(today.getDate() + diffToSaturday);
    }

    setSelectedDate(target);
    setViewDate(new Date(target.getFullYear(), target.getMonth(), 1));
    const formatted = formatOutputDate(target);
    onSelectDate(formatted, target);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.calendarCard,
            {
              backgroundColor: isLight ? '#FFFFFF' : '#14171F',
              borderColor: isLight ? '#E2E8F0' : '#272F3E',
              paddingBottom: Math.max(insets.bottom, 16) + 12,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: theme.surfaceBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <CalendarIcon size={20} color="#FF7A00" />
              <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
                Select Travel Date
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Quick Filter Chips */}
          <View style={styles.quickChipsRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleQuickPick('today')}
              style={[
                styles.quickChip,
                {
                  backgroundColor: isLight ? '#F1F5F9' : '#1E2330',
                  borderColor: isLight ? '#CBD5E1' : '#334155',
                },
              ]}
            >
              <Text style={[styles.quickChipText, { color: theme.textPrimary }]}>Today</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleQuickPick('tomorrow')}
              style={[
                styles.quickChip,
                {
                  backgroundColor: isLight ? '#F1F5F9' : '#1E2330',
                  borderColor: isLight ? '#CBD5E1' : '#334155',
                },
              ]}
            >
              <Text style={[styles.quickChipText, { color: theme.textPrimary }]}>Tomorrow</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleQuickPick('weekend')}
              style={[
                styles.quickChip,
                {
                  backgroundColor: isLight ? '#F1F5F9' : '#1E2330',
                  borderColor: isLight ? '#CBD5E1' : '#334155',
                },
              ]}
            >
              <Text style={[styles.quickChipText, { color: theme.textPrimary }]}>Weekend</Text>
            </TouchableOpacity>
          </View>

          {/* Month Navigator */}
          <View style={styles.monthNavRow}>
            <TouchableOpacity
              onPress={handlePrevMonth}
              disabled={isCurrentMonth}
              style={[styles.monthNavBtn, isCurrentMonth && { opacity: 0.3 }]}
            >
              <ChevronLeft size={20} color={theme.textPrimary} />
            </TouchableOpacity>

            <Text style={[styles.monthTitleText, { color: theme.textPrimary }]}>
              {MONTH_NAMES[month]} {year}
            </Text>

            <TouchableOpacity onPress={handleNextMonth} style={styles.monthNavBtn}>
              <ChevronRight size={20} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Days of week */}
          <View style={styles.weekDaysRow}>
            {DAYS_OF_WEEK.map((d, i) => (
              <Text key={i} style={[styles.weekDayHeader, { color: theme.textMuted }]}>
                {d}
              </Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.daysGrid}>
            {/* Blank offset */}
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
              <View key={`blank-${idx}`} style={styles.dayCell} />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateObj = new Date(year, month, dayNum);
              dateObj.setHours(0, 0, 0, 0);

              const isPast = dateObj.getTime() < today.getTime();
              const isToday = dateObj.getTime() === today.getTime();
              const isChosen =
                selectedDate &&
                dateObj.getTime() ===
                  new Date(
                    selectedDate.getFullYear(),
                    selectedDate.getMonth(),
                    selectedDate.getDate()
                  ).getTime();

              return (
                <TouchableOpacity
                  key={`day-${dayNum}`}
                  disabled={isPast}
                  activeOpacity={0.7}
                  onPress={() => handlePickDay(dayNum)}
                  style={[
                    styles.dayCell,
                    isChosen && styles.chosenDayCell,
                    isToday && !isChosen && styles.todayDayCell,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayCellText,
                      { color: theme.textPrimary },
                      isPast && { color: isLight ? '#CBD5E1' : '#475569' },
                      isToday && !isChosen && { color: '#FF7A00', fontWeight: '800' },
                      isChosen && { color: '#FFFFFF', fontWeight: '800' },
                    ]}
                  >
                    {dayNum}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  calendarCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    marginBottom: 14,
  },
  quickChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitleText: {
    fontSize: 16,
    fontWeight: '800',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weekDayHeader: {
    width: 42,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    marginVertical: 2,
  },
  todayDayCell: {
    borderWidth: 1.5,
    borderColor: '#FF7A00',
  },
  chosenDayCell: {
    backgroundColor: '#FF7A00',
  },
  dayCellText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
