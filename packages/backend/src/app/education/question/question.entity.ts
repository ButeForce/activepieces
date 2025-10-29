import { EntitySchema } from 'typeorm'
import { BaseColumnSchemaPart, ApIdSchema, JSONB_COLUMN_TYPE, TIMESTAMP_COLUMN_TYPE } from '../../database/database-common'

export type QuestionSchema = {
  id: string
  created: string
  updated: string
  projectId: string
  subjectId: string
  teacherId: string
  text: string
  choices: string[]
  correctIndex: number
  difficulty: string
}

export const QuestionEntity = new EntitySchema<QuestionSchema>({
  name: 'question',
  columns: {
    ...BaseColumnSchemaPart,
    projectId: ApIdSchema,
    subjectId: ApIdSchema,
    teacherId: ApIdSchema,
    text: { type: String },
    choices: { type: JSONB_COLUMN_TYPE },
    correctIndex: { type: Number },
    difficulty: { type: String },
  },
  indices: [
    {
      name: 'idx_question_subject_difficulty',
      columns: ['subjectId', 'difficulty'],
    },
    {
      name: 'idx_question_project_subject',
      columns: ['projectId', 'subjectId'],
    },
  ],
  relations: {
    // kept simple; rely on ids
  },
})
