import { supabase } from "./supabase";
import { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Supabase Realtime Subscriptions
 * Provides live updates for database changes
 */

export type SubscriptionCallback = (payload: any) => void;

class RealtimeManager {
  private channels: Map<string, RealtimeChannel> = new Map();
  private subscriptions: Map<string, Set<SubscriptionCallback>> = new Map();

  /**
   * Subscribe to table changes
   * @param table - The table to subscribe to
   * @param event - The event type (INSERT, UPDATE, DELETE)
   * @param callback - Callback function to handle the event
   * @returns Unsubscribe function
   */
  subscribe(
    table: string,
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*',
    callback: SubscriptionCallback
  ): () => void {
    const channelName = `${table}_${event}`;
    
    // Get or create channel
    let channel = this.channels.get(channelName);
    if (!channel) {
      channel = supabase.channel(channelName);
      this.channels.set(channelName, channel);
    }

    // Add callback to subscriptions
    if (!this.subscriptions.has(channelName)) {
      this.subscriptions.set(channelName, new Set());
    }
    this.subscriptions.get(channelName)!.add(callback);

    // Set up the subscription
    channel.on(
      `postgres://${event}`,
      { schema: 'public', table },
      (payload) => {
        const callbacks = this.subscriptions.get(channelName);
        if (callbacks) {
          callbacks.forEach(cb => cb(payload));
        }
      }
    );

    // Subscribe the channel
    channel.subscribe();

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscriptions.get(channelName);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          channel.unsubscribe();
          this.channels.delete(channelName);
          this.subscriptions.delete(channelName);
        }
      }
    };
  }

  /**
   * Subscribe to a specific record by ID
   * @param table - The table to subscribe to
   * @param id - The record ID
   * @param callback - Callback function to handle the event
   * @returns Unsubscribe function
   */
  subscribeToRecord(
    table: string,
    id: string,
    callback: SubscriptionCallback
  ): () => void {
    const channelName = `${table}_${id}`;
    
    let channel = this.channels.get(channelName);
    if (!channel) {
      channel = supabase.channel(channelName);
      this.channels.set(channelName, channel);
    }

    if (!this.subscriptions.has(channelName)) {
      this.subscriptions.set(channelName, new Set());
    }
    this.subscriptions.get(channelName)!.add(callback);

    channel.on(
      `postgres://*`,
      { schema: 'public', table, filter: `id=eq.${id}` },
      (payload) => {
        const callbacks = this.subscriptions.get(channelName);
        if (callbacks) {
          callbacks.forEach(cb => cb(payload));
        }
      }
    );

    channel.subscribe();

    return () => {
      const callbacks = this.subscriptions.get(channelName);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          channel.unsubscribe();
          this.channels.delete(channelName);
          this.subscriptions.delete(channelName);
        }
      }
    };
  }

  /**
   * Subscribe to user-specific data
   * @param table - The table to subscribe to
   * @param userId - The user ID
   * @param callback - Callback function to handle the event
   * @returns Unsubscribe function
   */
  subscribeToUser(
    table: string,
    userId: string,
    callback: SubscriptionCallback
  ): () => void {
    const channelName = `${table}_user_${userId}`;
    
    let channel = this.channels.get(channelName);
    if (!channel) {
      channel = supabase.channel(channelName);
      this.channels.set(channelName, channel);
    }

    if (!this.subscriptions.has(channelName)) {
      this.subscriptions.set(channelName, new Set());
    }
    this.subscriptions.get(channelName)!.add(callback);

    channel.on(
      `postgres://*`,
      { schema: 'public', table, filter: `user_id=eq.${userId}` },
      (payload) => {
        const callbacks = this.subscriptions.get(channelName);
        if (callbacks) {
          callbacks.forEach(cb => cb(payload));
        }
      }
    );

    channel.subscribe();

    return () => {
      const callbacks = this.subscriptions.get(channelName);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          channel.unsubscribe();
          this.channels.delete(channelName);
          this.subscriptions.delete(channelName);
        }
      }
    };
  }

  /**
   * Unsubscribe from all subscriptions
   */
  unsubscribeAll() {
    this.channels.forEach((channel) => {
      channel.unsubscribe();
    });
    this.channels.clear();
    this.subscriptions.clear();
  }
}

// Export singleton instance
export const realtimeManager = new RealtimeManager();

/**
 * React hook for subscribing to table changes
 * @param table - The table to subscribe to
 * @param event - The event type
 * @param callback - Callback function
 * @param deps - Dependency array
 */
export function useRealtimeSubscription(
  table: string,
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*',
  callback: SubscriptionCallback,
  deps: any[] = []
) {
  useEffect(() => {
    const unsubscribe = realtimeManager.subscribe(table, event, callback);
    return () => unsubscribe();
  }, [table, event, callback, ...deps]);
}

/**
 * React hook for subscribing to a specific record
 * @param table - The table to subscribe to
 * @param id - The record ID
 * @param callback - Callback function
 * @param deps - Dependency array
 */
export function useRealtimeRecordSubscription(
  table: string,
  id: string | undefined,
  callback: SubscriptionCallback,
  deps: any[] = []
) {
  useEffect(() => {
    if (!id) return;
    const unsubscribe = realtimeManager.subscribeToRecord(table, id, callback);
    return () => unsubscribe();
  }, [table, id, callback, ...deps]);
}

/**
 * React hook for subscribing to user-specific data
 * @param table - The table to subscribe to
 * @param userId - The user ID
 * @param callback - Callback function
 * @param deps - Dependency array
 */
export function useRealtimeUserSubscription(
  table: string,
  userId: string | undefined,
  callback: SubscriptionCallback,
  deps: any[] = []
) {
  useEffect(() => {
    if (!userId) return;
    const unsubscribe = realtimeManager.subscribeToUser(table, userId, callback);
    return () => unsubscribe();
  }, [table, userId, callback, ...deps]);
}

// Import useEffect from React
import { useEffect } from "react";
