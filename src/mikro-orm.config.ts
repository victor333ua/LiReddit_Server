import { __prod__ } from "./constants";
import { MikroORM } from '@mikro-orm/core';
import path from 'path';

export default {
    migrations: {
        path: path.join(__dirname, './migrations'), // path to the folder with migrations
        pattern: /^[\w-]+\d+\.[tj]s$/, // regex pattern for the migration files
    },
     entities: ['./dist/entities/*.js'], // path to your JS entities (dist), relative to `baseDir`
     entitiesTs: ['./src/entities/*.ts'],
    // entities: [Post],
    dbName: "lireddit",
    user: "postgres",
    password: "victory3",
    type: "postgresql",
    debug: !__prod__
} as Parameters<typeof MikroORM.init>[0];