import { MikroORM } from "@mikro-orm/core";
import { __prod__ } from './constants';
import microconfig from "./mikro-orm.config";
import express from 'express';
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { HelloResolver } from "./resolvers/hello";
import { PostsResolver } from "./resolvers/posts";
import { UsersResolver } from "./resolvers/users";

import redis from 'redis';
import session from 'express-session';
import connectRedis from 'connect-redis';
import { MyContext } from "./types";
import { debug } from "console";
import cors from 'cors';

const main = async () => {
    const orm = await MikroORM.init(microconfig);
    await orm.getMigrator().up();

    const app = express();

    const RedisStore = connectRedis(session);
    const redisClient = redis.createClient();
    redisClient.on("error", console.error)

    app.use(
        cors({
            origin: "http://localhost:3000",
            credentials: true,
        })
    )

    app.use(
    session({
        name: 'qid',
        store: new RedisStore({ 
            client: redisClient,
            disableTTL: true,
            disableTouch: true
        }),
        cookie: {
            maxAge: 1000 * 60 *60 *24 *365,
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
        context: ({ req, res }) : MyContext => ({ em: orm.em, req, res }),
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