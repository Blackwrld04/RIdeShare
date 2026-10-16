import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import type { ChatMessage, Booking } from '../types';

export interface ChatConversation {
  bookingId: string;
  driverName: string;
  driverAvatar: string;
  driverPhone: string;
  driverRating: number;
  vehicleModel: string;
  vehiclePlate: string;
  route: string;
  pickupLandmark: string;
  departureCode: string;
  unreadCount: number;
  lastMessage: string;
  time: string;
  updatedAt: number;
  messages: ChatMessage[];
}

const STORAGE_KEY = '@rideshare_chat_threads_v3';

// 4 Distinct Corridor Threads with specific drivers, routes, landmarks, vehicles, and message histories
const SEED_CONVERSATIONS: ChatConversation[] = [
  {
    bookingId: 'book-901',
    driverName: 'Olajide Abdulquadri',
    driverAvatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    driverPhone: '+2349152486135',
    driverRating: 4.98,
    vehicleModel: 'Toyota Corolla (Silver)',
    vehiclePlate: 'LAG-492-AA',
    route: 'Berger ➔ Lekki Phase 1',
    pickupLandmark: 'Oando Station Berger Exit',
    departureCode: '4812',
    unreadCount: 1,
    lastMessage: 'Yes, I am waiting near the Oando station exit. Hazard lights blinking on the Silver Corolla.',
    time: '06:18 AM',
    updatedAt: Date.now() - 1000 * 60 * 15,
    messages: [
      {
        id: 'm-901-1',
        bookingId: 'book-901',
        senderId: 'driver-1',
        senderName: 'Olajide Abdulquadri',
        body: 'Good morning! Preparing for our Berger-Lekki commute. I will be at the Oando station by 6:15 AM.',
        isSelf: false,
        createdAt: '06:12 AM',
        read: true,
      },
      {
        id: 'm-901-2',
        bookingId: 'book-901',
        senderId: 'usr-self',
        senderName: 'You',
        body: 'Morning Olajide! Just got to the pedestrian bridge. Walking towards the fuel station now.',
        isSelf: true,
        createdAt: '06:15 AM',
        read: true,
      },
      {
        id: 'm-901-3',
        bookingId: 'book-901',
        senderId: 'driver-1',
        senderName: 'Olajide Abdulquadri',
        body: 'Yes, I am waiting near the Oando station exit. Hazard lights blinking on the Silver Corolla.',
        isSelf: false,
        createdAt: '06:18 AM',
        read: false,
      },
    ],
  },
  {
    bookingId: 'book-902',
    driverName: 'Fatima Sanusi',
    driverAvatar:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    driverPhone: '+2348023456789',
    driverRating: 4.95,
    vehicleModel: 'Hyundai Elantra (White)',
    vehiclePlate: 'KRD-302-BD',
    route: 'Ikorodu ➔ CMS / Marina',
    pickupLandmark: 'Ikorodu BRT Terminal Main Gate',
    departureCode: '7391',
    unreadCount: 0,
    lastMessage: 'Pickup at Ikorodu BRT confirmed for tomorrow 7am. Please remember the strict cashless escrow rule.',
    time: 'Yesterday',
    updatedAt: Date.now() - 1000 * 60 * 60 * 20,
    messages: [
      {
        id: 'm-902-1',
        bookingId: 'book-902',
        senderId: 'usr-self',
        senderName: 'You',
        body: 'Hello Fatima, confirmed the morning commute from Ikorodu BRT to Marina.',
        isSelf: true,
        createdAt: '08:20 PM',
        read: true,
      },
      {
        id: 'm-902-2',
        bookingId: 'book-902',
        senderId: 'driver-2',
        senderName: 'Fatima Sanusi',
        body: 'Pickup at Ikorodu BRT confirmed for tomorrow 7am. Please remember the strict cashless escrow rule.',
        isSelf: false,
        createdAt: '08:22 PM',
        read: true,
      },
    ],
  },
  {
    bookingId: 'book-903',
    driverName: 'Emeka Okonkwo',
    driverAvatar:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    driverPhone: '+2348109876543',
    driverRating: 4.92,
    vehicleModel: 'Mazda 3 (Dark Blue)',
    vehiclePlate: 'APP-519-SM',
    route: 'Yaba / Tech Corridor ➔ Victoria Island',
    pickupLandmark: 'Tejuosho Market Plaza, Yaba',
    departureCode: '2058',
    unreadCount: 0,
    lastMessage: 'I am parked just after the BRT lane entrance by the plaza. See you soon!',
    time: '07:10 AM',
    updatedAt: Date.now() - 1000 * 60 * 60 * 2,
    messages: [
      {
        id: 'm-903-1',
        bookingId: 'book-903',
        senderId: 'driver-3',
        senderName: 'Emeka Okonkwo',
        body: 'Welcome to our daily Yaba-VI carpool! Departure is prompt at 7:15 AM to beat the Eko Bridge traffic.',
        isSelf: false,
        createdAt: '07:05 AM',
        read: true,
      },
      {
        id: 'm-903-2',
        bookingId: 'book-903',
        senderId: 'usr-self',
        senderName: 'You',
        body: 'On my way down from Commercial Avenue. 2 minutes away.',
        isSelf: true,
        createdAt: '07:08 AM',
        read: true,
      },
      {
        id: 'm-903-3',
        bookingId: 'book-903',
        senderId: 'driver-3',
        senderName: 'Emeka Okonkwo',
        body: 'I am parked just after the BRT lane entrance by the plaza. See you soon!',
        isSelf: false,
        createdAt: '07:10 AM',
        read: true,
      },
    ],
  },
  {
    bookingId: 'book-904',
    driverName: 'Amina Bello (Ladies Only)',
    driverAvatar:
      'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=400&q=80',
    driverPhone: '+2348091122334',
    driverRating: 4.99,
    vehicleModel: 'Toyota Camry (Grey)',
    vehiclePlate: 'RSH-104-AB',
    route: 'Gwarinpa ➔ Central Business District (Abuja)',
    pickupLandmark: '1st Avenue Junction, Gwarinpa',
    departureCode: '6430',
    unreadCount: 0,
    lastMessage: 'Approaching now with AC running, see you in 1 minute!',
    time: '07:50 AM',
    updatedAt: Date.now() - 1000 * 60 * 60 * 4,
    messages: [
      {
        id: 'm-904-1',
        bookingId: 'book-904',
        senderId: 'driver-4',
        senderName: 'Amina Bello (Ladies Only)',
        body: 'Assalamu alaikum! Verified ladies-only trip to Federal Secretariat. AC is on and trunk has space.',
        isSelf: false,
        createdAt: '07:45 AM',
        read: true,
      },
      {
        id: 'm-904-2',
        bookingId: 'book-904',
        senderId: 'usr-self',
        senderName: 'You',
        body: 'Good morning Amina, waiting by the FCMB ATM corner.',
        isSelf: true,
        createdAt: '07:48 AM',
        read: true,
      },
      {
        id: 'm-904-3',
        bookingId: 'book-904',
        senderId: 'driver-4',
        senderName: 'Amina Bello (Ladies Only)',
        body: 'Approaching now with AC running, see you in 1 minute!',
        isSelf: false,
        createdAt: '07:50 AM',
        read: true,
      },
    ],
  },
];

type Listener = (threads: ChatConversation[]) => void;

class ChatPipelineService {
  private threads: ChatConversation[] = [];
  private listeners: Set<Listener> = new Set();
  private isLoaded: boolean = false;

  constructor() {
    this.init();
  }

  private async init() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: ChatConversation[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.threads = parsed;
          this.isLoaded = true;
          this.notify();
          return;
        }
      }
    } catch {}
    this.threads = [...SEED_CONVERSATIONS];
    this.isLoaded = true;
    this.persist();
  }

  private async persist() {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.threads));
      this.notify();
    } catch {}
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try {
        fn(this.getConversations());
      } catch {}
    });
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    if (this.isLoaded) {
      listener(this.getConversations());
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getConversations(): ChatConversation[] {
    return [...this.threads].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  public getThread(bookingId: string): ChatConversation | null {
    const found = this.threads.find((t) => String(t.bookingId) === String(bookingId));
    if (found) return found;

    // Check seed items
    const seed = SEED_CONVERSATIONS.find((t) => String(t.bookingId) === String(bookingId));
    if (seed) {
      this.threads.unshift({ ...seed });
      this.persist();
      return seed;
    }

    return null;
  }

  public ensureThreadForBooking(booking: Booking): ChatConversation {
    const existing = this.getThread(booking.id);
    if (existing) return existing;

    const ride = booking.ride;
    const newThread: ChatConversation = {
      bookingId: booking.id,
      driverName: ride?.driverName || 'Verified Corridor Driver',
      driverAvatar:
        ride?.driverAvatar ||
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      driverPhone: '+2349152486135',
      driverRating: ride?.driverRating || 4.95,
      vehicleModel: `${ride?.vehicle?.model || 'Toyota Corolla'} (${ride?.vehicle?.color || 'Silver'})`,
      vehiclePlate: ride?.vehicle?.registrationNumber || 'LAG-101-RS',
      route: `${ride?.originTitle || 'Origin'} ➔ ${ride?.destTitle || 'Destination'}`,
      pickupLandmark: booking.pickupLandmark || ride?.originLandmark || 'Designated Landmark',
      departureCode: String(Math.floor(1000 + Math.random() * 9000)),
      unreadCount: 1,
      lastMessage: `Hello! I have confirmed your booking for ${ride?.originTitle || 'this ride'}. See you at the landmark.`,
      time: 'Just now',
      updatedAt: Date.now(),
      messages: [
        {
          id: `m-${booking.id}-welcome`,
          bookingId: booking.id,
          senderId: 'driver',
          senderName: ride?.driverName || 'Verified Driver',
          body: `Hello! I have confirmed your booking for ${ride?.originTitle || 'this corridor'}. My vehicle is ${ride?.vehicle?.model || 'verified'} (${ride?.vehicle?.registrationNumber || 'LAG-101-RS'}). Please meet at ${booking.pickupLandmark || 'the landmark'}.`,
          isSelf: false,
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          read: false,
        },
      ],
    };

    this.threads.unshift(newThread);
    this.persist();
    return newThread;
  }

  public markAsRead(bookingId: string) {
    const thread = this.threads.find((t) => String(t.bookingId) === String(bookingId));
    if (thread && thread.unreadCount > 0) {
      thread.unreadCount = 0;
      thread.messages.forEach((m) => {
        m.read = true;
      });
      this.persist();
      try {
        api.chat.markRead(bookingId);
      } catch {}
    }
  }

  public async sendMessage(
    bookingId: string,
    body: string,
    senderName: string = 'You'
  ): Promise<ChatMessage> {
    const thread = this.getThread(bookingId) || {
      bookingId,
      driverName: 'Verified Corridor Driver',
      driverAvatar:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      driverPhone: '+2349152486135',
      driverRating: 4.95,
      vehicleModel: 'Toyota Corolla',
      vehiclePlate: 'LAG-492-AA',
      route: 'Lagos Corridor',
      pickupLandmark: 'Designated Landmark',
      departureCode: '5820',
      unreadCount: 0,
      lastMessage: body,
      time: 'Just now',
      updatedAt: Date.now(),
      messages: [],
    };

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      bookingId,
      senderId: 'usr-self',
      senderName,
      body,
      isSelf: true,
      createdAt: timeStr,
      read: true,
    };

    thread.messages.push(userMsg);
    thread.lastMessage = body;
    thread.time = timeStr;
    thread.updatedAt = Date.now();

    if (!this.threads.some((t) => t.bookingId === bookingId)) {
      this.threads.unshift(thread);
    }

    await this.persist();

    // Sync to backend if live
    try {
      await api.chat.sendMessage(bookingId, body);
    } catch {}

    // Context-Aware Corridor Driver Auto-Reply
    this.scheduleDriverReply(thread, body);

    return userMsg;
  }

  private scheduleDriverReply(thread: ChatConversation, userText: string) {
    const lower = userText.toLowerCase();
    let replyText = `Received! See you at ${thread.pickupLandmark}. Driving safely!`;

    if (lower.includes('where are you') || lower.includes('close') || lower.includes('location') || lower.includes('reach')) {
      replyText = `I am 2 minutes away approaching ${thread.pickupLandmark}. Look out for my ${thread.vehicleModel} (${thread.vehiclePlate}).`;
    } else if (lower.includes('traffic') || lower.includes('delay') || lower.includes('hold up') || lower.includes('holdup')) {
      replyText = `Noted on the traffic. Take your time, I have reserved your seat and hazard lights are on.`;
    } else if (lower.includes('code') || lower.includes('pin') || lower.includes('departure')) {
      replyText = `Your security departure code is ${thread.departureCode}. I will verify it before we roll!`;
    } else if (lower.includes('bag') || lower.includes('luggage') || lower.includes('boot') || lower.includes('trunk')) {
      replyText = `Yes, there is plenty of room in the trunk for your luggage!`;
    } else if (lower.includes('arrived') || lower.includes('standing') || lower.includes('here') || lower.includes('outside')) {
      replyText = `Spot on! I see the landmark. Pulling up to the curb now in ${thread.vehiclePlate}.`;
    } else if (lower.includes('hello') || lower.includes('hi') || lower.includes('morning') || lower.includes('afternoon')) {
      replyText = `Hello! Thank you for carpooling with me today along ${thread.route}.`;
    }

    setTimeout(async () => {
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const driverMsg: ChatMessage = {
        id: `reply-${Date.now()}`,
        bookingId: thread.bookingId,
        senderId: 'driver-id',
        senderName: thread.driverName,
        body: replyText,
        isSelf: false,
        createdAt: replyTime,
        read: false,
      };

      thread.messages.push(driverMsg);
      thread.lastMessage = replyText;
      thread.time = replyTime;
      thread.updatedAt = Date.now();
      thread.unreadCount = (thread.unreadCount || 0) + 1;

      await this.persist();
    }, 1200);
  }
}

export const chatPipeline = new ChatPipelineService();
