import { MikroORM } from "@mikro-orm/core";
import { __prod__ } from './constants';
import { Post } from "./entities/Post";
import microconfig from "./mikro-orm.config";
import express from 'express';
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { HelloResolver } from "./resolvers/hello";
import { PostsResolver } from "./resolvers/posts";

const main = async () => {
    const orm = await MikroORM.init(microconfig);
    await orm.getMigrator().up();

    // const post = orm.em.create(Post, {title: 'my first post'});
    // await orm.em.persistAndFlush(post);

    // console.log('---------------------sql2---------------------');
    // await orm.em.nativeInsert(Post, {title: 'my first post 2'});

    // const posts = await orm.em.find(Post, {});
    // console.log(posts);

    const app = express();

    // app.get("/", (_, res) => {  
    //     res.send("hello");
    // });

    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers: [HelloResolver, PostsResolver],
            validate: false
        }),
        context: () => ({ em: orm.em })
    });

    apolloServer.applyMiddleware({ app });

    app.listen(4000, () => {
        console.log("server started on localhost:4000");
    })
};

main().catch((err) => {
    console.error(err);
});