import { Updoot } from "../entities/Updoot";
import DataLoader from 'dataloader';

type Key = {
    userId: number,
    postId: number
};

const batchLoader = async (keys: readonly Key[]): Promise<Updoot[]> => {
    const updoots = await Updoot.findByIds(keys as Key[]);

    const updootsObj: Record<string, Updoot> = {};
    updoots.forEach(u => updootsObj[`${u.postId} | ${u.userId}`] = u);
    return keys.map(key => updootsObj[`${key.postId} | ${key.userId}`]);
};

export const updootLoader = new DataLoader<Key, Updoot>(batchLoader);