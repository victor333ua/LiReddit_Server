import { MikroORM } from "@mikro-orm/core";
import { __prod__ } from './constants';
import microconfig from "./mikro-orm.config";
import express from 'express';
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { HelloResolver } from "./resolvers/hello";
import { PostsResolver } from "./resolvers/posts";
import { UsersResolver } from "./resolvers/users";

const main = async () => {
    const orm = await MikroORM.init(microconfig);
    await orm.getMigrator().up();

    const app = express();

    // app.get("/", (_, res) => {  
    //     res.send("hello");
    // });

    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers: [HelloResolver, PostsResolver, UsersResolver],
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