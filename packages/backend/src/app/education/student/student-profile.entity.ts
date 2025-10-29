import { EntitySchema } from 'typeorm'
import { BaseColumnSchemaPart, ApIdSchema } from '../../database/database-common'

export type StudentProfileSchema = {
  id: string
  created: string
  updated: string
  projectId: string
  userId: string
  grade: string
  parentEmail: string
}

export const StudentProfileEntity = new EntitySchema<StudentProfileSchema>({
  name: 'student_profile',
  columns: {
    ...BaseColumnSchemaPart,
    projectId: ApIdSchema,
    userId: ApIdSchema,
    grade: { type: String },
    parentEmail: { type: String },
  },
  indices: [
    {
      name: 'idx_student_profile_project_user',
      columns: ['projectId', 'userId'],
      unique: true,
    },
  ],
})
