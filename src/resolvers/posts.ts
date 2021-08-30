import { Arg, Ctx, Field, FieldResolver, InputType, Int, Mutation, ObjectType, Query, Resolver, Root, UseMiddleware } from "type-graphql"
import { Post } from "../entities/Post";
import { MyContext } from "src/types";
import { isAuth } from "../middleware/isAuth";
import { getConnection } from "typeorm";
import { User } from "../entities/User";

@InputType()
class PostInput {
  @Field()
  title: string;
  @Field()
  text: string;
}

@ObjectType()
class PostsResponse {
    @Field(() => [Post])
    posts: Post[];
    @Field()
    hasMore: boolean
}

@Resolver(Post)
export class PostsResolver {
    @FieldResolver(() => String)
    textSnippet(@Root() root: Post) {
        return root.text.slice(0, 50);
    }

    // @FieldResolver(() => User)
    // creator(@Root() root: Post): Promise<User | undefined> {
    //     return User.findOne(root.creatorId);
    // }
    
    @Query(() => PostsResponse)
    async posts(
        @Arg('limit', () => Int) limit: number,
        @Arg('cursor', () => String, { nullable: true }) cursor: string | null
    ): Promise<PostsResponse> {
        const realLimit = Math.min(50, limit);
        const realLimitPlusOne = realLimit + 1;

        //don't work due to 'user' is service word in postgre
        // const qb = getConnection()
        // .getRepository(Post)
        // .createQueryBuilder("p") 
        // .innerJoinAndSelect("p.creator", "u")  
        // .orderBy('p."createdAt"', "DESC")
        // .take(realLimitPlusOne);

        // if (cursor) {
        //     qb.where('p."createdAt" < :cursor', { cursor: new Date(parseInt(cursor)) })
        // }

        // const posts = await qb.getMany();

        const replacements: any[] = [realLimitPlusOne];
        if (cursor) {
            replacements.push(new Date(parseInt(cursor)));
        }

        const posts = await getConnection().query(
          `
          select p.*, 
          json_build_object(
              'id', "user".id,
              'username', "user".username,
              'email', "user".email,
              'createdAt', "user"."createdAt",
              'updatedAt', "user"."updatedAt"
          ) creator
          from post p
          inner join "user" on p."creatorId" = "user".id
          ${cursor ? 'where p."createdAt" < $2' : ""}
          order by p."createdAt" DESC
          limit $1
          `,
          replacements  
        );
        
        return {
           posts: posts.slice(0, realLimit),
           hasMore: posts.length === realLimitPlusOne
        }
    }

    @Query(() => Post, { nullable: true })
    post(
        @Arg("id") id: number
    ): Promise<Post | undefined> {
        return Post.findOne(id);
    }

    @UseMiddleware(isAuth)
    @Mutation(() => Post) 
        async createPost(
            @Arg("input") input: PostInput,
            @Ctx() { req }: MyContext
        ): Promise<Post> {

            return Post.create({
                ...input,
                creatorId: req.session.userId
            }).save();
    }

    @Mutation(() => Post, { nullable: true }) 
    async updatePost(
        @Arg("id") id: number,
        @Arg("title", () => String, { nullable: true }) title: string,
    ): Promise<Post | null> { 
        const post = await Post.findOne(id);
        if (!post) return null;
        if (typeof title !== undefined) {
           await Post.update({id}, {title})
        }
        return post;
    }

    @Mutation(() => Boolean) 
    async deletePost(
        @Arg("id") id: number
    ): Promise<boolean> { 
       await Post.delete(id);
       return true;      
    }
}