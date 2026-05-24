import { IUserRepository, User } from '../../interfaces/IUserRepository';
import { UserModel } from './schemas/UserSchema';

export class MongoUserRepository implements IUserRepository {

  async findByEmail(email: string): Promise<User | null> {
    const userDoc = await UserModel.findOne({ email }).exec();
    if (!userDoc) return null;

    return {
      id: userDoc._id.toString(),
      email: userDoc.email,
      passwordHash: userDoc.passwordHash,
      role: userDoc.role,
      createdAt: userDoc.createdAt
    };
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const newUser = new UserModel(userData);
    const savedUser = await newUser.save();

    return {
      id: savedUser._id.toString(),
      email: savedUser.email,
      passwordHash: savedUser.passwordHash,
      role: savedUser.role,
      createdAt: savedUser.createdAt
    };
  }
}