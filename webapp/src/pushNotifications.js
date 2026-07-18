import { supabase } from './supabaseClient';

const VAPID_PUBLIC_KEY = "BHxIzB_XMV6emd94K__QX_2mpxE9qtKUVvXR4qOHpyltPo33SWWRUGLjM0AsMThnt7HES70RIFrJw0iywvAr5jU";

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function requestPushPermissionAndSubscribe(user) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push messaging is not supported');
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    
    // Subscribe
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    if (user) {
      await saveSubscriptionToDB(subscription, user.id);
    }

    return subscription;
  } catch (error) {
    console.error('Error subscribing to push:', error);
  }
}

async function saveSubscriptionToDB(subscription, userId) {
  try {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert(
        { user_id: userId, subscription: JSON.parse(JSON.stringify(subscription)) },
        { onConflict: 'user_id' } // Only one active sub per user for simplicity, or we can allow multiple
      );
    
    if (error) {
      // If the constraint isn't exactly 'user_id', we might just insert, but we created a standard table.
      // Since 'user_id' isn't UNIQUE by default in our SQL, upsert on user_id might fail without a unique constraint.
      // Let's just do an insert if it doesn't exist, or delete old ones.
      await supabase.from('push_subscriptions').delete().eq('user_id', userId);
      await supabase.from('push_subscriptions').insert({ user_id: userId, subscription: JSON.parse(JSON.stringify(subscription)) });
    }
  } catch (err) {
    console.error('Error saving sub:', err);
  }
}
