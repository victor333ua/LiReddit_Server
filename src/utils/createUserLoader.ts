import { User } from "../entities/User";
import DataLoader from 'dataloader';

const batchLoader = async (userIds: readonly number[]): Promise<User[]> => {
    const users = await User.findByIds(userIds as number[]);

    const usersObj: Record<number, User> = {};
    users.forEach(u => usersObj[u.id] = u);
    return userIds.map(id => usersObj[id]);
};

export const userLoader = new DataLoader<number, User>(batchLoader);