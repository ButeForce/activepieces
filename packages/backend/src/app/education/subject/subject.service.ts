import { databaseConnection } from '../../database/database-connection'
import { SubjectEntity, SubjectSchema } from './subject.entity'
import { apId, SeekPage } from '@activepieces/shared'
import { paginationHelper } from '../../helper/pagination/pagination-utils'

const repo = databaseConnection.getRepository(SubjectEntity)

export const subjectService = {
  async create(params: CreateParams): Promise<SubjectSchema> {
    const existing = await repo.findOneBy({
      projectId: params.projectId,
      name: params.name,
      grade: params.grade,
    })
    if (existing) return existing

    const entity: SubjectSchema = {
      id: apId(),
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      projectId: params.projectId,
      name: params.name,
      grade: params.grade,
    }
    await repo.insert(entity)
    return entity
  },

  async listByGrade(params: ListByGradeParams): Promise<SubjectSchema[]> {
    return repo.findBy({ projectId: params.projectId, grade: params.grade })
  },

  async getOneOrThrow(id: string): Promise<SubjectSchema> {
    const s = await repo.findOneByOrFail({ id })
    return s
  },
}

export type CreateParams = { projectId: string; name: string; grade: string }
export type ListByGradeParams = { projectId: string; grade: string }
