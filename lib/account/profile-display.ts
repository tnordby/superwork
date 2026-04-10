export type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

export function displayNameFromProfile(profile: ProfileRow | undefined | null): string {
  if (!profile) return 'Member';
  const fn = profile.first_name?.trim() || '';
  const ln = profile.last_name?.trim() || '';
  const full = `${fn} ${ln}`.trim();
  return full || profile.email?.trim() || 'Member';
}
