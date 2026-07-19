import { supabase } from '@/data/supabase/client';
import type { Json } from '@/types/finance';
import type {
  FeedbackCategory,
  FeedbackItem,
  FeedbackPriority,
  FeedbackReply,
  FeedbackStatus
} from '@/types/intelligence';
import { throwDatabaseError } from './repositoryError';

export type FeedbackInput = {
  householdId?: string | null;
  userId: string;
  rating: number;
  title: string;
  category: FeedbackCategory;
  description: string;
  screenshotPath?: string | null;
  priority: FeedbackPriority;
  email?: string | null;
  deviceInfo?: string | null;
  browserInfo?: string | null;
  appVersion?: string | null;
  metadata?: Json;
};

function safeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').slice(-100);
}

export const FeedbackRepository = {
  async listMine(userId: string): Promise<FeedbackItem[]> {
    const { data, error } = await supabase
      .from('feedback')
      .select('*, feedback_reply(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throwDatabaseError('Failed to load feedback', error);
    return (data ?? []) as FeedbackItem[];
  },

  async create(input: FeedbackInput): Promise<FeedbackItem> {
    const { data, error } = await supabase
      .from('feedback')
      .insert({
        household_id: input.householdId ?? null,
        user_id: input.userId,
        rating: input.rating,
        title: input.title,
        category: input.category,
        description: input.description,
        screenshot_path: input.screenshotPath ?? null,
        priority: input.priority,
        email: input.email ?? null,
        device_info: input.deviceInfo ?? null,
        browser_info: input.browserInfo ?? null,
        app_version: input.appVersion ?? null,
        metadata: input.metadata ?? {}
      })
      .select('*')
      .single();
    if (error) throwDatabaseError('Failed to submit feedback', error);
    return data as FeedbackItem;
  },

  async uploadScreenshot(householdId: string, userId: string, file: File): Promise<string> {
    if (!file.type.startsWith('image/')) throw new Error('Feedback screenshots must be image files.');
    if (file.size > 10 * 1024 * 1024) throw new Error('Screenshot must be 10 MB or smaller.');
    const path = `${householdId}/feedback/${userId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const { error } = await supabase.storage.from('attachments').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type
    });
    if (error) throwDatabaseError('Failed to upload feedback screenshot', error);
    return path;
  },

  async createScreenshotUrl(path: string): Promise<string | null> {
    const { data, error } = await supabase.storage.from('attachments').createSignedUrl(path, 300);
    if (error) return null;
    return data.signedUrl;
  },

  async listAll(filters?: {
    category?: FeedbackCategory | 'all';
    priority?: FeedbackPriority | 'all';
    status?: FeedbackStatus | 'all';
    from?: string;
    to?: string;
  }): Promise<FeedbackItem[]> {
    let query = supabase.from('feedback').select('*, feedback_reply(*)').order('created_at', { ascending: false });
    if (filters?.category && filters.category !== 'all') query = query.eq('category', filters.category);
    if (filters?.priority && filters.priority !== 'all') query = query.eq('priority', filters.priority);
    if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);
    if (filters?.from) query = query.gte('created_at', `${filters.from}T00:00:00`);
    if (filters?.to) query = query.lte('created_at', `${filters.to}T23:59:59.999`);
    const { data, error } = await query;
    if (error) throwDatabaseError('Failed to load admin feedback queue', error);
    return (data ?? []) as FeedbackItem[];
  },

  async updateAdmin(
    feedbackId: string,
    input: {
      status?: FeedbackStatus;
      assigned_to?: string | null;
      duplicate_of?: string | null;
      admin_notes?: string | null;
      closed_at?: string | null;
    }
  ): Promise<FeedbackItem> {
    const { data, error } = await supabase.from('feedback').update(input).eq('id', feedbackId).select('*').single();
    if (error) throwDatabaseError('Failed to update feedback', error);
    return data as FeedbackItem;
  },

  async reply(feedbackId: string, authorId: string, message: string, isInternal = false): Promise<FeedbackReply> {
    const { data, error } = await supabase
      .from('feedback_reply')
      .insert({ feedback_id: feedbackId, author_id: authorId, message, is_internal: isInternal })
      .select('*')
      .single();
    if (error) throwDatabaseError('Failed to reply to feedback', error);
    return data as FeedbackReply;
  }
};

