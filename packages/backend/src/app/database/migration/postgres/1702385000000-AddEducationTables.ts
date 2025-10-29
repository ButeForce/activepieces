import { MigrationInterface, QueryRunner } from 'typeorm'
import { logger } from '../../../helper/logger'

export class AddEducationTables1702385000000 implements MigrationInterface {
  name = 'AddEducationTables1702385000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "subject" (
        "id" character varying(21) PRIMARY KEY NOT NULL,
        "created" timestamp with time zone NOT NULL DEFAULT now(),
        "updated" timestamp with time zone NOT NULL DEFAULT now(),
        "name" character varying NOT NULL,
        "grade" character varying NOT NULL,
        "projectId" character varying(21) NOT NULL
      );
    `)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_subject_project_name_grade" ON "subject" ("projectId","name","grade");
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "question" (
        "id" character varying(21) PRIMARY KEY NOT NULL,
        "created" timestamp with time zone NOT NULL DEFAULT now(),
        "updated" timestamp with time zone NOT NULL DEFAULT now(),
        "projectId" character varying(21) NOT NULL,
        "subjectId" character varying(21) NOT NULL,
        "teacherId" character varying(21) NOT NULL,
        "text" character varying NOT NULL,
        "choices" jsonb NOT NULL,
        "correctIndex" integer NOT NULL,
        "difficulty" character varying NOT NULL
      );
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_question_subject_difficulty" ON "question" ("subjectId","difficulty");
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_question_project_subject" ON "question" ("projectId","subjectId");
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "exam" (
        "id" character varying(21) PRIMARY KEY NOT NULL,
        "created" timestamp with time zone NOT NULL DEFAULT now(),
        "updated" timestamp with time zone NOT NULL DEFAULT now(),
        "projectId" character varying(21) NOT NULL,
        "studentId" character varying(21) NOT NULL,
        "subjectId" character varying(21) NOT NULL,
        "difficulty" character varying NOT NULL,
        "status" character varying NOT NULL,
        "startedAt" timestamp with time zone,
        "finishedAt" timestamp with time zone,
        "scoreCorrect" integer NOT NULL DEFAULT 0,
        "scoreTotal" integer NOT NULL DEFAULT 0
      );
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_exam_student" ON "exam" ("studentId");
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "exam_question" (
        "id" character varying(21) PRIMARY KEY NOT NULL,
        "created" timestamp with time zone NOT NULL DEFAULT now(),
        "updated" timestamp with time zone NOT NULL DEFAULT now(),
        "examId" character varying(21) NOT NULL,
        "questionId" character varying(21) NOT NULL,
        "position" integer NOT NULL,
        "selectedIndex" integer,
        "isCorrect" boolean
      );
    `)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_exam_question_exam_position" ON "exam_question" ("examId","position");
    `)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_exam_question_exam_question" ON "exam_question" ("examId","questionId");
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "student_profile" (
        "id" character varying(21) PRIMARY KEY NOT NULL,
        "created" timestamp with time zone NOT NULL DEFAULT now(),
        "updated" timestamp with time zone NOT NULL DEFAULT now(),
        "projectId" character varying(21) NOT NULL,
        "userId" character varying(21) NOT NULL,
        "grade" character varying NOT NULL,
        "parentEmail" character varying NOT NULL
      );
    `)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_student_profile_project_user" ON "student_profile" ("projectId","userId");
    `)

    logger.info('AddEducationTables1702385000000 up')
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_student_profile_project_user";`)
    await queryRunner.query(`DROP TABLE IF EXISTS "student_profile";`)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_exam_question_exam_question";`)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_exam_question_exam_position";`)
    await queryRunner.query(`DROP TABLE IF EXISTS "exam_question";`)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_exam_student";`)
    await queryRunner.query(`DROP TABLE IF EXISTS "exam";`)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_question_project_subject";`)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_question_subject_difficulty";`)
    await queryRunner.query(`DROP TABLE IF EXISTS "question";`)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_subject_project_name_grade";`)
    await queryRunner.query(`DROP TABLE IF EXISTS "subject";`)
    logger.info('AddEducationTables1702385000000 down')
  }
}
