import * as Notifications from 'expo-notifications';
export async function requestClubNotificationPermission() { const { status } = await Notifications.requestPermissionsAsync(); return status === 'granted'; }
export async function getExpoPushToken() { const ok = await requestClubNotificationPermission(); if (!ok) return null; return (await Notifications.getExpoPushTokenAsync()).data; }
