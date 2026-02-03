import type { User } from '@/types/user.types';

const AVATAR_SERVICE = 'https://i.pravatar.cc/150';

const PRESET_USERS: User[] = [
  {
    id: 'user-1',
    name: 'Martin Merschroth',
    email: 'martin@jam.dev',
    avatar: `${AVATAR_SERVICE}?u=martin`,
  },
  {
    id: 'user-2',
    name: 'Chris',
    email: 'chris@jam.dev',
    avatar: `${AVATAR_SERVICE}?u=chris`,
  },
  {
    id: 'user-3',
    name: 'Dani',
    email: 'dani@jam.dev',
    avatar: `${AVATAR_SERVICE}?u=dani`,
  },
  {
    id: 'user-4',
    name: 'Alex',
    email: 'alex@jam.dev',
    avatar: `${AVATAR_SERVICE}?u=alex`,
  },
  {
    id: 'user-5',
    name: 'Sarah',
    email: 'sarah@jam.dev',
    avatar: `${AVATAR_SERVICE}?u=sarah`,
  },
];

export function getPresetUsers(): User[] {
  return PRESET_USERS;
}

export function getUserById(id: string): User | undefined {
  return PRESET_USERS.find((u) => u.id === id);
}

export function getCreator(): User {
  return PRESET_USERS[0];
}

export function getRandomUser(excludeId?: string): User {
  const available = excludeId
    ? PRESET_USERS.filter((u) => u.id !== excludeId)
    : PRESET_USERS;
  return available[Math.floor(Math.random() * available.length)];
}
