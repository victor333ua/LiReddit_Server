import { Arg, Ctx, Field, Mutation, ObjectType, Query, Resolver } from "type-graphql"
import argon2 from 'argon2';
import { MyContext } from "../types";
import { User } from "../entities/User";
import { COOKIE_NAME } from "../constants";
import { UsernamePasswordInput } from "./UsernamePasswordInput";
import { validateRegister } from './../utils/validateRegister';
import { sendEmail } from "./../utils/sendEmail";
import {v4} from 'uuid';
import { FORGET_PASSWORD_PREFIX } from './../constants';
import { StringDecoder } from "node:string_decoder";

@ObjectType()
class FieldError {
    @Field()
    field: string;
    @Field()
    message: string;
}

@ObjectType()
class UserResponse {
    @Field(() => [FieldError], { nullable: true })
    errors?: FieldError[]
    @Field(() => User, { nullable: true })
    user?: User   
}

@Resolver()
export class UsersResolver {
    @Query(() => User, { nullable: true })
    async me( @Ctx() { em, req }: MyContext ) {
        const userId = req.session.userId;
        if (!userId) {
            return null;
        }
        const user = await em.findOne(User, { id: userId });
        return user;
    }

    @Mutation(() => UserResponse)
    async register(
        @Arg('options') options: UsernamePasswordInput,
        @Ctx() { em, req }: MyContext
    ): Promise<UserResponse> {
       
        const errors = validateRegister(options);
        if (errors) return { errors };

        const hashPassword = await argon2.hash(options.password);
        const user = em.create(User, {
             username: options.username,
             password: hashPassword,
             email: options.email 
        });
        try {
            await em.persistAndFlush(user);
        } catch(err) {
            // duplicate username error
            if (err.code === "23505") {
                return {
                    errors: [
                        {
                            field: "username",
                            message: "username already taken"
                        }
                    ]
                }
            }
        }
        req.session.userId = user.id;
        return { user };
    }

    @Mutation(() => UserResponse)
    async login(
        @Arg('usernameOrEmail') usernameOrEmail: string,
        @Arg('password') password: string,
        @Ctx() { em, req }: MyContext
    ): Promise<UserResponse> {
        const user = await em.findOne(User,
            usernameOrEmail.includes("@")
            ? { email: usernameOrEmail }
            : { username: usernameOrEmail }
        );
        if(!user) {
            return {
                errors: [{
                    field: "usernameOrEmail",
                    message: "that username doesn't exist"
                }]
            }
        }
        const valid = await argon2.verify(user.password, password);
        if(!valid) {
            return {
                errors: [{
                    field: 'password',
                    message: "incorrect password"
                }]
            }
        }

        req.session.userId = user.id;

        return { user };
    }

    @Mutation(() => Boolean)
    async logout(
        @Ctx() { req, res }: MyContext
    ): Promise<Boolean> {
        return new Promise(resolve => {
            req.session.destroy(err => {
                res.clearCookie(COOKIE_NAME);
                if (err) {
                    console.log(err);
                    resolve(false);
                    return;
                }
                resolve(true);
            })
        })
    }

    @Mutation(() => UserResponse)
    async forgotPassword(
        @Arg("usernameOrEmail") usernameOrEmail: string,
        @Ctx() { em, redis }: MyContext
    ): Promise<UserResponse> {
        const user = await em.findOne(User,
            usernameOrEmail.includes("@")
            ? { email: usernameOrEmail }
            : { username: usernameOrEmail }
        );        
        if(!user) {
            return {
                errors: [{
                    field: "usernameOrEmail",
                    message: "that username doesn't exist"
                }]
            }
        };
        const token = v4();
        await redis.set(
            FORGET_PASSWORD_PREFIX + token,
            user.id, 
            'ex', 
            1000 * 60 * 60 * 24 * 3
        );
        const href = `http://localhost:3000/resetPassword/${token}`

        const isSuccess = await sendEmail(
            user.email,
            "<div>" +
            "visit the page and set new password  " +
            `<a href=${href}>Reset Password</a>` +
            "</div>"
        );

        if (!isSuccess) {
            return {
                errors: [{
                    field: "failEmail",
                    message: ""
                }]
            }
        };

        return { user };
    }

    @Mutation(()=> Boolean)
    async resetPassword(
        @Arg("token") token: string,
        @Arg("password") password: string,
        @Ctx() { em, redis }: MyContext
    ): Promise<Boolean> {
        const key = FORGET_PASSWORD_PREFIX + token;
        const userId = await redis.get(key);
        if (!userId) return false;
        const user = await em.findOne(User, { id: Number(userId) });
        if (!user) return false;

        const hashPassword = await argon2.hash(password);
        user.password = hashPassword;
        try {
            await em.persistAndFlush(user);
            await redis.del(key);
        } catch(err) {
            console.log(err);
            return false;
        }
        return true;
    }
};