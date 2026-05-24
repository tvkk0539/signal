export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: 'ADMIN' | 'USER';
  createdAt: Date;
}

export interface IUserRepository {
  /**
   * Finds a user by their email address.
   * @param email The email address to search for.
   * @returns The User object if found, otherwise null.
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Creates a new user in the database.
   * @param user The user object to insert.
   * @returns The created User object with its generated ID.
   */
  createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User>;
}