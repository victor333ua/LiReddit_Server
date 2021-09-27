import {MigrationInterface, QueryRunner} from "typeorm";

export class ResetLinkColumn1632755477423 implements MigrationInterface {
    name = 'ResetLinkColumn1632755477423'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "public"."user" ADD "resetLink" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "public"."user" DROP COLUMN "resetLink"`);
    }

}
