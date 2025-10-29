import { EntitySchema } from 'typeorm'
import { BaseColumnSchemaPart, ApIdSchema } from '../../database/database-common'

export type SubjectSchema = {
  id: string
  created: string
  updated: string
  name: string
  grade: string
  projectId: string
}

export const SubjectEntity = new EntitySchema<SubjectSchema>({
  name: 'subject',
  columns: {
    ...BaseColumnSchemaPart,
    name: { type: String },
    grade: { type: String },
    projectId: ApIdSchema,
  },
  indices: [
    {
      name: 'idx_subject_project_name_grade',
      columns: ['projectId', 'name', 'grade'],
      unique: true,
    },
  ],
})
