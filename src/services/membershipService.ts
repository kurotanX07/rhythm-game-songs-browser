// src/services/membershipService.ts
import { doc, setDoc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { UserWithMembership } from '../contexts/AuthContext';

// Collection name for user memberships
const USER_MEMBERSHIPS_COLLECTION = 'userMemberships';

// Price IDs from your Stripe dashboard
const PREMIUM_MONTHLY_PRICE_ID = 'price_monthly_premium'; // Replace with your actual Stripe price ID
const PREMIUM_YEARLY_PRICE_ID = 'price_yearly_premium';   // Replace with your actual Stripe price ID

// Define subscription plans
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  stripePriceId: string;
}

// Available subscription plans
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'premium-monthly',
    name: 'プレミアム会員 (月額)',
    description: '月額プランでプレミアム機能をお楽しみください',
    price: 980,
    interval: 'month',
    features: [
      '楽曲データのエクスポート機能',
      '広告なしで快適に閲覧',
      'お気に入り曲の無制限保存',
      'プレミアムサポート'
    ],
    stripePriceId: PREMIUM_MONTHLY_PRICE_ID
  },
  {
    id: 'premium-yearly',
    name: 'プレミアム会員 (年額)',
    description: '年額プラン - 2ヶ月分お得！',
    price: 9800,
    interval: 'year',
    features: [
      '楽曲データのエクスポート機能',
      '広告なしで快適に閲覧',
      'お気に入り曲の無制限保存',
      'プレミアムサポート',
      '2ヶ月分無料（年額割引）'
    ],
    stripePriceId: PREMIUM_YEARLY_PRICE_ID
  }
];

/**
 * Get user membership details
 */
export async function getUserMembership(userId: string): Promise<UserWithMembership | null> {
  try {
    const membershipDoc = await getDoc(doc(db, USER_MEMBERSHIPS_COLLECTION, userId));
    
    if (!membershipDoc.exists()) {
      return null;
    }
    
    const data = membershipDoc.data();
    return {
      uid: userId,
      email: null, // This will be filled by the AuthContext
      displayName: null,
      photoURL: null,
      membershipLevel: data.membershipLevel || 'free',
      membershipExpiry: data.membershipExpiry?.toDate() || null
    };
  } catch (error) {
    console.error('Error getting user membership:', error);
    throw error;
  }
}

/**
 * Update user membership status after payment
 */
export async function updateUserMembership(
  userId: string, 
  membershipLevel: 'free' | 'premium' | 'admin',
  expiryDate: Date | null
): Promise<void> {
  try {
    const membershipRef = doc(db, USER_MEMBERSHIPS_COLLECTION, userId);
    
    await setDoc(membershipRef, {
      membershipLevel,
      membershipExpiry: expiryDate ? Timestamp.fromDate(expiryDate) : null,
      updatedAt: Timestamp.now()
    }, { merge: true });
    
  } catch (error) {
    console.error('Error updating user membership:', error);
    throw error;
  }
}

/**
 * Check if user has premium access
 */
export function hasPremiumAccess(membership: UserWithMembership | null): boolean {
  if (!membership) return false;
  
  // Admin always has premium access
  if (membership.membershipLevel === 'admin') return true;
  
  // Check if premium membership is valid and not expired
  return (
    membership.membershipLevel === 'premium' && 
    membership.membershipExpiry !== null && 
    membership.membershipExpiry > new Date()
  );
}

/**
 * Create checkout session for Stripe
 */
export async function createCheckoutSession(
  userId: string, 
  planId: string
): Promise<{ sessionId: string } | null> {
  try {
    // In a real implementation, you would call a Firebase function to create a Stripe Checkout session
    // This function would communicate with your backend to create the session
    
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
    if (!plan) throw new Error('Invalid subscription plan');
    
    // Here we're just mocking the response - in a real app you would call your backend
    // const response = await fetch('/api/create-checkout-session', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ userId, planId: plan.stripePriceId })
    // });
    
    // const data = await response.json();
    // return data;
    
    // Mock response - replace with actual API call in production
    return {
      sessionId: `mock_session_${Date.now()}`
    };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return null;
  }
}

/**
 * Handle successful subscription
 */
export async function handleSuccessfulSubscription(
  userId: string,
  subscriptionId: string,
  planId: string
): Promise<void> {
  try {
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
    if (!plan) throw new Error('Invalid subscription plan');
    
    // Calculate expiry date based on plan interval
    const now = new Date();
    const expiryDate = new Date(now);
    
    if (plan.interval === 'month') {
      expiryDate.setMonth(now.getMonth() + 1);
    } else if (plan.interval === 'year') {
      expiryDate.setFullYear(now.getFullYear() + 1);
    }
    
    // Update user membership in Firestore
    await updateUserMembership(userId, 'premium', expiryDate);
    
    // Save subscription details (useful for managing subscriptions later)
    const subscriptionRef = doc(db, 'subscriptions', subscriptionId);
    await setDoc(subscriptionRef, {
      userId,
      planId,
      status: 'active',
      startDate: Timestamp.now(),
      endDate: Timestamp.fromDate(expiryDate),
      createdAt: Timestamp.now()
    });
    
  } catch (error) {
    console.error('Error handling successful subscription:', error);
    throw error;
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  userId: string,
  subscriptionId: string
): Promise<void> {
  try {
    // In a real implementation, you would call your backend to cancel the subscription with Stripe
    // Here we're just updating our database
    
    // Update subscription status
    const subscriptionRef = doc(db, 'subscriptions', subscriptionId);
    await updateDoc(subscriptionRef, {
      status: 'cancelled',
      updatedAt: Timestamp.now()
    });
    
    // Get the current user membership to keep the premium access until expiry
    const membership = await getUserMembership(userId);
    if (membership && membership.membershipLevel === 'premium') {
      // Keep the same expiry date, the user will have premium until then
      // You could also adjust this behavior to end immediately if desired
    }
    
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    throw error;
  }
}