import { Arg, Ctx, Field, FieldResolver, Float, InputType, Int, Mutation, ObjectType, Query, Resolver, Root, UseMiddleware } from "type-graphql"
import { Post } from "../entities/Post";
import { MyContext } from "src/types";
import { isAuth } from "../middleware/isAuth";
import { getConnection, getRepository } from "typeorm";
import { Updoot } from "../entities/Updoot";

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
        @Arg('cursor', () => String, { nullable: true }) cursor: string | null,
        @Ctx() { req }: MyContext
    ): Promise<PostsResponse> {
        const realLimit = Math.min(50, limit);
        const realLimitPlusOne = realLimit + 1;

        const { userId } = req.session;

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

        let strVoteValue = ""; let strCursor = "";

        if (userId) strVoteValue = 
        `, (select value from updoot where "userId" = ${userId} and "postId" = p.id) "voteValue"`;

        const parameters: any[] = [];
        if (cursor) {
            strCursor = `where p."createdAt" < $1`;           
            parameters.push(new Date(parseInt(cursor)).toLocaleDateString());
        };
       

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
          ${strVoteValue}
          from post p
          inner join "user" on p."creatorId" = "user".id
          ${strCursor}
          order by p."createdAt" DESC
          limit ${realLimitPlusOne}
          `,
          parameters
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
        return Post.findOne(id, { relations: ["creator"] });
    }
 
    @Mutation(() => Post) 
    @UseMiddleware(isAuth)
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
    @UseMiddleware(isAuth)
    async updatePost(
        @Arg("id", () => Float!) id: number,
        @Arg("title", () => String, { nullable: true }) title: string,
        @Arg("text", () => String, { nullable: true }) text: string,
    ): Promise<Post | undefined> {       
           await getRepository(Post).save({id, title, text });
           return Post.findOne(id);
    }

    @Mutation(() => Boolean) 
    @UseMiddleware(isAuth)
    async deletePost(
        @Arg("id") id: number
    ): Promise<boolean> { 
       await Post.delete(id);
       return true;      
    }

    @Mutation(() => Boolean)
    @UseMiddleware(isAuth)
    async vote(
        @Arg("postId", () => Float!) postId: number,
        @Arg("value", () => Int!) value: number,
        @Ctx() { req }: MyContext
    ): Promise<boolean> {
        const { userId } = req.session;
        const updoot = await Updoot.findOne({postId, userId});

        if (updoot && value !== updoot.value) {
            await getConnection().transaction(async tm => {
                await Updoot.update(
                    { userId: updoot.userId,
                      postId: updoot.postId },
                    { value }
                );
            
                await tm.createQueryBuilder()
                .update(Post)
                .set({
                    points: () => `points + ${2*value}` 
                })
                .where("id = :id", { id: postId })
                .execute();
            });
        } else if (!updoot) {
            await getConnection().transaction(async tm => {
                await tm.insert(Updoot, {
                    userId,
                    postId,
                    value
                });
                await tm.createQueryBuilder()
                .update(Post)
                .set({
                    points: () => `points + ${value}` 
                })
                .where("id = :id", { id: postId })
                .execute();
            });
        };

        // await getConnection().transaction(async (tm) => {
        //     await tm.query(
        //       `
        // insert into updoot ("userId", "postId", value)
        // values ($1, $2, $3)
        //     `,
        //       [userId, postId, realValue]
        //     );
    
        //     await tm.query(
        //       `
        // update post
        // set points = points + $1
        // where id = $2
        //   `,
        //       [realValue, postId]
        //     );
        //   });
        // }
        
        return true;
    }
}