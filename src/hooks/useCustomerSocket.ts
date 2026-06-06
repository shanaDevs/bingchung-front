'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getSocket } from '@/lib/socketClient';
import { useAuthStore } from '@/store/authStore';
import type { Order, OrderStatus } from '@/types';

export interface CustomerNotificationPayload {
  id: string;
  type: string;
  title: string;
  message: string;
  orderId?: string;
  orderNumber?: string;
  status?: OrderStatus;
  note?: string | null;
  read: boolean;
  createdAt: string;
}

const STATUS_TOAST: Partial<Record<OrderStatus, string>> = {
  RECEIVED: '📥',
  PREPARING: '👨‍🍳',
  READY: '✅',
  OUT_FOR_DELIVERY: '🛵',
  DELIVERED: '🎉',
  CANCELLED: '❌',
};

type QueueUpdatePayload = {
  queuePosition?: number;
  scheduledPickupAt?: string;
};

/** Subscribe to a single order room (track page) without duplicating user-level events */
export function useOrderTrackSocket(
  orderId: string | undefined,
  onStatus: (data: { status: OrderStatus; orderNumber?: string; note?: string }) => void,
  onQueueUpdate?: (data: QueueUpdatePayload) => void,
  onPickupSoon?: (data: { title?: string; message?: string }) => void
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!orderId) return;
    const socket = getSocket();
    socket.emit('trackOrder', orderId);

    const statusHandler = (data: { status: OrderStatus; orderNumber?: string; note?: string }) => {
      onStatus(data);
      void queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    };

    const queueHandler = (data: QueueUpdatePayload) => {
      onQueueUpdate?.(data);
      void queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    };

    const pickupHandler = (data: { title?: string; message?: string }) => {
      onPickupSoon?.(data);
      void queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    };

    socket.on('orderStatus', statusHandler);
    socket.on('queueUpdate', queueHandler);
    socket.on('pickupSoon', pickupHandler);

    return () => {
      socket.off('orderStatus', statusHandler);
      socket.off('queueUpdate', queueHandler);
      socket.off('pickupSoon', pickupHandler);
    };
  }, [orderId, onStatus, onQueueUpdate, onPickupSoon, queryClient]);
}

export function useCustomerSocket() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    const socket = getSocket();

    const handleNotification = (payload: CustomerNotificationPayload) => {
      window.dispatchEvent(new CustomEvent('bc-customer-notification', { detail: payload }));

      const isCompletion =
        payload.status === 'DELIVERED' || payload.status === 'READY';
      const isPickupSoon = payload.type === 'PICKUP_SOON';
      if (isCompletion && payload.orderNumber) {
        window.dispatchEvent(
          new CustomEvent('bc-order-complete', {
            detail: {
              orderNumber: payload.orderNumber,
              orderId: payload.orderId,
              status: payload.status,
            },
          })
        );
      }

      if (isPickupSoon) {
        toast(payload.message || payload.title, { icon: '⏰', duration: 6000 });
      } else if (!isCompletion) {
        const icon = payload.status ? STATUS_TOAST[payload.status] ?? '🔔' : '🔔';
        toast(payload.title, {
          icon,
          duration: 5000,
        });
      }
      void queryClient.invalidateQueries({ queryKey: ['customer-notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['my-orders'] });
    };

    const handleStatusUpdate = (data: {
      orderId: string;
      orderNumber: string;
      status: OrderStatus;
      note?: string;
    }) => {
      if (userId) {
        queryClient.setQueryData<Order[]>(['my-orders', userId], (old) => {
          if (!old?.length) return old;
          return old.map((o) =>
            o.id === data.orderId || o.orderNumber === data.orderNumber
              ? { ...o, status: data.status }
              : o
          );
        });
      }
      void queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      if (data.orderNumber) {
        void queryClient.invalidateQueries({ queryKey: ['order', data.orderNumber] });
      }
      void queryClient.invalidateQueries({ queryKey: ['order', data.orderId] });
    };

    socket.on('customerNotification', handleNotification);
    socket.on('orderStatusUpdate', handleStatusUpdate);

    return () => {
      socket.off('customerNotification', handleNotification);
      socket.off('orderStatusUpdate', handleStatusUpdate);
    };
  }, [queryClient, userId]);

  useEffect(() => {
    const socket = getSocket();
    if (isAuthenticated && userId) {
      socket.emit('joinUser', userId);
    }
  }, [isAuthenticated, userId]);
}
