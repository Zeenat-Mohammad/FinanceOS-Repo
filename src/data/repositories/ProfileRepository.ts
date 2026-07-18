import { supabase } from '@/data/supabase/client';
import type { Profile } from '@/types/finance';
import { throwDatabaseError } from './repositoryError';

const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

function extensionForMime(mime: string) {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

async function assertImageMagicBytes(file: File) {
  const buffer = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isWebp =
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;
  if (!isJpeg && !isPng && !isWebp) {
    throw new Error('Avatar must be a valid JPEG, PNG, or WebP image.');
  }
}

export const ProfileRepository = {
  async getCurrentProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();

    if (error) {
      throwDatabaseError('Failed to load profile', error);
    }

    return data as Profile | null;
  },

  async upsertProfile(profile: {
    id: string;
    full_name?: string | null;
    country?: string | null;
    currency?: string;
    locale?: string;
    timezone?: string;
    salary_frequency?: string | null;
    family_size?: number | null;
    tax_preferences?: unknown;
    onboarding_step?: string | null;
    onboarding_completed?: boolean;
    avatar_url?: string | null;
  }): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .upsert(
        {
          currency: 'USD',
          locale: 'en-US',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          onboarding_completed: false,
          ...profile
        },
        { onConflict: 'id' }
      )
      .select('*')
      .single();

    if (error) {
      throwDatabaseError('Failed to save profile', error);
    }

    return data as Profile;
  },

  async updateOnboardingProgress(
    userId: string,
    progress: { onboarding_step?: string | null; onboarding_completed?: boolean }
  ): Promise<Profile> {
    const { data, error } = await supabase.from('profiles').update(progress).eq('id', userId).select('*').single();

    if (error) {
      throwDatabaseError('Failed to update onboarding progress', error);
    }

    return data as Profile;
  },

  async updateProfile(
    userId: string,
    profile: {
      full_name?: string | null;
      country?: string | null;
      insights_country?: string | null;
      currency?: string;
      locale?: string;
      timezone?: string;
      tax_preferences?: unknown;
      avatar_url?: string | null;
    }
  ): Promise<Profile> {
    const { data, error } = await supabase.from('profiles').update(profile).eq('id', userId).select('*').single();

    if (error) {
      throwDatabaseError('Failed to update profile', error);
    }

    return data as Profile;
  },

  async ensureProfile(input: {
    id: string;
    email?: string | null;
    full_name?: string | null;
    country?: string | null;
    currency?: string;
  }): Promise<Profile> {
    const existing = await this.getCurrentProfile(input.id);
    if (existing) return existing;

    return this.upsertProfile({
      id: input.id,
      full_name: input.full_name ?? input.email?.split('@')[0] ?? 'Finlo User',
      country: input.country,
      currency: input.currency ?? 'USD',
      locale: navigator.language || 'en-US',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      onboarding_step: 'personalDetails',
      onboarding_completed: false
    });
  },

  async uploadAvatar(userId: string, file: File): Promise<Profile> {
    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      throw new Error('Only JPEG, PNG, or WebP images are allowed.');
    }
    if (file.size > MAX_AVATAR_BYTES) {
      throw new Error('Avatar must be 5 MB or smaller.');
    }
    await assertImageMagicBytes(file);

    const ext = extensionForMime(file.type);
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: '3600'
    });

    if (uploadError) {
      throwDatabaseError('Failed to upload avatar', uploadError);
    }

    // Persist storage path only — signed URLs expire; UI resolves on load.
    const profile = await this.updateProfile(userId, { avatar_url: path });
    await SecurityRepository.logEvent(userId, 'avatar_upload', { path, bytes: file.size, mime: file.type }).catch(() => undefined);
    return profile;
  },

  async resolveAvatarUrl(avatarUrl: string | null | undefined): Promise<string | null> {
    if (!avatarUrl) return null;
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://') || avatarUrl.startsWith('blob:')) {
      return avatarUrl;
    }
    const { data, error } = await supabase.storage.from('avatars').createSignedUrl(avatarUrl, 60 * 60);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  }
};

/** Lightweight security event logger (RLS-scoped). */
export const SecurityRepository = {
  async logEvent(
    userId: string | null,
    eventType:
      | 'login_success'
      | 'login_failure'
      | 'password_change'
      | 'password_reset_request'
      | 'avatar_upload'
      | 'profile_update'
      | 'suspicious_activity',
    metadata: Record<string, unknown> = {}
  ) {
    if (userId) {
      try {
        await supabase.from('security_events').insert({
          user_id: userId,
          event_type: eventType,
          metadata,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 240) : null
        });
      } catch {
        // Table may not exist yet before migration — ignore
      }
    }

    try {
      const key = `finlo.security.${userId ?? 'anon'}`;
      const prev = JSON.parse(localStorage.getItem(key) ?? '[]') as Array<{ type: string; at: string }>;
      const next = [{ type: eventType, at: new Date().toISOString() }, ...prev].slice(0, 20);
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // ignore
    }
  },

  readLocalEvents(userId: string) {
    try {
      return JSON.parse(localStorage.getItem(`finlo.security.${userId}`) ?? '[]') as Array<{ type: string; at: string }>;
    } catch {
      return [];
    }
  }
};
