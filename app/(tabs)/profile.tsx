import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { getUserStats } from '@/lib/database';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [photoCount, setPhotoCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getUserStats(user.id)
      .then(({ count }) => setPhotoCount(count))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const handleSignOut = () => {
    const doSignOut = async () => {
      await signOut();
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to sign out?');
      if (confirmed) doSignOut();
      return;
    }

    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: doSignOut,
      },
    ]);
  };

  if (loading) {
    return <LoadingSpinner message="Loading profile..." />;
  }

  const email = user?.email ?? 'Unknown';
  const avatarLetter = email.charAt(0).toUpperCase();
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : '—';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Avatar + Identity */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>{avatarLetter}</Text>
          </View>
          <Text style={styles.email} numberOfLines={1}>
            {email}
          </Text>
          <Text style={styles.memberSince}>Member since {memberSince}</Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="images" size={24} color="#6366f1" />
            <Text style={styles.statValue}>{photoCount}</Text>
            <Text style={styles.statLabel}>Photos</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="cloud" size={24} color="#8b5cf6" />
            <Text style={styles.statValue}>
              {(photoCount * 1.2).toFixed(1)} MB
            </Text>
            <Text style={styles.statLabel}>Storage Used</Text>
          </View>
        </View>

        {/* Info rows */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={20} color="#555" />
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {email}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color="#555" />
            <Text style={styles.infoLabel}>Joined</Text>
            <Text style={styles.infoValue}>{memberSince}</Text>
          </View>
        </View>

        {/* Sign Out */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* App info */}
        <Text style={styles.version}>PhotoCloud v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    borderWidth: 2,
    borderColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarLetter: {
    color: '#6366f1',
    fontSize: 36,
    fontWeight: '800',
  },
  email: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    maxWidth: '80%',
  },
  memberSince: {
    color: '#555',
    fontSize: 13,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#1f1f1f',
  },
  statValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    color: '#555',
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    marginHorizontal: 16,
    backgroundColor: '#111',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1f1f1f',
  },
  sectionTitle: {
    color: '#555',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  infoLabel: {
    color: '#888',
    fontSize: 14,
    flex: 1,
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
    flex: 2,
    textAlign: 'right',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  signOutText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '600',
  },
  version: {
    color: '#333',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 32,
    marginTop: 8,
  },
});
