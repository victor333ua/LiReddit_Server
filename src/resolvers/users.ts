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
    async me( @Ctx() { req }: MyContext ) {
        const userId = req.session.userId;
        if (!userId) {
            return null;
        }
        return await User.findOne(userId);
    }

    @Mutation(() => UserResponse)
    async register(
        @Arg('options') options: UsernamePasswordInput,
        @Ctx() { req }: MyContext
    ): Promise<UserResponse> {
       
        const errors = validateRegister(options);
        if (errors) return { errors };

        const hashPassword = await argon2.hash(options.password);
        let user;
        try {
            user = await User.create({
                username: options.username,
                password: hashPassword,
                email: options.email 
           }).save();
            req.session.userId = user.id;
            return { user };
        } catch(err) {
            let message;
            // duplicate username error
            if (err.code === "23505") 
                message = "username already taken"
            else 
                message = err.detail;

            return {
                errors: [
                    {
                        field: "username",
                        message
                    }
                ]
            }    
        }
    }

    @Mutation(() => UserResponse)
    async login(
        @Arg('usernameOrEmail') usernameOrEmail: string,
        @Arg('password') password: string,
        @Ctx() { req }: MyContext
    ): Promise<UserResponse> {
        const user = await User.findOne({ where: 
            usernameOrEmail.includes("@")
            ? { email: usernameOrEmail }
            : { username: usernameOrEmail }
        });

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
        @Ctx() { redis }: MyContext
    ): Promise<UserResponse> {
        const user = await User.findOne({ where: 
            usernameOrEmail.includes("@")
            ? { email: usernameOrEmail }
            : { username: usernameOrEmail }
        }); 

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
        @Ctx() { redis }: MyContext
    ): Promise<Boolean> {
        const key = FORGET_PASSWORD_PREFIX + token;
        const userId = await redis.get(key);
        if (!userId) return false;

        const userIdNum = Number(userId);
        const user = await User.findOne(userIdNum);
        if (!user) return false;

        try {
            await User.update(
                { id: userIdNum },
                { password: await argon2.hash(password) }
            );
            await redis.del(key);
        } catch(err) {
            console.log(err);
            return false;
        }
        return true;
    }
};