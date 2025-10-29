import { Static, Type } from '@sinclair/typebox'
import { BaseModelSchema } from '../common/base-model'
import { ApId } from '../common/id-generator'

export const StudentProfile = Type.Object({
  ...BaseModelSchema,
  projectId: ApId,
  userId: ApId,
  grade: Type.String(),
  parentEmail: Type.String({ format: 'email' }),
})

export type StudentProfile = Static<typeof StudentProfile>
