import { BaseEntity, Column, CreateDateColumn, Entity, ManyToOne, PrimaryColumn, UpdateDateColumn } from "typeorm";
import { Field, ObjectType } from "type-graphql";
import { Post } from "./Post";
import { User } from "./User";

@ObjectType()
@Entity()
export class Updoot extends BaseEntity {

  @Field()
  @Column({ type: "int" })
  value: number;
  
  @Field()
  @PrimaryColumn()
  userId: number;

  @Field()
  @ManyToOne(() => User, (user) => user.updoots, {
    onDelete: 'CASCADE'
  })
  user: User;

  @Field()
  @PrimaryColumn()
  postId: number;

  @ManyToOne(() => Post, (post) => post.updoots, {
    onDelete: 'CASCADE'
  })
  post: Post;

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date;

};