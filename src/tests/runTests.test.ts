// Fichier d'exécution des tests pour l'application FriendTime
// Ce fichier appelle toutes les fonctions de test et vérifie qu'elles passent

import { describe, it, expect } from 'vitest';
import {
  // Tests friendService
  searchUserByUsername_Test,
  sendFriendRequest_Test,
  acceptFriendRequest_Test,
  rejectFriendRequest_Test,
  removeFriend_Test,
  getFriends_Test,
  getPendingRequests_Test,
  getFriendTimeStats_Test,
  getMonthlyStats_Test,
  getActiveSessions_Test,
  getStatsForPeriod_Test,
  // Tests authService
  signUp_Test,
  signIn_Test,
  signOut_Test,
  getCurrentSession_Test,
  updateProfile_Test,
  resetPassword_Test,
  // Tests locationService
  initLocationService_Test,
  startLocationTracking_Test,
  stopLocationTracking_Test,
  getCurrentLocation_Test,
  updateUserLocation_Test,
  checkProximityWithFriends_Test,
  startTimeSession_Test,
  endTimeSession_Test,
  cleanupStaleSessions_Test,
  isLocationTrackingActive_Test,
  // Tests supabase
  checkConnection_Test,
} from './testFunctions';

describe('FriendTime App Tests', () => {
  describe('friendService.ts', () => {
    it('searchUserByUsername should pass all test cases', async () => {
      const result = await searchUserByUsername_Test();
      expect(result).toBe(1);
    });

    it('sendFriendRequest should pass all test cases', async () => {
      const result = await sendFriendRequest_Test();
      expect(result).toBe(1);
    });

    it('acceptFriendRequest should pass all test cases', async () => {
      const result = await acceptFriendRequest_Test();
      expect(result).toBe(1);
    });

    it('rejectFriendRequest should pass all test cases', async () => {
      const result = await rejectFriendRequest_Test();
      expect(result).toBe(1);
    });

    it('removeFriend should pass all test cases', async () => {
      const result = await removeFriend_Test();
      expect(result).toBe(1);
    });

    it('getFriends should pass all test cases', async () => {
      const result = await getFriends_Test();
      expect(result).toBe(1);
    });

    it('getPendingRequests should pass all test cases', async () => {
      const result = await getPendingRequests_Test();
      expect(result).toBe(1);
    });

    it('getFriendTimeStats should pass all test cases', async () => {
      const result = await getFriendTimeStats_Test();
      expect(result).toBe(1);
    });

    it('getMonthlyStats should pass all test cases', async () => {
      const result = await getMonthlyStats_Test();
      expect(result).toBe(1);
    });

    it('getStatsForPeriod should pass all test cases', async () => {
      const result = await getStatsForPeriod_Test();
      expect(result).toBe(1);
    });

    it('getActiveSessions should pass all test cases', async () => {
      const result = await getActiveSessions_Test();
      expect(result).toBe(1);
    });
  });

  describe('authService.ts', () => {
    it('signUp should pass all test cases', async () => {
      const result = await signUp_Test();
      expect(result).toBe(1);
    });

    it('signIn should pass all test cases', async () => {
      const result = await signIn_Test();
      expect(result).toBe(1);
    });

    it('signOut should pass all test cases', async () => {
      const result = await signOut_Test();
      expect(result).toBe(1);
    });

    it('getCurrentSession should pass all test cases', async () => {
      const result = await getCurrentSession_Test();
      expect(result).toBe(1);
    });

    it('updateProfile should pass all test cases', async () => {
      const result = await updateProfile_Test();
      expect(result).toBe(1);
    });

    it('resetPassword should pass all test cases', async () => {
      const result = await resetPassword_Test();
      expect(result).toBe(1);
    });
  });

  describe('locationService.ts', () => {
    it('initLocationService should pass all test cases', async () => {
      const result = await initLocationService_Test();
      expect(result).toBe(1);
    });

    it('startLocationTracking should pass all test cases', async () => {
      const result = await startLocationTracking_Test();
      expect(result).toBe(1);
    });

    it('stopLocationTracking should pass all test cases', async () => {
      const result = await stopLocationTracking_Test();
      expect(result).toBe(1);
    });

    it('getCurrentLocation should pass all test cases', async () => {
      const result = await getCurrentLocation_Test();
      expect(result).toBe(1);
    });

    it('updateUserLocation should pass all test cases', async () => {
      const result = await updateUserLocation_Test();
      expect(result).toBe(1);
    });

    it('checkProximityWithFriends should pass all test cases', async () => {
      const result = await checkProximityWithFriends_Test();
      expect(result).toBe(1);
    });

    it('startTimeSession should pass all test cases', async () => {
      const result = await startTimeSession_Test();
      expect(result).toBe(1);
    });

    it('endTimeSession should pass all test cases', async () => {
      const result = await endTimeSession_Test();
      expect(result).toBe(1);
    });

    it('cleanupStaleSessions should pass all test cases', async () => {
      const result = await cleanupStaleSessions_Test();
      expect(result).toBe(1);
    });

    it('isLocationTrackingActive should pass all test cases', async () => {
      const result = await isLocationTrackingActive_Test();
      expect(result).toBe(1);
    });
  });

  describe('supabase.ts', () => {
    it('checkConnection should pass all test cases', async () => {
      const result = await checkConnection_Test();
      expect(result).toBe(1);
    });
  });
});