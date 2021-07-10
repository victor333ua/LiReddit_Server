import { Arg, Ctx, Field, InputType, Mutation, ObjectType, Resolver } from "type-graphql"
import argon2 from 'argon2';
import { MyContext } from "../types";
import { User } from "../entities/User";

@InputType()
class UsernamePasswordInput {
    @Field()
    username: string
    @Field()
    password: string
};

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
    @Mutation(() => UserResponse)
    async register(
        @Arg('options') options: UsernamePasswordInput,
        @Ctx() { em }: MyContext
    ): Promise<UserResponse> {
        if(options.username.length <= 2) {
            return {
                errors: [{
                    field: "username",
                    message: "length must be greater 2"
                }]
            };
        }
        if(options.password.length <= 2) {
            return {
                errors: [{
                    field: "password",
                    message: "length must be greater 2"
                }]
            }
        }

        const hashPassword = await argon2.hash(options.password);
        const user = em.create(User, {
             username: options.username,
             password: hashPassword 
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
        return { user };
    }

    @Mutation(() => UserResponse)
    async login(
        @Arg('options') options: UsernamePasswordInput,
        @Ctx() { em }: MyContext
    ): Promise<UserResponse> {
        const user = await em.findOne(User, { username: options.username });
        if(!user) {
            return {
                errors: [{
                    field: 'username',
                    message: "that username doesn't exist"
                }]
            }
        }
        const valid = await argon2.verify(user.password, options.password);
        if(!valid) {
            return {
                errors: [{
                    field: 'password',
                    message: "incorrect password"
                }]
            }
        }
        return { user };
    }
}