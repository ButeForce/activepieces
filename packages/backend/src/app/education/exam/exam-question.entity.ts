import { EntitySchema } from 'typeorm'
import { BaseColumnSchemaPart, ApIdSchema } from '../../database/database-common'

export type ExamQuestionSchema = {
  id: string
  created: string
  updated: string
  examId: string
  questionId: string
  position: number
  selectedIndex?: number | null
  isCorrect?: boolean | null
}

export const ExamQuestionEntity = new EntitySchema<ExamQuestionSchema>({
  name: 'exam_question',
  columns: {
    ...BaseColumnSchemaPart,
    examId: ApIdSchema,
    questionId: ApIdSchema,
    position: { type: Number },
    selectedIndex: { type: Number, nullable: true },
    isCorrect: { type: Boolean, nullable: true },
  },
  indices: [
    {
      name: 'idx_exam_question_exam_position',
      columns: ['examId', 'position'],
      unique: true,
    },
    {
      name: 'idx_exam_question_exam_question',
      columns: ['examId', 'questionId'],
      unique: true,
    },
  ],
})
