import { __prod__ } from "./constants";
import { MikroORM } from '@mikro-orm/core';

console.log(`dirname = ${__dirname}`);

export default {
    migrations: {
        path: `${__dirname}/migrations`, // path to the folder with migrations
        pattern: /^[\w-]+\d+\.[jt]s$/, // regex pattern for the migration files
    },
     entities: ['./dist/entities/*.js'], // path to your JS entities (dist), relative to `baseDir`
     entitiesTs: ['./src/entities/*.ts'],
    // entities: [Post],
    baseDir: process.cwd(),
    dbName: "lireddit",
    user: "postgres",
    password: "victory3",
    type: "postgresql",
    debug: !__prod__
} as Parameters<typeof MikroORM.init>[0];