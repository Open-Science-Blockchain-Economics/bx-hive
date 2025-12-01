export type UserRole = 'experimenter' | 'subject';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  createdAt: number;
}