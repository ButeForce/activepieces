import { Static, Type } from '@sinclair/typebox'
import { BaseModelSchema } from '../common/base-model'
import { ApId } from '../common/id-generator'

export type SubjectId = string

export const Subject = Type.Object({
  ...BaseModelSchema,
  name: Type.String(),
  grade: Type.String(),
  projectId: ApId,
})

export type Subject = Static<typeof Subject>
