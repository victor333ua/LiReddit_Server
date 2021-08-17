import { Connection, EntityManager, IDatabaseDriver } from "@mikro-orm/core";
import { Request, Response } from "express";
import session from "express-session";
import { Redis } from "ioredis";

declare module 'express-session' {
    interface SessionData {
      userId: number;
    }
};

export type MyContext = {
    em: EntityManager<IDatabaseDriver<Connection>>;
    req: Request  & { session: session.Session & Partial<session.SessionData> };
    res: Response;
    redis: Redis;
};