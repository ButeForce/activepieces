import { Static, Type } from '@sinclair/typebox'
import { BaseModelSchema } from '../common/base-model'
import { ApId } from '../common/id-generator'
import { Difficulty } from './difficulty'

export type QuestionId = string

export const Question = Type.Object({
  ...BaseModelSchema,
  subjectId: ApId,
  projectId: ApId,
  teacherId: ApId,
  text: Type.String(),
  choices: Type.Array(Type.String(), { minItems: 4, maxItems: 4 }),
  correctIndex: Type.Integer({ minimum: 0, maximum: 3 }),
  difficulty: Difficulty,
})

export type Question = Static<typeof Question>

export const CreateQuestionRequest = Type.Object({
  projectId: ApId,
  subjectId: ApId,
  text: Type.String(),
  choices: Type.Array(Type.String(), { minItems: 4, maxItems: 4 }),
  correctIndex: Type.Integer({ minimum: 0, maximum: 3 }),
  difficulty: Difficulty,
})

export type CreateQuestionRequest = Static<typeof CreateQuestionRequest>

export const UpdateQuestionRequest = Type.Partial(Type.Object({
  text: Type.String(),
  choices: Type.Array(Type.String(), { minItems: 4, maxItems: 4 }),
  correctIndex: Type.Integer({ minimum: 0, maximum: 3 }),
  difficulty: Difficulty,
}))

export type UpdateQuestionRequest = Static<typeof UpdateQuestionRequest>
