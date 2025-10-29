import { EntitySchema } from 'typeorm'
import { BaseColumnSchemaPart, ApIdSchema, TIMESTAMP_COLUMN_TYPE } from '../../database/database-common'

export type ExamSchema = {
  id: string
  created: string
  updated: string
  projectId: string
  studentId: string
  subjectId: string
  difficulty: string
  status: string
  startedAt?: string
  finishedAt?: string
  scoreCorrect: number
  scoreTotal: number
}

export const ExamEntity = new EntitySchema<ExamSchema>({
  name: 'exam',
  columns: {
    ...BaseColumnSchemaPart,
    projectId: ApIdSchema,
    studentId: ApIdSchema,
    subjectId: ApIdSchema,
    difficulty: { type: String },
    status: { type: String, default: 'GENERATED' },
    startedAt: { type: TIMESTAMP_COLUMN_TYPE, nullable: true },
    finishedAt: { type: TIMESTAMP_COLUMN_TYPE, nullable: true },
    scoreCorrect: { type: Number, default: 0 },
    scoreTotal: { type: Number, default: 0 },
  },
  indices: [
    {
      name: 'idx_exam_student',
      columns: ['studentId'],
    },
  ],
})
