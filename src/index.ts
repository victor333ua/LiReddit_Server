import "reflect-metadata";
import "dotenv-safe/config";
import { COOKIE_NAME, __prod__ } from './constants';
import express from 'express';
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { HelloResolver } from "./resolvers/hello";
import { PostsResolver } from "./resolvers/posts";
import { UsersResolver } from "./resolvers/users";

import Redis from 'ioredis';
import session from 'express-session';
import connectRedis from 'connect-redis';
import { MyContext } from "./types";
import { debug } from "console";
import cors from 'cors';
import {createConnection} from 'typeorm';
import { Post } from "./entities/Post";
import { User } from "./entities/User";
import { Updoot } from "./entities/Updoot";
import path from 'path';
import { userLoader } from "./utils/createUserLoader";
import { updootLoader } from "./utils/createUpdootLoader";

const main = async () => {
    const conn = await createConnection({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        logging: true,
        // synchronize: true,
        migrations: [path.join(__dirname, "./migrations/*")],
        entities: [Post, User, Updoot]
    });
    
    await conn.runMigrations();

    // await Post.delete({});

    const app = express();

 // start db : redis-server from cli, path already installed   
    const RedisStore = connectRedis(session);
    const redis = new Redis(process.env.REDIS_URL);
    redis.on("error", console.error);

    app.set("proxy", 1);

    app.use(
        cors({
            origin: process.env.CORS_ORIGIN,
            credentials: true,
        })
    )

    app.use(
        session({
            name: COOKIE_NAME,
            store: new RedisStore({ 
                client: redis,
                disableTTL: true,   // Disables key expiration completely
                disableTouch: true // Disables re-saving and resetting the TTL when using touch
            }),
            cookie: {
                maxAge: 1000 * 60 * 60 * 24 * 365,
                httpOnly: true,
                sameSite: 'lax', // csrf
                secure: __prod__, // cookie only works in htpps
            },
            saveUninitialized: false,
            secret: process.env.SESSION_SECRET,
            resave: false,
        })
    );

    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers: [HelloResolver, PostsResolver, UsersResolver],
            validate: false
        }),
        context: ({ req, res }) : MyContext => ({
             req, res, redis, userLoader, updootLoader }),
        
    });

    apolloServer.applyMiddleware({ 
        app,
        cors: false,
     });

    const server = app.listen(parseInt(process.env.PORT), () => {
        console.log("server started on localhost:4001");
    })

    process.on('SIGTERM', () => {
        debug('SIGTERM signal received: closing HTTP server')
        server.close(() => {
            debug('HTTP server closed')
        })
    })
};

main().catch((err) => {
    console.error(err);
});