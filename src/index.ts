import "reflect-metadata";
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

const main = async () => {
    await createConnection({
        type: 'postgres',
        database: 'lireddit2',
        username: "postgres",
        password: "victory3",
        logging: true,
        synchronize: true,
        entities: [Post, User]
    });

    const app = express();

 // start db : redis-server from cli, path already installed   
    const RedisStore = connectRedis(session);
    const redis = new Redis();
    redis.on("error", console.error)

    app.use(
        cors({
            origin: "http://localhost:3000",
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
            secret: 'jdfklqle1l1',
            resave: false,
        })
    );

    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers: [HelloResolver, PostsResolver, UsersResolver],
            validate: false
        }),
        context: ({ req, res }) : MyContext => ({ req, res, redis }),
        // tracing: true
    });

    apolloServer.applyMiddleware({ 
        app,
        cors: false,
     });

    const server = app.listen(4001, () => {
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